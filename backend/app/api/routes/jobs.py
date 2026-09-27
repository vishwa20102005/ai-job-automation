"""Job management routes: CRUD and CSV import."""
import csv
import io
import math
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.job import Job
from app.models.user import User
from app.schemas.job import JobCreateRequest, JobResponse, JobUpdateRequest, PaginatedJobsResponse

router = APIRouter()


def _job_to_response(job: Job) -> JobResponse:
    return JobResponse(
        id=str(job.id),
        title=job.title,
        company=job.company,
        location=job.location,
        description=job.description,
        job_url=job.job_url,
        source=job.source,
        employment_type=job.employment_type,
        required_skills=job.required_skills,
        preferred_skills=job.preferred_skills,
        experience_required=job.experience_required,
        education_required=job.education_required,
        is_saved=job.is_saved,
        created_at=job.created_at.isoformat(),
    )


def _get_owned_job(db: Session, job_id: str, user_id) -> Job:
    try:
        jid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job ID")

    job = db.query(Job).filter(Job.id == jid, Job.user_id == user_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    request: JobCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobResponse:
    """Create a new job listing."""
    posted_at = None
    if request.posted_at:
        try:
            posted_at = datetime.fromisoformat(request.posted_at)
        except ValueError:
            pass

    job = Job(
        user_id=current_user.id,
        title=request.title,
        company=request.company,
        location=request.location,
        description=request.description,
        job_url=request.job_url,
        employment_type=request.employment_type,
        required_skills=request.required_skills,
        preferred_skills=request.preferred_skills,
        experience_required=request.experience_required,
        education_required=request.education_required,
        posted_at=posted_at,
        source="manual",
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return _job_to_response(job)


@router.get("", response_model=PaginatedJobsResponse)
def list_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaginatedJobsResponse:
    """List jobs with search and pagination."""
    query = db.query(Job).filter(Job.user_id == current_user.id)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(Job.title.ilike(search_filter), Job.company.ilike(search_filter))
        )
    if location:
        query = query.filter(Job.location.ilike(f"%{location}%"))

    total = query.count()
    jobs = (
        query.order_by(Job.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return PaginatedJobsResponse(
        items=[_job_to_response(j) for j in jobs],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobResponse:
    """Get a specific job."""
    job = _get_owned_job(db, job_id, current_user.id)
    return _job_to_response(job)


@router.patch("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: str,
    update: JobUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobResponse:
    """Update job fields."""
    job = _get_owned_job(db, job_id, current_user.id)
    for field, value in update.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(job, field, value)
    db.commit()
    db.refresh(job)
    return _job_to_response(job)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Delete a job."""
    job = _get_owned_job(db, job_id, current_user.id)
    db.delete(job)
    db.commit()


@router.post("/import-csv")
async def import_jobs_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Import jobs from a CSV file.
    Required columns: title, description
    Optional: company, location, job_url, employment_type
    """
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    content = await file.read()
    if len(content) > 2 * 1024 * 1024:  # 2MB limit for CSV
        raise HTTPException(status_code=400, detail="CSV file too large (max 2MB)")

    try:
        text = content.decode("utf-8-sig")  # Handle BOM
        reader = csv.DictReader(io.StringIO(text))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid CSV format")

    required_cols = {"title", "description"}
    rows = list(reader)

    if not rows:
        raise HTTPException(status_code=400, detail="CSV file is empty")

    headers = {h.strip().lower() for h in (reader.fieldnames or [])}
    if not required_cols.issubset(headers):
        raise HTTPException(
            status_code=400,
            detail=f"CSV must have columns: {', '.join(required_cols)}. Found: {', '.join(headers)}",
        )

    imported = 0
    skipped = 0

    for row in rows[:200]:  # Max 200 jobs per import
        title = row.get("title", "").strip()
        description = row.get("description", "").strip()

        if not title or not description:
            skipped += 1
            continue

        job = Job(
            user_id=current_user.id,
            title=title,
            company=row.get("company", "").strip() or None,
            location=row.get("location", "").strip() or None,
            description=description,
            job_url=row.get("job_url", "").strip() or None,
            employment_type=row.get("employment_type", "").strip() or None,
            source="csv",
        )
        db.add(job)
        imported += 1

    db.commit()

    return {"imported": imported, "skipped": skipped, "message": f"Imported {imported} jobs"}

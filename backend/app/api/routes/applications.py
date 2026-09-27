"""Application tracking routes - Kanban-style job application management."""
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.application import Application
from app.models.job import Job
from app.models.user import User
from app.schemas.application import (
    APPLICATION_STATUSES,
    ApplicationCreateRequest,
    ApplicationResponse,
    ApplicationUpdateRequest,
)

router = APIRouter()


def _app_to_response(app: Application) -> ApplicationResponse:
    return ApplicationResponse(
        id=str(app.id),
        job_id=str(app.job_id) if app.job_id else None,
        resume_id=str(app.resume_id) if app.resume_id else None,
        job_title=app.job_title,
        company=app.company,
        status=app.status,
        applied_at=app.applied_at.isoformat() if app.applied_at else None,
        interview_date=app.interview_date.isoformat() if app.interview_date else None,
        notes=app.notes,
        recruiter_name=app.recruiter_name,
        recruiter_email=app.recruiter_email,
        application_url=app.application_url,
        created_at=app.created_at.isoformat(),
        updated_at=app.updated_at.isoformat(),
    )


def _get_owned_app(db: Session, app_id: str, user_id) -> Application:
    try:
        aid = uuid.UUID(app_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid application ID")
    app = (
        db.query(Application)
        .filter(Application.id == aid, Application.user_id == user_id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def create_application(
    request: ApplicationCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    """Create a job application record."""
    if request.status not in APPLICATION_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Valid values: {', '.join(APPLICATION_STATUSES)}",
        )

    # Resolve job info
    job_title = request.job_title
    company = request.company
    job_id = None
    resume_id = None

    if request.job_id:
        try:
            jid = uuid.UUID(request.job_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid job ID")
        job = db.query(Job).filter(Job.id == jid, Job.user_id == current_user.id).first()
        if job:
            job_id = job.id
            job_title = job_title or job.title
            company = company or job.company

    if request.resume_id:
        try:
            resume_id = uuid.UUID(request.resume_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid resume ID")

    app = Application(
        user_id=current_user.id,
        job_id=job_id,
        resume_id=resume_id,
        job_title=job_title,
        company=company,
        status=request.status,
        notes=request.notes,
        application_url=request.application_url,
        recruiter_name=request.recruiter_name,
        recruiter_email=request.recruiter_email,
        applied_at=datetime.utcnow() if request.status == "applied" else None,
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return _app_to_response(app)


@router.get("", response_model=List[ApplicationResponse])
def list_applications(
    status_filter: Optional[str] = Query(None, alias="status"),
    company: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[ApplicationResponse]:
    """List all applications for the current user with optional filters."""
    query = db.query(Application).filter(Application.user_id == current_user.id)

    if status_filter:
        query = query.filter(Application.status == status_filter)
    if company:
        query = query.filter(Application.company.ilike(f"%{company}%"))
    if search:
        query = query.filter(
            or_(
                Application.job_title.ilike(f"%{search}%"),
                Application.company.ilike(f"%{search}%"),
            )
        )

    apps = query.order_by(Application.updated_at.desc()).all()
    return [_app_to_response(a) for a in apps]


@router.get("/{app_id}", response_model=ApplicationResponse)
def get_application(
    app_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    """Get a specific application."""
    app = _get_owned_app(db, app_id, current_user.id)
    return _app_to_response(app)


@router.patch("/{app_id}", response_model=ApplicationResponse)
def update_application(
    app_id: str,
    update: ApplicationUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    """Update application status and details."""
    app = _get_owned_app(db, app_id, current_user.id)
    update_data = update.model_dump(exclude_unset=True)

    if "status" in update_data and update_data["status"] not in APPLICATION_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Valid values: {', '.join(APPLICATION_STATUSES)}",
        )

    # Handle datetime parsing
    for dt_field in ["applied_at", "interview_date"]:
        if dt_field in update_data and update_data[dt_field]:
            try:
                update_data[dt_field] = datetime.fromisoformat(update_data[dt_field])
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid date format for {dt_field}. Use ISO 8601.",
                )

    # Auto-set applied_at when transitioning to applied
    if update_data.get("status") == "applied" and not app.applied_at:
        update_data.setdefault("applied_at", datetime.utcnow())

    for field, value in update_data.items():
        setattr(app, field, value)

    db.commit()
    db.refresh(app)
    return _app_to_response(app)


@router.delete("/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(
    app_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Delete an application."""
    app = _get_owned_app(db, app_id, current_user.id)
    db.delete(app)
    db.commit()

"""Resume upload, parsing, and management routes."""
import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.resume import Resume
from app.models.user import User
from app.schemas.resume import ResumeResponse, ResumeUpdateRequest
from app.services.resume_parser import parse_resume
from app.services.storage_service import storage_service

router = APIRouter()

ALLOWED_TYPES = {"application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
ALLOWED_EXTENSIONS = {".pdf", ".docx"}


def _resume_to_response(resume: Resume) -> ResumeResponse:
    return ResumeResponse(
        id=str(resume.id),
        name=resume.name,
        original_filename=resume.original_filename,
        file_size=resume.file_size,
        file_type=resume.file_type,
        full_name=resume.full_name,
        email=resume.email,
        phone=resume.phone,
        professional_summary=resume.professional_summary,
        skills=resume.skills,
        technical_skills=resume.technical_skills,
        programming_languages=resume.programming_languages,
        frameworks=resume.frameworks,
        cloud_platforms=resume.cloud_platforms,
        certifications=resume.certifications,
        education=resume.education,
        projects=resume.projects,
        work_experience=resume.work_experience,
        achievements=resume.achievements,
        is_default=resume.is_default,
        parse_status=resume.parse_status,
        created_at=resume.created_at.isoformat(),
        updated_at=resume.updated_at.isoformat(),
    )


@router.post("/upload", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    name: str = Form(default=""),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResumeResponse:
    """Upload a resume (PDF or DOCX, max 5MB). Immediately parses and returns structured data."""

    # Validate extension
    filename = file.filename or ""
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{ext}'. Only PDF and DOCX files are supported.",
        )

    file_type = "pdf" if ext == ".pdf" else "docx"

    # Read content to check size
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds the maximum allowed size of {settings.MAX_UPLOAD_SIZE // 1024 // 1024}MB",
        )

    # Reset file for storage
    await file.seek(0)

    # Save file to storage
    file_path, _ = await storage_service.save_file(str(current_user.id), file)

    # Create resume record
    resume = Resume(
        user_id=current_user.id,
        name=name.strip() or Path(filename).stem,
        original_filename=filename,
        file_path=file_path,
        file_size=len(content),
        file_type=file_type,
        parse_status="processing",
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    # Parse resume
    try:
        parsed = parse_resume(file_path, file_type)
        resume.raw_text = parsed.get("raw_text")
        resume.full_name = parsed.get("full_name")
        resume.email = parsed.get("email")
        resume.phone = parsed.get("phone")
        resume.professional_summary = parsed.get("professional_summary")
        resume.skills = parsed.get("skills")
        resume.technical_skills = parsed.get("technical_skills")
        resume.programming_languages = parsed.get("programming_languages")
        resume.frameworks = parsed.get("frameworks")
        resume.cloud_platforms = parsed.get("cloud_platforms")
        resume.certifications = parsed.get("certifications")
        resume.education = parsed.get("education")
        resume.projects = parsed.get("projects")
        resume.work_experience = parsed.get("work_experience")
        resume.achievements = parsed.get("achievements")
        resume.parse_status = "done"
    except ValueError as e:
        resume.parse_status = "failed"
        # Still save the record so user knows upload happened
        db.commit()
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        resume.parse_status = "failed"
        db.commit()
        raise HTTPException(status_code=500, detail="Failed to parse resume. Please try again.")

    # Set as default if first resume
    count = db.query(Resume).filter(Resume.user_id == current_user.id).count()
    if count == 1:
        resume.is_default = True

    db.commit()
    db.refresh(resume)

    return _resume_to_response(resume)


@router.get("", response_model=List[ResumeResponse])
def list_resumes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[ResumeResponse]:
    """List all resumes for the current user."""
    resumes = (
        db.query(Resume)
        .filter(Resume.user_id == current_user.id)
        .order_by(Resume.created_at.desc())
        .all()
    )
    return [_resume_to_response(r) for r in resumes]


@router.get("/{resume_id}", response_model=ResumeResponse)
def get_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResumeResponse:
    """Get a specific resume by ID."""
    resume = _get_owned_resume(db, resume_id, current_user.id)
    return _resume_to_response(resume)


@router.patch("/{resume_id}", response_model=ResumeResponse)
def update_resume(
    resume_id: str,
    update: ResumeUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResumeResponse:
    """Update resume fields (user can correct parsed data)."""
    resume = _get_owned_resume(db, resume_id, current_user.id)

    update_data = update.model_dump(exclude_unset=True)

    # Handle is_default separately
    if update_data.pop("is_default", None) is True:
        # Unset all others
        db.query(Resume).filter(Resume.user_id == current_user.id).update({"is_default": False})
        resume.is_default = True

    for field, value in update_data.items():
        if value is not None:
            setattr(resume, field, value)

    db.commit()
    db.refresh(resume)
    return _resume_to_response(resume)


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Delete a resume and its file."""
    resume = _get_owned_resume(db, resume_id, current_user.id)
    storage_service.delete_file(resume.file_path)
    db.delete(resume)
    db.commit()


@router.get("/{resume_id}/download")
def download_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    """Download original resume file."""
    resume = _get_owned_resume(db, resume_id, current_user.id)
    file_path = Path(resume.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Original file not found")

    media_type = (
        "application/pdf"
        if resume.file_type == "pdf"
        else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        filename=resume.original_filename,
    )


def _get_owned_resume(db: Session, resume_id: str, user_id) -> Resume:
    """Helper: fetch resume and enforce ownership."""
    try:
        rid = uuid.UUID(resume_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid resume ID")

    resume = (
        db.query(Resume)
        .filter(Resume.id == rid, Resume.user_id == user_id)
        .first()
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume

"""Cover letter generation, management, and export routes."""
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.document import GeneratedDocument
from app.models.job import Job
from app.models.resume import Resume
from app.models.user import User
from app.schemas.document import CoverLetterRequest, DocumentResponse
from app.services.ai_service import ai_service
from app.services.document_generator import generate_docx, generate_pdf

router = APIRouter()

VALID_TONES = {"formal", "concise", "friendly_professional"}


def _doc_to_response(doc: GeneratedDocument) -> DocumentResponse:
    return DocumentResponse(
        id=str(doc.id),
        doc_type=doc.doc_type,
        title=doc.title,
        content=doc.content,
        tone=doc.tone,
        created_at=doc.created_at.isoformat(),
    )


@router.post("/generate", response_model=DocumentResponse)
def generate_cover_letter(
    request: CoverLetterRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentResponse:
    """Generate a cover letter using AI (or template fallback)."""
    if request.tone not in VALID_TONES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid tone. Choose from: {', '.join(VALID_TONES)}",
        )

    resume, job = _get_resume_and_job(db, request.resume_id, request.job_id, current_user.id)

    resume_data = {
        "full_name": resume.full_name,
        "skills": resume.skills or [],
        "programming_languages": resume.programming_languages or [],
        "work_experience": resume.work_experience or [],
        "projects": resume.projects or [],
        "professional_summary": resume.professional_summary or "",
    }
    job_data = {
        "title": job.title,
        "company": job.company,
        "description": job.description,
    }

    content = ai_service.generate_cover_letter(
        resume_data=resume_data,
        job_data=job_data,
        tone=request.tone,
        additional_details=request.additional_details,
    )

    doc = GeneratedDocument(
        user_id=current_user.id,
        resume_id=resume.id,
        job_id=job.id,
        doc_type="cover_letter",
        title=f"Cover Letter - {job.title} at {job.company or 'Company'}",
        content=content,
        tone=request.tone,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    return _doc_to_response(doc)


@router.get("", response_model=List[DocumentResponse])
def list_cover_letters(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[DocumentResponse]:
    """List all generated cover letters for the current user."""
    docs = (
        db.query(GeneratedDocument)
        .filter(
            GeneratedDocument.user_id == current_user.id,
            GeneratedDocument.doc_type == "cover_letter",
        )
        .order_by(GeneratedDocument.created_at.desc())
        .all()
    )
    return [_doc_to_response(d) for d in docs]


@router.get("/{doc_id}", response_model=DocumentResponse)
def get_cover_letter(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentResponse:
    """Get a specific cover letter."""
    doc = _get_owned_doc(db, doc_id, current_user.id)
    return _doc_to_response(doc)


@router.patch("/{doc_id}", response_model=DocumentResponse)
def update_cover_letter(
    doc_id: str,
    content: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentResponse:
    """Update cover letter content (user edits)."""
    doc = _get_owned_doc(db, doc_id, current_user.id)
    doc.content = content
    db.commit()
    db.refresh(doc)
    return _doc_to_response(doc)


@router.get("/{doc_id}/export")
def export_cover_letter(
    doc_id: str,
    format: str = Query("pdf", pattern="^(pdf|docx)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """Export cover letter as PDF or DOCX."""
    doc = _get_owned_doc(db, doc_id, current_user.id)

    title = doc.title or "Cover Letter"

    if format == "pdf":
        file_bytes = generate_pdf(doc.content, title)
        media_type = "application/pdf"
        filename = f"cover_letter_{doc_id[:8]}.pdf"
    else:
        file_bytes = generate_docx(doc.content, title)
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        filename = f"cover_letter_{doc_id[:8]}.docx"

    return Response(
        content=file_bytes,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/{doc_id}")
def delete_cover_letter(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Delete a generated document."""
    doc = _get_owned_doc(db, doc_id, current_user.id)
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted"}


def _get_owned_doc(db: Session, doc_id: str, user_id) -> GeneratedDocument:
    try:
        did = uuid.UUID(doc_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID")

    doc = (
        db.query(GeneratedDocument)
        .filter(GeneratedDocument.id == did, GeneratedDocument.user_id == user_id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


def _get_resume_and_job(db: Session, resume_id: str, job_id: str, user_id):
    try:
        rid = uuid.UUID(resume_id)
        jid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    resume = db.query(Resume).filter(Resume.id == rid, Resume.user_id == user_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    job = db.query(Job).filter(Job.id == jid, Job.user_id == user_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return resume, job

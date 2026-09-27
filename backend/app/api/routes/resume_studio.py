"""Resume Studio routes - AI-powered resume improvement suggestions."""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.job import Job
from app.models.match import JobMatch
from app.models.resume import Resume
from app.models.user import User
from app.schemas.document import ResumeRewriteRequest, ResumeStudioRequest, SuggestionsResponse
from app.services.ai_service import ai_service

router = APIRouter()


@router.post("/suggestions", response_model=SuggestionsResponse)
def get_suggestions(
    request: ResumeStudioRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SuggestionsResponse:
    """Generate AI suggestions for improving a resume against a specific job."""
    resume, job = _get_resume_and_job(db, request.resume_id, request.job_id, current_user.id)

    # Get the latest match if available
    try:
        rid = uuid.UUID(request.resume_id)
        jid = uuid.UUID(request.job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID")

    latest_match = (
        db.query(JobMatch)
        .filter(
            JobMatch.resume_id == rid,
            JobMatch.job_id == jid,
            JobMatch.user_id == current_user.id,
        )
        .order_by(JobMatch.created_at.desc())
        .first()
    )

    match_data = {}
    if latest_match:
        match_data = {
            "missing_required_skills": latest_match.missing_required_skills or [],
            "overall_score": latest_match.overall_score,
        }

    resume_data = _resume_to_dict(resume)
    job_data = {"title": job.title, "description": job.description, "company": job.company}

    result = ai_service.generate_resume_suggestions(resume_data, job_data, match_data)

    # Validate and cast suggestions
    suggestions = []
    for s in result.get("suggestions", []):
        if isinstance(s, dict):
            suggestions.append(
                {
                    "section": s.get("section", ""),
                    "original": s.get("original", ""),
                    "suggestion": s.get("suggestion", ""),
                    "reason": s.get("reason", ""),
                }
            )

    return SuggestionsResponse(
        suggestions=suggestions,
        missing_keywords=result.get("missing_keywords", []),
        summary_suggestion=result.get("summary_suggestion"),
        note=result.get("note"),
    )


@router.post("/rewrite")
def rewrite_section(
    request: ResumeRewriteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Rewrite a specific resume section using AI."""
    resume, job = _get_resume_and_job(db, request.resume_id, request.job_id, current_user.id)

    if not ai_service.is_configured():
        return {
            "original": request.original_text,
            "rewritten": request.original_text,
            "explanation": "Configure Azure OpenAI credentials to enable AI-powered rewriting.",
        }

    system_prompt = (
        "You are an expert resume writer. Improve the given resume section.\n"
        "Rules:\n"
        "- Do NOT add false experience, skills, or achievements\n"
        "- Improve clarity, use strong action verbs, quantify where possible\n"
        "- Keep the same factual content\n"
        "- Output only the rewritten text and a brief explanation"
    )
    user_prompt = (
        f"Improve this resume {request.section} for a {job.title} position:\n\n"
        f"ORIGINAL:\n{request.original_text}\n\n"
        f"Job context: {job.description[:400]}\n\n"
        "Output JSON: {\"rewritten\": \"...\", \"explanation\": \"why this is better\"}"
    )

    import json
    import re

    result = ai_service._call_llm(system_prompt, user_prompt, temperature=0.3)
    if result:
        try:
            m = re.search(r"\{.*\}", result, re.DOTALL)
            if m:
                data = json.loads(m.group())
                return {
                    "original": request.original_text,
                    "rewritten": data.get("rewritten", request.original_text),
                    "explanation": data.get("explanation", ""),
                }
        except Exception:
            pass

    return {
        "original": request.original_text,
        "rewritten": request.original_text,
        "explanation": "Could not generate rewrite. Please try again.",
    }


def _resume_to_dict(resume: Resume) -> dict:
    return {
        "raw_text": resume.raw_text or "",
        "full_name": resume.full_name,
        "skills": resume.skills or [],
        "technical_skills": resume.technical_skills or [],
        "programming_languages": resume.programming_languages or [],
        "frameworks": resume.frameworks or [],
        "cloud_platforms": resume.cloud_platforms or [],
        "projects": resume.projects or [],
        "work_experience": resume.work_experience or [],
        "professional_summary": resume.professional_summary or "",
        "education": resume.education or [],
        "certifications": resume.certifications or [],
        "achievements": resume.achievements or [],
    }


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

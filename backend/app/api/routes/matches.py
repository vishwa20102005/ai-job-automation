"""Job matching routes."""
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.match import JobMatch
from app.models.resume import Resume
from app.models.job import Job
from app.models.user import User
from app.schemas.match import MatchRequest, MatchResponse
from app.services.matching_engine import compute_match_score

router = APIRouter()


def _match_to_response(match: JobMatch) -> MatchResponse:
    return MatchResponse(
        id=str(match.id),
        resume_id=str(match.resume_id),
        job_id=str(match.job_id),
        overall_score=match.overall_score,
        required_skills_score=match.required_skills_score,
        semantic_score=match.semantic_score,
        projects_score=match.projects_score,
        preferred_skills_score=match.preferred_skills_score,
        matched_required_skills=match.matched_required_skills,
        missing_required_skills=match.missing_required_skills,
        matched_preferred_skills=match.matched_preferred_skills,
        score_explanation=match.score_explanation,
        improvement_suggestions=match.improvement_suggestions,
        scoring_version=match.scoring_version,
        created_at=match.created_at.isoformat(),
    )


@router.post("", response_model=MatchResponse, status_code=status.HTTP_201_CREATED)
def create_match(
    request: MatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MatchResponse:
    """Run the hybrid matching algorithm between a resume and job."""
    # Verify ownership of resume
    try:
        rid = uuid.UUID(request.resume_id)
        jid = uuid.UUID(request.job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    resume = db.query(Resume).filter(Resume.id == rid, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    job = db.query(Job).filter(Job.id == jid, Job.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if resume.parse_status != "done":
        raise HTTPException(
            status_code=400,
            detail="Resume has not been successfully parsed yet. Please wait or re-upload.",
        )

    # Build resume data dict
    resume_data = {
        "raw_text": resume.raw_text or "",
        "skills": resume.skills or [],
        "technical_skills": resume.technical_skills or [],
        "programming_languages": resume.programming_languages or [],
        "frameworks": resume.frameworks or [],
        "cloud_platforms": resume.cloud_platforms or [],
        "projects": resume.projects or [],
        "work_experience": resume.work_experience or [],
        "professional_summary": resume.professional_summary or "",
    }

    job_data = {
        "title": job.title,
        "description": job.description,
        "required_skills": job.required_skills or [],
        "preferred_skills": job.preferred_skills or [],
    }

    # Run matching
    result = compute_match_score(resume_data, job_data)

    # Persist match
    match = JobMatch(
        user_id=current_user.id,
        resume_id=resume.id,
        job_id=job.id,
        overall_score=result["overall_score"],
        required_skills_score=result.get("required_skills_score"),
        semantic_score=result.get("semantic_score"),
        projects_score=result.get("projects_score"),
        preferred_skills_score=result.get("preferred_skills_score"),
        matched_required_skills=result.get("matched_required_skills"),
        missing_required_skills=result.get("missing_required_skills"),
        matched_preferred_skills=result.get("matched_preferred_skills"),
        score_explanation=result.get("score_explanation"),
        improvement_suggestions=result.get("improvement_suggestions"),
        scoring_version=result.get("scoring_version", "v1.0"),
    )
    db.add(match)
    db.commit()
    db.refresh(match)

    return _match_to_response(match)


@router.get("", response_model=List[MatchResponse])
def list_matches(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[MatchResponse]:
    """List all match results for the current user."""
    matches = (
        db.query(JobMatch)
        .filter(JobMatch.user_id == current_user.id)
        .order_by(JobMatch.created_at.desc())
        .all()
    )
    return [_match_to_response(m) for m in matches]


@router.get("/{match_id}", response_model=MatchResponse)
def get_match(
    match_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MatchResponse:
    """Get a specific match result."""
    try:
        mid = uuid.UUID(match_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid match ID")

    match = (
        db.query(JobMatch)
        .filter(JobMatch.id == mid, JobMatch.user_id == current_user.id)
        .first()
    )
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return _match_to_response(match)

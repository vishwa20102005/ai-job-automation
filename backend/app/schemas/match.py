from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class MatchRequest(BaseModel):
    resume_id: str
    job_id: str


class MatchResponse(BaseModel):
    id: str
    resume_id: str
    job_id: str
    overall_score: float
    required_skills_score: Optional[float] = None
    semantic_score: Optional[float] = None
    projects_score: Optional[float] = None
    preferred_skills_score: Optional[float] = None
    matched_required_skills: Optional[List[str]] = None
    missing_required_skills: Optional[List[str]] = None
    matched_preferred_skills: Optional[List[str]] = None
    score_explanation: Optional[Dict[str, Any]] = None
    improvement_suggestions: Optional[List[str]] = None
    scoring_version: str
    created_at: str

    model_config = {"from_attributes": True}

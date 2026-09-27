from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class CoverLetterRequest(BaseModel):
    resume_id: str
    job_id: str
    tone: str = "formal"  # formal, concise, friendly_professional
    additional_details: Optional[str] = None


class ResumeStudioRequest(BaseModel):
    resume_id: str
    job_id: str


class ResumeRewriteRequest(BaseModel):
    resume_id: str
    job_id: str
    section: str  # bullet_point, summary, skills
    original_text: str


class DocumentResponse(BaseModel):
    id: str
    doc_type: str
    title: Optional[str] = None
    content: str
    tone: Optional[str] = None
    created_at: str

    model_config = {"from_attributes": True}


class ResumeSuggestionItem(BaseModel):
    section: str
    original: str
    suggestion: str
    reason: str


class SuggestionsResponse(BaseModel):
    suggestions: List[ResumeSuggestionItem]
    missing_keywords: List[str]
    summary_suggestion: Optional[str] = None
    note: Optional[str] = None

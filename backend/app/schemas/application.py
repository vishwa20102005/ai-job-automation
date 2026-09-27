from typing import Optional

from pydantic import BaseModel

APPLICATION_STATUSES = [
    "saved",
    "applied",
    "assessment",
    "interview",
    "offer",
    "selected",
    "rejected",
    "withdrawn",
]


class ApplicationCreateRequest(BaseModel):
    job_id: Optional[str] = None
    resume_id: Optional[str] = None
    job_title: Optional[str] = None
    company: Optional[str] = None
    status: str = "saved"
    notes: Optional[str] = None
    application_url: Optional[str] = None
    recruiter_name: Optional[str] = None
    recruiter_email: Optional[str] = None


class ApplicationUpdateRequest(BaseModel):
    status: Optional[str] = None
    applied_at: Optional[str] = None
    interview_date: Optional[str] = None
    notes: Optional[str] = None
    recruiter_name: Optional[str] = None
    recruiter_email: Optional[str] = None
    application_url: Optional[str] = None
    job_title: Optional[str] = None
    company: Optional[str] = None


class ApplicationResponse(BaseModel):
    id: str
    job_id: Optional[str] = None
    resume_id: Optional[str] = None
    job_title: Optional[str] = None
    company: Optional[str] = None
    status: str
    applied_at: Optional[str] = None
    interview_date: Optional[str] = None
    notes: Optional[str] = None
    recruiter_name: Optional[str] = None
    recruiter_email: Optional[str] = None
    application_url: Optional[str] = None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}

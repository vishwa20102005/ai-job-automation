from typing import List, Optional

from pydantic import BaseModel


class JobCreateRequest(BaseModel):
    title: str
    company: Optional[str] = None
    location: Optional[str] = None
    description: str
    job_url: Optional[str] = None
    employment_type: Optional[str] = None
    required_skills: Optional[List[str]] = None
    preferred_skills: Optional[List[str]] = None
    experience_required: Optional[str] = None
    education_required: Optional[str] = None
    posted_at: Optional[str] = None


class JobUpdateRequest(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    job_url: Optional[str] = None
    employment_type: Optional[str] = None
    required_skills: Optional[List[str]] = None
    preferred_skills: Optional[List[str]] = None
    experience_required: Optional[str] = None
    education_required: Optional[str] = None


class JobResponse(BaseModel):
    id: str
    title: str
    company: Optional[str] = None
    location: Optional[str] = None
    description: str
    job_url: Optional[str] = None
    source: str
    employment_type: Optional[str] = None
    required_skills: Optional[List[str]] = None
    preferred_skills: Optional[List[str]] = None
    experience_required: Optional[str] = None
    education_required: Optional[str] = None
    is_saved: bool
    created_at: str

    model_config = {"from_attributes": True}


class PaginatedJobsResponse(BaseModel):
    items: List[JobResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

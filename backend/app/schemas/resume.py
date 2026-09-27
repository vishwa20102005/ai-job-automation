from typing import Any, List, Optional

from pydantic import BaseModel


class ResumeResponse(BaseModel):
    id: str
    name: str
    original_filename: str
    file_size: int
    file_type: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    professional_summary: Optional[str] = None
    skills: Optional[List[str]] = None
    technical_skills: Optional[List[str]] = None
    programming_languages: Optional[List[str]] = None
    frameworks: Optional[List[str]] = None
    cloud_platforms: Optional[List[str]] = None
    certifications: Optional[List[Any]] = None
    education: Optional[List[Any]] = None
    projects: Optional[List[Any]] = None
    work_experience: Optional[List[Any]] = None
    achievements: Optional[List[str]] = None
    is_default: bool
    parse_status: str
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class ResumeUpdateRequest(BaseModel):
    name: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    professional_summary: Optional[str] = None
    skills: Optional[List[str]] = None
    technical_skills: Optional[List[str]] = None
    programming_languages: Optional[List[str]] = None
    frameworks: Optional[List[str]] = None
    cloud_platforms: Optional[List[str]] = None
    certifications: Optional[List[Any]] = None
    education: Optional[List[Any]] = None
    projects: Optional[List[Any]] = None
    work_experience: Optional[List[Any]] = None
    achievements: Optional[List[str]] = None
    is_default: Optional[bool] = None

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title = Column(String(500), nullable=False)
    company = Column(String(500), nullable=True)
    location = Column(String(500), nullable=True)
    description = Column(Text, nullable=False)
    job_url = Column(String(2000), nullable=True)
    source = Column(String(100), default="manual")  # manual, csv, api
    employment_type = Column(String(100), nullable=True)
    required_skills = Column(JSON, nullable=True)
    preferred_skills = Column(JSON, nullable=True)
    experience_required = Column(String(200), nullable=True)
    education_required = Column(String(200), nullable=True)
    is_saved = Column(Boolean, default=True)
    posted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="jobs")
    matches = relationship("JobMatch", back_populates="job")
    applications = relationship("Application", back_populates="job")

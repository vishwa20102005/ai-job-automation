import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, JSON, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class JobMatch(Base):
    __tablename__ = "job_matches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    resume_id = Column(
        UUID(as_uuid=True), ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False
    )
    job_id = Column(
        UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False
    )

    overall_score = Column(Float, nullable=False)
    required_skills_score = Column(Float, nullable=True)
    semantic_score = Column(Float, nullable=True)
    projects_score = Column(Float, nullable=True)
    preferred_skills_score = Column(Float, nullable=True)

    matched_required_skills = Column(JSON, nullable=True)
    missing_required_skills = Column(JSON, nullable=True)
    matched_preferred_skills = Column(JSON, nullable=True)

    score_explanation = Column(JSON, nullable=True)
    improvement_suggestions = Column(JSON, nullable=True)
    scoring_version = Column(String(50), default="v1.0")

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="matches")
    resume = relationship("Resume", back_populates="matches")
    job = relationship("Job", back_populates="matches")

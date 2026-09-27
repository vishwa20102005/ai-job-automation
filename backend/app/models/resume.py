import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name = Column(String(255), nullable=False)
    original_filename = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    file_size = Column(Integer, nullable=False)
    file_type = Column(String(10), nullable=False)

    # Parsed data
    raw_text = Column(Text, nullable=True)
    parsed_data = Column(JSON, nullable=True)
    full_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    professional_summary = Column(Text, nullable=True)
    skills = Column(JSON, nullable=True)
    technical_skills = Column(JSON, nullable=True)
    programming_languages = Column(JSON, nullable=True)
    frameworks = Column(JSON, nullable=True)
    cloud_platforms = Column(JSON, nullable=True)
    certifications = Column(JSON, nullable=True)
    education = Column(JSON, nullable=True)
    projects = Column(JSON, nullable=True)
    work_experience = Column(JSON, nullable=True)
    achievements = Column(JSON, nullable=True)

    is_default = Column(Boolean, default=False)
    parse_status = Column(String(50), default="pending")  # pending, processing, done, failed

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="resumes")
    matches = relationship("JobMatch", back_populates="resume")
    applications = relationship("Application", back_populates="resume")

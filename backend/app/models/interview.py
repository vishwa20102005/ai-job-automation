import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    resume_id = Column(
        UUID(as_uuid=True), ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True
    )
    job_id = Column(
        UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True
    )

    target_role = Column(String(500), nullable=False)
    difficulty = Column(String(50), default="medium")  # easy, medium, hard
    status = Column(String(50), default="active")  # active, completed
    current_question_index = Column(Integer, default=0)
    total_questions = Column(Integer, default=10)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="interview_sessions")
    questions = relationship(
        "InterviewQuestion", back_populates="session", cascade="all, delete-orphan",
        order_by="InterviewQuestion.question_index"
    )


class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("interview_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    question_text = Column(Text, nullable=False)
    question_type = Column(String(100), nullable=False)  # technical, hr, behavioral, resume_based, project
    question_index = Column(Integer, nullable=False)

    user_answer = Column(Text, nullable=True)
    feedback = Column(JSON, nullable=True)
    is_answered = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("InterviewSession", back_populates="questions")

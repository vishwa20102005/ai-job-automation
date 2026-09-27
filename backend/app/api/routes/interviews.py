"""Interview coach routes - question generation and answer evaluation."""
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.interview import InterviewQuestion, InterviewSession
from app.models.job import Job
from app.models.resume import Resume
from app.models.user import User
from app.schemas.interview import (
    AnswerSubmitRequest,
    InterviewDetailResponse,
    InterviewSessionCreateRequest,
    InterviewSessionResponse,
    QuestionResponse,
)
from app.services.ai_service import ai_service

router = APIRouter()

VALID_DIFFICULTIES = {"easy", "medium", "hard"}


def _session_to_response(session: InterviewSession) -> InterviewSessionResponse:
    return InterviewSessionResponse(
        id=str(session.id),
        target_role=session.target_role,
        difficulty=session.difficulty,
        status=session.status,
        current_question_index=session.current_question_index,
        total_questions=session.total_questions,
        created_at=session.created_at.isoformat(),
    )


def _question_to_response(q: InterviewQuestion) -> QuestionResponse:
    return QuestionResponse(
        id=str(q.id),
        question_text=q.question_text,
        question_type=q.question_type,
        question_index=q.question_index,
        user_answer=q.user_answer,
        feedback=q.feedback,
        is_answered=q.is_answered,
    )


@router.post("", response_model=InterviewDetailResponse, status_code=status.HTTP_201_CREATED)
def create_interview_session(
    request: InterviewSessionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InterviewDetailResponse:
    """Start a new interview coaching session with AI-generated questions."""
    if request.difficulty not in VALID_DIFFICULTIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid difficulty. Choose from: {', '.join(VALID_DIFFICULTIES)}",
        )

    num_questions = min(max(request.num_questions, 3), 20)

    # Fetch optional resume and job
    resume_data = None
    job_description = None
    resume_id = None
    job_id = None

    if request.resume_id:
        try:
            rid = uuid.UUID(request.resume_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid resume ID")
        resume = (
            db.query(Resume)
            .filter(Resume.id == rid, Resume.user_id == current_user.id)
            .first()
        )
        if resume:
            resume_id = resume.id
            resume_data = {
                "skills": resume.skills or [],
                "programming_languages": resume.programming_languages or [],
                "frameworks": resume.frameworks or [],
            }

    if request.job_id:
        try:
            jid = uuid.UUID(request.job_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid job ID")
        job = (
            db.query(Job)
            .filter(Job.id == jid, Job.user_id == current_user.id)
            .first()
        )
        if job:
            job_id = job.id
            job_description = job.description

    # Generate questions
    questions_data = ai_service.generate_interview_questions(
        target_role=request.target_role,
        resume_data=resume_data,
        job_description=job_description,
        difficulty=request.difficulty,
        num_questions=num_questions,
    )

    # Create session
    session = InterviewSession(
        user_id=current_user.id,
        resume_id=resume_id,
        job_id=job_id,
        target_role=request.target_role,
        difficulty=request.difficulty,
        total_questions=len(questions_data),
        current_question_index=0,
    )
    db.add(session)
    db.flush()  # Get session.id before adding questions

    # Create question records
    questions = []
    for i, q_data in enumerate(questions_data):
        q = InterviewQuestion(
            session_id=session.id,
            question_text=q_data.get("question", ""),
            question_type=q_data.get("type", "general"),
            question_index=i,
        )
        db.add(q)
        questions.append(q)

    db.commit()
    db.refresh(session)
    for q in questions:
        db.refresh(q)

    return InterviewDetailResponse(
        session=_session_to_response(session),
        questions=[_question_to_response(q) for q in questions],
    )


@router.post("/{session_id}/answer")
def submit_answer(
    session_id: str,
    request: AnswerSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Submit an answer to an interview question and receive AI feedback."""
    session = _get_owned_session(db, session_id, current_user.id)

    if session.status == "completed":
        raise HTTPException(status_code=400, detail="This interview session is already completed")

    # Find the question
    try:
        qid = uuid.UUID(request.question_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid question ID")

    question = (
        db.query(InterviewQuestion)
        .filter(
            InterviewQuestion.id == qid,
            InterviewQuestion.session_id == session.id,
        )
        .first()
    )
    if not question:
        raise HTTPException(status_code=404, detail="Question not found in this session")

    # Evaluate answer
    feedback = ai_service.evaluate_answer(
        question=question.question_text,
        question_type=question.question_type,
        answer=request.answer,
        target_role=session.target_role,
    )

    # Save answer and feedback
    question.user_answer = request.answer
    question.feedback = feedback
    question.is_answered = True

    # Advance session
    answered_count = (
        db.query(InterviewQuestion)
        .filter(
            InterviewQuestion.session_id == session.id,
            InterviewQuestion.is_answered.is_(True),
        )
        .count()
    )
    # +1 for current answer
    session.current_question_index = min(answered_count, session.total_questions - 1)

    # Check if completed
    if answered_count >= session.total_questions - 1:
        session.status = "completed"

    db.commit()
    db.refresh(question)

    return {"question": _question_to_response(question)}


@router.get("/{session_id}", response_model=InterviewDetailResponse)
def get_interview_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InterviewDetailResponse:
    """Get a complete interview session with all questions and answers."""
    session = _get_owned_session(db, session_id, current_user.id)
    questions = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.session_id == session.id)
        .order_by(InterviewQuestion.question_index)
        .all()
    )
    return InterviewDetailResponse(
        session=_session_to_response(session),
        questions=[_question_to_response(q) for q in questions],
    )


@router.get("", response_model=List[InterviewSessionResponse])
def list_interview_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[InterviewSessionResponse]:
    """List all interview sessions for the current user."""
    sessions = (
        db.query(InterviewSession)
        .filter(InterviewSession.user_id == current_user.id)
        .order_by(InterviewSession.created_at.desc())
        .all()
    )
    return [_session_to_response(s) for s in sessions]


def _get_owned_session(db: Session, session_id: str, user_id) -> InterviewSession:
    try:
        sid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID")
    session = (
        db.query(InterviewSession)
        .filter(InterviewSession.id == sid, InterviewSession.user_id == user_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
    return session

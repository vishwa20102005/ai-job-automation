from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class InterviewSessionCreateRequest(BaseModel):
    target_role: str
    resume_id: Optional[str] = None
    job_id: Optional[str] = None
    difficulty: str = "medium"  # easy, medium, hard
    num_questions: int = 10


class AnswerSubmitRequest(BaseModel):
    question_id: str
    answer: str


class QuestionResponse(BaseModel):
    id: str
    question_text: str
    question_type: str
    question_index: int
    user_answer: Optional[str] = None
    feedback: Optional[Dict[str, Any]] = None
    is_answered: bool

    model_config = {"from_attributes": True}


class InterviewSessionResponse(BaseModel):
    id: str
    target_role: str
    difficulty: str
    status: str
    current_question_index: int
    total_questions: int
    created_at: str

    model_config = {"from_attributes": True}


class InterviewDetailResponse(BaseModel):
    session: InterviewSessionResponse
    questions: List[QuestionResponse]

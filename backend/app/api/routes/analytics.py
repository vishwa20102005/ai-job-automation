"""Analytics routes - real SQL aggregations from the database."""
from collections import Counter
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.application import Application
from app.models.interview import InterviewSession
from app.models.job import Job
from app.models.match import JobMatch
from app.models.resume import Resume
from app.models.user import User

router = APIRouter()


@router.get("/overview")
def get_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Get analytics overview for the current user.
    All data comes from actual database records.
    """
    uid = current_user.id

    # Application counts by status
    status_counts_raw = (
        db.query(Application.status, func.count(Application.id))
        .filter(Application.user_id == uid)
        .group_by(Application.status)
        .all()
    )
    status_counts = {s: c for s, c in status_counts_raw}

    # Resume count
    total_resumes = db.query(func.count(Resume.id)).filter(Resume.user_id == uid).scalar() or 0

    # Match count
    total_matches = (
        db.query(func.count(JobMatch.id)).filter(JobMatch.user_id == uid).scalar() or 0
    )

    # Upcoming interviews (future interview_date)
    upcoming = (
        db.query(Application)
        .filter(
            Application.user_id == uid,
            Application.interview_date >= datetime.utcnow(),
            Application.status == "interview",
        )
        .order_by(Application.interview_date)
        .limit(5)
        .all()
    )

    upcoming_list = [
        {
            "id": str(a.id),
            "job_title": a.job_title,
            "company": a.company,
            "interview_date": a.interview_date.isoformat() if a.interview_date else None,
            "status": a.status,
        }
        for a in upcoming
    ]

    # Top missing skills from matches
    all_matches = db.query(JobMatch).filter(JobMatch.user_id == uid).all()
    skill_counter: Counter = Counter()
    for m in all_matches:
        for skill in m.missing_required_skills or []:
            skill_counter[skill] += 1
    top_missing = [{"skill": s, "count": c} for s, c in skill_counter.most_common(10)]

    # Applications by status for chart
    all_statuses = [
        "saved", "applied", "assessment", "interview", "offer",
        "selected", "rejected", "withdrawn",
    ]
    applications_by_status = [
        {"status": s, "count": status_counts.get(s, 0)} for s in all_statuses
    ]

    return {
        "total_saved": status_counts.get("saved", 0),
        "total_applied": status_counts.get("applied", 0),
        "total_interviews": status_counts.get("interview", 0),
        "total_offers": status_counts.get("offer", 0),
        "total_selected": status_counts.get("selected", 0),
        "total_rejected": status_counts.get("rejected", 0),
        "total_resumes": total_resumes,
        "total_matches": total_matches,
        "top_missing_skills": top_missing,
        "applications_by_status": applications_by_status,
        "upcoming_interviews": upcoming_list,
    }


@router.get("/applications")
def get_applications_over_time(
    days: int = Query(30, ge=7, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[dict]:
    """
    Get application creation counts per day for the last N days.
    Returns a list of {date, count} objects.
    """
    uid = current_user.id
    since = datetime.utcnow() - timedelta(days=days)

    apps = (
        db.query(Application)
        .filter(Application.user_id == uid, Application.created_at >= since)
        .order_by(Application.created_at)
        .all()
    )

    # Group by date
    date_counter: Counter = Counter()
    for app in apps:
        date_key = app.created_at.strftime("%Y-%m-%d")
        date_counter[date_key] += 1

    # Fill in all dates in range
    result = []
    current = since.date()
    end = datetime.utcnow().date()
    while current <= end:
        date_str = current.strftime("%Y-%m-%d")
        result.append({"date": date_str, "count": date_counter.get(date_str, 0)})
        current += timedelta(days=1)

    return result


@router.get("/skills")
def get_skills_analysis(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[dict]:
    """Get top missing skills from all match analyses."""
    uid = current_user.id
    matches = db.query(JobMatch).filter(JobMatch.user_id == uid).all()

    counter: Counter = Counter()
    for m in matches:
        for skill in m.missing_required_skills or []:
            counter[skill] += 1

    return [{"skill": s, "count": c} for s, c in counter.most_common(20)]

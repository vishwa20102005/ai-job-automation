"""
Seed script for CareerPilot AI.
Creates an initial demo user and populated sample jobs, resume, and application tracking data.
"""
import uuid
from datetime import datetime, timedelta
from app.core.database import SessionLocal, Base, engine
from app.core.security import hash_password
from app.models.user import User
from app.models.job import Job
from app.models.resume import Resume
from app.models.application import Application
from app.models.match import JobMatch
from app.services.matching_engine import compute_match_score

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if demo user already exists
        demo_email = "demo@careerpilot.ai"
        user = db.query(User).filter(User.email == demo_email).first()

        if not user:
            print("Creating demo user...")
            user = User(
                full_name="Alex Sharma",
                email=demo_email,
                password_hash=hash_password("DemoPassword123!"),
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # Create demo resume
        existing_resume = db.query(Resume).filter(Resume.user_id == user.id).first()
        if not existing_resume:
            print("Creating sample parsed resume...")
            resume = Resume(
                user_id=user.id,
                name="Software & AI Engineer Resume",
                original_filename="Alex_Sharma_Software_Engineer_Resume.pdf",
                file_path="uploads/demo_resume.pdf",
                file_size=142500,
                file_type="pdf",
                full_name="Alex Sharma",
                email="alex.sharma@example.com",
                phone="+91 98765 43210",
                professional_summary="Final-year Electronics & Communication Engineering student with a strong passion for Python, AI/ML, and scalable backend development. Experienced in building REST APIs with FastAPI, training machine learning models with PyTorch/scikit-learn, and containerizing microservices with Docker.",
                skills=["python", "fastapi", "docker", "postgresql", "machine learning", "pytorch", "react", "typescript", "git", "rest api"],
                technical_skills=["machine learning", "docker", "rest api", "git", "postgresql"],
                programming_languages=["python", "javascript", "typescript", "sql", "c++"],
                frameworks=["fastapi", "react", "pytorch", "scikit-learn", "node.js"],
                cloud_platforms=["aws", "docker"],
                education=[{"degree": "B.Tech in Electronics and Communication Engineering", "institution": "National Institute of Technology", "year": "2021 - 2025"}],
                projects=[{"raw": "CareerPilot AI: Built end-to-end intelligent career automation platform with FastAPI, Gemini 3.8 Flash, sentence similarity matching, and full application Kanban board."}],
                work_experience=[{"raw": "Software Engineering Intern at CloudTech Labs (Summer 2024): Developed high-throughput REST APIs and containerized microservices using Docker and PostgreSQL."}],
                is_default=True,
                parse_status="done",
            )
            db.add(resume)
            db.commit()
            db.refresh(resume)
            existing_resume = resume

        # Create sample job listings
        jobs_data = [
            {
                "title": "Python Developer - Fresher / Early Career",
                "company": "Infosys Innovation Labs",
                "location": "Bangalore, India",
                "description": "Looking for energetic Python Developers to build robust cloud-native services and data pipelines. Key requirements include proficiency in Python 3, familiarity with FastAPI or Django, understanding of relational databases (PostgreSQL), and Docker containerization.",
                "required_skills": ["python", "fastapi", "postgresql", "docker", "git"],
                "preferred_skills": ["aws", "redis"],
                "employment_type": "Full-time",
            },
            {
                "title": "Junior AI / ML Engineer",
                "company": "Cognizant AI Solutions",
                "location": "Hyderabad / Remote",
                "description": "Join our Applied AI team! We are looking for early-career AI/ML engineers with strong foundations in Python, PyTorch or TensorFlow, scikit-learn, and experience deploying models into RESTful APIs. Knowledge of prompt engineering and LLM integrations is a strong plus.",
                "required_skills": ["python", "machine learning", "pytorch", "scikit-learn", "rest api"],
                "preferred_skills": ["docker", "nlp", "llm"],
                "employment_type": "Full-time",
            },
            {
                "title": "Cloud Software Engineer (Associate)",
                "company": "Wipro Cloud Practice",
                "location": "Pune, India",
                "description": "Seeking motivated associate cloud engineers with experience in Python, AWS or Azure infrastructure, microservices architecture, and CI/CD pipelines.",
                "required_skills": ["python", "aws", "docker", "git"],
                "preferred_skills": ["kubernetes", "terraform"],
                "employment_type": "Full-time",
            },
        ]

        created_jobs = []
        for jd in jobs_data:
            job = db.query(Job).filter(Job.user_id == user.id, Job.title == jd["title"]).first()
            if not job:
                job = Job(
                    user_id=user.id,
                    title=jd["title"],
                    company=jd["company"],
                    location=jd["location"],
                    description=jd["description"],
                    required_skills=jd["required_skills"],
                    preferred_skills=jd["preferred_skills"],
                    employment_type=jd["employment_type"],
                    source="manual",
                )
                db.add(job)
                db.commit()
                db.refresh(job)
            created_jobs.append(job)

        # Seed sample job match
        if existing_resume and created_jobs:
            first_job = created_jobs[0]
            existing_match = db.query(JobMatch).filter(JobMatch.user_id == user.id, JobMatch.job_id == first_job.id).first()
            if not existing_match:
                match_result = compute_match_score(
                    {
                        "skills": existing_resume.skills,
                        "raw_text": existing_resume.professional_summary,
                        "projects": existing_resume.projects,
                        "work_experience": existing_resume.work_experience,
                    },
                    {
                        "title": first_job.title,
                        "description": first_job.description,
                        "required_skills": first_job.required_skills,
                        "preferred_skills": first_job.preferred_skills,
                    }
                )
                job_match = JobMatch(
                    user_id=user.id,
                    resume_id=existing_resume.id,
                    job_id=first_job.id,
                    overall_score=match_result["overall_score"],
                    required_skills_score=match_result.get("required_skills_score"),
                    semantic_score=match_result.get("semantic_score"),
                    projects_score=match_result.get("projects_score"),
                    preferred_skills_score=match_result.get("preferred_skills_score"),
                    matched_required_skills=match_result.get("matched_required_skills"),
                    missing_required_skills=match_result.get("missing_required_skills"),
                    matched_preferred_skills=match_result.get("matched_preferred_skills"),
                    score_explanation=match_result.get("score_explanation"),
                    improvement_suggestions=match_result.get("improvement_suggestions"),
                )
                db.add(job_match)
                db.commit()

        # Seed sample applications
        app_samples = [
            ("Python Developer - Fresher / Early Career", "Infosys Innovation Labs", "applied", datetime.utcnow() - timedelta(days=5), None),
            ("Junior AI / ML Engineer", "Cognizant AI Solutions", "interview", datetime.utcnow() - timedelta(days=12), datetime.utcnow() + timedelta(days=3)),
            ("Cloud Software Engineer (Associate)", "Wipro Cloud Practice", "saved", datetime.utcnow() - timedelta(days=2), None),
        ]

        for title, company, status, applied_at, interview_date in app_samples:
            existing_app = db.query(Application).filter(Application.user_id == user.id, Application.job_title == title).first()
            if not existing_app:
                app_obj = Application(
                    user_id=user.id,
                    job_title=title,
                    company=company,
                    status=status,
                    applied_at=applied_at,
                    interview_date=interview_date,
                    notes="Recruiter contacted via referral. Technical round scheduled.",
                )
                db.add(app_obj)
        db.commit()

        print("Database seeded successfully with demo account!")
        print(f"Credentials -> Email: {demo_email} | Password: DemoPassword123!")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()

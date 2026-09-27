"""Matching engine unit tests - no database required."""
import pytest

from app.services.matching_engine import (
    compute_match_score,
    compute_skills_coverage,
    normalize_skill,
    normalize_skills,
)


class TestSkillNormalization:
    def test_synonym_js_to_javascript(self):
        assert normalize_skill("js") == "javascript"

    def test_synonym_ts_to_typescript(self):
        assert normalize_skill("ts") == "typescript"

    def test_synonym_postgres_to_postgresql(self):
        assert normalize_skill("postgres") == "postgresql"

    def test_synonym_k8s_to_kubernetes(self):
        assert normalize_skill("k8s") == "kubernetes"

    def test_synonym_ml_to_machine_learning(self):
        assert normalize_skill("ml") == "machine learning"

    def test_unknown_skill_passthrough(self):
        assert normalize_skill("fastapi") == "fastapi"

    def test_case_insensitive(self):
        assert normalize_skill("PYTHON") == "python"

    def test_normalize_list(self):
        skills = ["JS", "ts", "postgres", "react"]
        normalized = normalize_skills(skills)
        assert "javascript" in normalized
        assert "typescript" in normalized
        assert "postgresql" in normalized
        assert "react" in normalized

    def test_deduplication(self):
        # js and javascript both → javascript
        skills = normalize_skills(["js", "javascript"])
        assert skills.count("javascript") == 1


class TestSkillsCoverage:
    def test_full_coverage(self):
        score, matched, missing = compute_skills_coverage(
            ["python", "fastapi", "postgresql"],
            ["python", "fastapi", "postgresql"],
        )
        assert score == 100.0
        assert len(missing) == 0

    def test_zero_coverage(self):
        score, matched, missing = compute_skills_coverage(
            ["java", "spring"],
            ["python", "fastapi"],
        )
        assert score == 0.0
        assert len(missing) == 2

    def test_partial_coverage(self):
        score, matched, missing = compute_skills_coverage(
            ["python", "fastapi"],
            ["python", "fastapi", "docker", "aws"],
        )
        assert score == 50.0
        assert len(matched) == 2
        assert len(missing) == 2

    def test_empty_job_skills(self):
        score, matched, missing = compute_skills_coverage(["python"], [])
        assert score == 0.0

    def test_synonym_matching(self):
        """js in resume should match javascript in job"""
        score, matched, missing = compute_skills_coverage(
            ["js", "postgres"],
            ["javascript", "postgresql"],
        )
        assert score == 100.0
        assert len(missing) == 0


class TestMatchScore:
    def test_basic_match(self):
        resume_data = {
            "raw_text": "Python developer with FastAPI and PostgreSQL experience",
            "skills": ["python", "fastapi", "postgresql"],
            "technical_skills": ["fastapi", "postgresql"],
            "programming_languages": ["python"],
            "frameworks": ["fastapi"],
            "cloud_platforms": [],
            "projects": [{"raw": "Built a REST API with Python and FastAPI"}],
            "work_experience": [],
            "professional_summary": "Python developer",
        }
        job_data = {
            "description": "Looking for Python developer with FastAPI skills",
            "required_skills": ["python", "fastapi"],
            "preferred_skills": ["docker"],
        }
        result = compute_match_score(resume_data, job_data)

        assert 0 <= result["overall_score"] <= 100
        assert result["scoring_version"] == "v1.0"
        assert isinstance(result["matched_required_skills"], list)
        assert isinstance(result["missing_required_skills"], list)
        assert "python" in result["matched_required_skills"]

    def test_empty_resume_skills(self):
        """Should not crash with empty resume."""
        resume_data = {
            "raw_text": "",
            "skills": [],
            "technical_skills": [],
            "programming_languages": [],
            "frameworks": [],
            "cloud_platforms": [],
            "projects": [],
            "work_experience": [],
            "professional_summary": "",
        }
        job_data = {
            "description": "Python developer needed",
            "required_skills": ["python"],
            "preferred_skills": [],
        }
        result = compute_match_score(resume_data, job_data)
        assert result["overall_score"] == 0.0 or result["overall_score"] >= 0
        assert "python" in result["missing_required_skills"]

    def test_no_job_skills_extracted(self):
        """Should handle jobs with no pre-parsed skills."""
        resume_data = {
            "raw_text": "Python Django developer",
            "skills": ["python", "django"],
            "technical_skills": [],
            "programming_languages": ["python"],
            "frameworks": ["django"],
            "cloud_platforms": [],
            "projects": [],
            "work_experience": [],
            "professional_summary": "",
        }
        job_data = {
            "description": "We need a Python developer with Django experience",
            "required_skills": [],
            "preferred_skills": [],
        }
        result = compute_match_score(resume_data, job_data)
        # Should still work - extracts skills from description
        assert isinstance(result["overall_score"], float)

    def test_score_explanation_structure(self):
        """Score explanation should have required fields."""
        resume_data = {
            "raw_text": "Software engineer",
            "skills": ["python"],
            "technical_skills": [],
            "programming_languages": ["python"],
            "frameworks": [],
            "cloud_platforms": [],
            "projects": [],
            "work_experience": [],
        }
        job_data = {
            "description": "Python developer role",
            "required_skills": ["python"],
            "preferred_skills": [],
        }
        result = compute_match_score(resume_data, job_data)
        explanation = result["score_explanation"]
        assert "formula" in explanation
        assert "note" in explanation
        assert "scoring_version" in explanation

    def test_improvement_suggestions_generated(self):
        """Missing skills should generate improvement suggestions."""
        resume_data = {
            "raw_text": "Java developer",
            "skills": ["java"],
            "technical_skills": [],
            "programming_languages": ["java"],
            "frameworks": [],
            "cloud_platforms": [],
            "projects": [],
            "work_experience": [],
            "professional_summary": "",
        }
        job_data = {
            "description": "Python, Docker, AWS developer needed",
            "required_skills": ["python", "docker", "aws"],
            "preferred_skills": [],
        }
        result = compute_match_score(resume_data, job_data)
        assert len(result["improvement_suggestions"]) > 0

"""
Hybrid Job Matching Engine v1.0

Scoring Formula:
  - Required skills coverage:    40%
  - Semantic similarity (TF-IDF): 30%
  - Projects/experience relevance: 20%
  - Preferred skills coverage:    10%

All components normalized to 0-100 before weighting.
If a component is unavailable, remaining weights are renormalized.
"""
import re
from typing import Any, Dict, List, Optional, Tuple

# ----- Skill Synonym Taxonomy -----
SKILL_SYNONYMS: Dict[str, List[str]] = {
    "javascript": ["js"],
    "typescript": ["ts"],
    "python": ["py"],
    "postgresql": ["postgres", "psql", "pg"],
    "machine learning": ["ml"],
    "artificial intelligence": ["ai"],
    "natural language processing": ["nlp"],
    "rest api": ["rest", "restful", "restful api"],
    "node.js": ["nodejs", "node"],
    "react": ["reactjs", "react.js"],
    "next.js": ["nextjs"],
    "kubernetes": ["k8s"],
    "amazon web services": ["aws"],
    "google cloud platform": ["gcp", "google cloud"],
    "microsoft azure": ["azure"],
    "mongodb": ["mongo"],
    "c++": ["cpp"],
    "c#": ["csharp", "dotnet", ".net"],
    "large language model": ["llm"],
    "user interface": ["ui"],
    "user experience": ["ux"],
    "object oriented programming": ["oop"],
    "continuous integration": ["ci"],
    "continuous deployment": ["cd"],
    "application programming interface": ["api"],
}

# Build reverse lookup once
_SYNONYM_MAP: Dict[str, str] = {}
for _canonical, _aliases in SKILL_SYNONYMS.items():
    _SYNONYM_MAP[_canonical] = _canonical
    for _alias in _aliases:
        _SYNONYM_MAP[_alias] = _canonical

SCORING_VERSION = "v1.0"
BASE_WEIGHTS = {
    "required_skills": 0.40,
    "semantic": 0.30,
    "projects": 0.20,
    "preferred_skills": 0.10,
}


def normalize_skill(skill: str) -> str:
    """Normalize a skill string to its canonical form."""
    normalized = skill.lower().strip()
    return _SYNONYM_MAP.get(normalized, normalized)


def normalize_skills(skills: List[str]) -> List[str]:
    """Normalize a list of skills, deduplicate."""
    return list({normalize_skill(s) for s in skills})


def extract_skills_from_text(text: str) -> List[str]:
    """Extract skills from free text using keyword matching."""
    from app.services.resume_parser import SKILL_KEYWORDS

    text_lower = text.lower()
    found = []
    for skill in SKILL_KEYWORDS:
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, text_lower):
            found.append(skill)
    return found


def extract_skills_from_jd(description: str) -> Tuple[List[str], List[str]]:
    """
    Extract required and preferred skills from job description text.
    Returns (required_skills, preferred_skills).
    """
    desc_lower = description.lower()

    # Try to find 'nice to have' / 'preferred' section
    preferred_patterns = [
        r"nice[- ]to[- ]have[s]?[:\s]+(.+?)(?=\n\n|required|must have|$)",
        r"preferred[:\s]+(.+?)(?=\n\n|required|must have|$)",
        r"bonus[:\s]+(.+?)(?=\n\n|$)",
        r"good to have[:\s]+(.+?)(?=\n\n|$)",
    ]

    preferred_text = ""
    for pat in preferred_patterns:
        m = re.search(pat, desc_lower, re.DOTALL)
        if m:
            preferred_text = m.group(1)
            break

    all_skills = extract_skills_from_text(description)
    preferred_skills_raw = extract_skills_from_text(preferred_text) if preferred_text else []
    preferred_normalized = normalize_skills(preferred_skills_raw)
    required_normalized = normalize_skills(
        [s for s in all_skills if s not in preferred_skills_raw]
    )

    return required_normalized, preferred_normalized


def compute_skills_coverage(
    resume_skills: List[str], job_skills: List[str]
) -> Tuple[float, List[str], List[str]]:
    """
    Compute what fraction of job_skills appear in resume_skills.
    Returns (score_0_to_100, matched, missing).
    """
    if not job_skills:
        return 0.0, [], []

    resume_set = set(normalize_skills(resume_skills))
    job_normalized = normalize_skills(job_skills)

    matched = [s for s in job_normalized if s in resume_set]
    missing = [s for s in job_normalized if s not in resume_set]

    score = (len(matched) / len(job_normalized)) * 100.0 if job_normalized else 0.0
    return round(score, 2), matched, missing


def compute_tfidf_similarity(text1: str, text2: str) -> float:
    """TF-IDF cosine similarity, normalized to 0-100."""
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity

        vectorizer = TfidfVectorizer(stop_words="english", max_features=1000)
        tfidf_matrix = vectorizer.fit_transform(
            [text1[:4000], text2[:4000]]
        )
        sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        return round(float(sim * 100), 2)
    except Exception:
        return 50.0  # Neutral if unavailable


def compute_semantic_similarity(text1: str, text2: str) -> float:
    """
    Attempt sentence-transformers similarity, fall back to TF-IDF.
    Returns score 0-100.
    """
    try:
        from sentence_transformers import SentenceTransformer
        from sklearn.metrics.pairwise import cosine_similarity

        # Cache model on function object
        if not hasattr(compute_semantic_similarity, "_model"):
            compute_semantic_similarity._model = SentenceTransformer("all-MiniLM-L6-v2")
        model = compute_semantic_similarity._model
        embeddings = model.encode([text1[:2000], text2[:2000]])
        sim = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
        return round(float((sim + 1) / 2 * 100), 2)
    except Exception:
        return compute_tfidf_similarity(text1, text2)


def compute_match_score(
    resume_data: Dict[str, Any],
    job_data: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Main matching function. Computes hybrid match score.
    
    Parameters:
        resume_data: dict with keys skills, technical_skills, programming_languages,
                     frameworks, cloud_platforms, raw_text, projects, work_experience
        job_data: dict with keys required_skills, preferred_skills, description
    
    Returns:
        dict with overall_score, component scores, matched/missing skills, explanation
    """
    # --- Gather all resume skills ---
    all_resume_skills: List[str] = []
    for field in ["skills", "technical_skills", "programming_languages", "frameworks", "cloud_platforms"]:
        field_skills = resume_data.get(field) or []
        if isinstance(field_skills, list):
            all_resume_skills.extend(field_skills)

    resume_text = resume_data.get("raw_text", "") or ""

    # Combine projects + experience text
    projects_list = resume_data.get("projects") or []
    experience_list = resume_data.get("work_experience") or []
    projects_text = " ".join(
        p.get("raw", "") if isinstance(p, dict) else str(p) for p in projects_list
    )
    experience_text = " ".join(
        e.get("raw", "") if isinstance(e, dict) else str(e) for e in experience_list
    )
    context_text = f"{projects_text} {experience_text}".strip()

    # --- Gather job requirements ---
    job_required: List[str] = job_data.get("required_skills") or []
    job_preferred: List[str] = job_data.get("preferred_skills") or []
    job_description = job_data.get("description", "") or ""

    # If job has no skills parsed, extract from description
    if not job_required:
        job_required, extracted_preferred = extract_skills_from_jd(job_description)
        if not job_preferred:
            job_preferred = extracted_preferred

    # --- Compute component scores ---
    available_weights = dict(BASE_WEIGHTS)
    components: Dict[str, float] = {}

    # 1. Required skills coverage (40%)
    if job_required:
        req_score, matched_req, missing_req = compute_skills_coverage(all_resume_skills, job_required)
        components["required_skills"] = req_score
    else:
        del available_weights["required_skills"]
        matched_req, missing_req = [], []

    # 2. Semantic / TF-IDF similarity (30%)
    if resume_text and job_description:
        sem_score = compute_semantic_similarity(resume_text, job_description)
        components["semantic"] = sem_score
    else:
        del available_weights["semantic"]

    # 3. Projects / experience relevance (20%)
    if context_text and job_description:
        proj_score = compute_semantic_similarity(context_text, job_description)
        components["projects"] = proj_score
    else:
        del available_weights["projects"]

    # 4. Preferred skills coverage (10%)
    if job_preferred:
        pref_score, matched_pref, _ = compute_skills_coverage(all_resume_skills, job_preferred)
        components["preferred_skills"] = pref_score
    else:
        del available_weights["preferred_skills"]
        matched_pref = []

    # --- Renormalize weights if some components missing ---
    total_weight = sum(BASE_WEIGHTS[k] for k in available_weights)
    if total_weight == 0 or not components:
        overall_score = 0.0
        normalized_weights: Dict[str, float] = {}
    else:
        normalized_weights = {k: BASE_WEIGHTS[k] / total_weight for k in available_weights}
        overall_score = sum(components[k] * normalized_weights[k] for k in components)

    overall_score = round(min(100.0, max(0.0, overall_score)), 2)

    # --- Build explanation ---
    explanation = {
        "formula": (
            "Hybrid matching: required_skills(40%) + semantic_similarity(30%) "
            "+ projects_experience(20%) + preferred_skills(10%)"
        ),
        "weights_applied": {k: round(v, 4) for k, v in normalized_weights.items()},
        "component_scores": {k: round(v, 2) for k, v in components.items()},
        "scoring_version": SCORING_VERSION,
        "note": (
            "Score reflects resume-job alignment based on skills and content similarity. "
            "It does NOT represent employer hiring probability."
        ),
    }

    # --- Improvement suggestions ---
    suggestions = []
    if missing_req:
        suggestions.append(
            f"Gain experience with these required skills: {', '.join(missing_req[:6])}"
        )
    if components.get("semantic", 100) < 50:
        suggestions.append(
            "Tailor your resume language to better match the job description terminology"
        )
    if not context_text:
        suggestions.append(
            "Add relevant projects or work experience to your resume to demonstrate applied skills"
        )
    if not resume_data.get("professional_summary"):
        suggestions.append(
            "Add a professional summary highlighting your experience relevant to this role"
        )
    if not all_resume_skills:
        suggestions.append("Add a dedicated skills section to your resume")

    return {
        "overall_score": overall_score,
        "required_skills_score": components.get("required_skills"),
        "semantic_score": components.get("semantic"),
        "projects_score": components.get("projects"),
        "preferred_skills_score": components.get("preferred_skills"),
        "matched_required_skills": matched_req,
        "missing_required_skills": missing_req,
        "matched_preferred_skills": matched_pref,
        "score_explanation": explanation,
        "improvement_suggestions": suggestions,
        "scoring_version": SCORING_VERSION,
    }

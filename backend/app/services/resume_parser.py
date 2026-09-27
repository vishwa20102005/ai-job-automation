"""
Resume Parser Service
Extracts structured information from PDF and DOCX files.
"""
import re
from pathlib import Path
from typing import Any, Dict, List, Optional


# Comprehensive skill taxonomy
SKILL_KEYWORDS = [
    # Languages
    "python", "javascript", "typescript", "java", "c++", "c#", "go", "rust",
    "kotlin", "swift", "ruby", "php", "scala", "r", "matlab", "bash", "shell",
    "sql", "html", "css", "sass", "less", "dart", "lua", "haskell",
    # Frameworks / Libraries
    "react", "vue", "angular", "next.js", "nuxt.js", "svelte", "fastapi",
    "django", "flask", "express", "node.js", "spring boot", "laravel",
    "asp.net", "nest.js", "pytorch", "tensorflow", "keras", "scikit-learn",
    "pandas", "numpy", "matplotlib", "seaborn", "opencv", "langchain",
    "huggingface", "transformers", "streamlit", "fastify",
    # Databases
    "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "sqlite",
    "cassandra", "dynamodb", "neo4j", "influxdb", "supabase", "firebase",
    "oracle", "mssql",
    # Cloud / DevOps
    "aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "terraform",
    "ansible", "jenkins", "github actions", "gitlab ci", "circleci", "helm",
    "prometheus", "grafana", "linux", "nginx", "apache",
    # AI/ML
    "machine learning", "deep learning", "nlp", "computer vision", "llm",
    "openai", "bert", "reinforcement learning",
    # Tools
    "git", "github", "gitlab", "bitbucket", "jira", "confluence", "figma",
    "postman", "swagger", "graphql", "rest api", "grpc", "kafka", "rabbitmq",
]

LANGUAGE_SKILLS = {
    "python", "javascript", "typescript", "java", "c++", "c#", "go", "rust",
    "kotlin", "swift", "ruby", "php", "scala", "r", "bash", "shell", "sql",
    "html", "css", "sass", "dart",
}

FRAMEWORK_SKILLS = {
    "react", "vue", "angular", "next.js", "fastapi", "django", "flask",
    "express", "node.js", "spring boot", "pytorch", "tensorflow", "keras",
    "scikit-learn", "pandas", "numpy", "langchain",
}

CLOUD_SKILLS = {
    "aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "terraform",
}


def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF using PyMuPDF"""
    try:
        import fitz  # PyMuPDF

        doc = fitz.open(file_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text.strip()
    except ImportError:
        raise ValueError("PyMuPDF (fitz) is not installed")
    except Exception as e:
        raise ValueError(f"Failed to extract PDF text: {e}")


def extract_text_from_docx(file_path: str) -> str:
    """Extract text from DOCX"""
    try:
        from docx import Document

        doc = Document(file_path)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        # Also extract from tables
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    if cell.text.strip():
                        paragraphs.append(cell.text.strip())
        return "\n".join(paragraphs).strip()
    except ImportError:
        raise ValueError("python-docx is not installed")
    except Exception as e:
        raise ValueError(f"Failed to extract DOCX text: {e}")


def normalize_text(text: str) -> str:
    """Clean and normalize extracted text"""
    text = re.sub(r"\r\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[^\S\n]+", " ", text)
    return text.strip()


def extract_email(text: str) -> Optional[str]:
    pattern = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
    matches = re.findall(pattern, text)
    return matches[0] if matches else None


def extract_phone(text: str) -> Optional[str]:
    pattern = r"(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}"
    matches = re.findall(pattern, text)
    if matches:
        # Return first match that's not too short
        for m in matches:
            digits = re.sub(r"\D", "", m)
            if len(digits) >= 10:
                return m
    return None


def extract_skills_from_text(text: str) -> List[str]:
    """Extract skills from text using keyword matching"""
    text_lower = text.lower()
    found_skills = []
    for skill in SKILL_KEYWORDS:
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, text_lower):
            found_skills.append(skill)
    return list(set(found_skills))


def extract_name_from_text(text: str) -> Optional[str]:
    """Try to extract name from first lines of resume"""
    lines = text.strip().split("\n")
    for line in lines[:8]:
        line = line.strip()
        # Name: 2-5 words, only letters and spaces/dots
        if line and 2 <= len(line.split()) <= 5 and re.match(r"^[A-Za-z\s\.',-]+$", line):
            skip_words = [
                "resume", "cv", "curriculum", "vitae", "profile", "portfolio",
                "summary", "contact", "address", "email", "phone",
            ]
            if not any(word in line.lower() for word in skip_words):
                return line
    return None


def extract_section(text: str, section_names: List[str], max_chars: int = 3000) -> Optional[str]:
    """Extract a section from resume text by section heading"""
    for section_name in section_names:
        pattern = r"(?im)^" + re.escape(section_name) + r"[\s:]*$"
        match = re.search(pattern, text)
        if match:
            start = match.end()
            remaining = text[start:].strip()
            # Find next major section heading (line that looks like a header)
            next_section = re.search(
                r"\n(?:[A-Z][A-Z\s&/()-]{2,}[:\n]|[A-Z][a-z]+(?:\s+[A-Z][a-z]*){0,3}\s*:)",
                remaining,
            )
            if next_section:
                return remaining[: next_section.start()].strip()[:max_chars]
            return remaining[:max_chars].strip()
    return None


def extract_certifications(text: str) -> List[str]:
    section = extract_section(text, ["certifications", "certificates", "certification", "licenses"])
    if not section:
        return []
    lines = [l.strip() for l in section.split("\n") if l.strip() and len(l.strip()) > 5]
    return lines[:10]


def extract_education(text: str) -> List[Dict]:
    section = extract_section(
        text, ["education", "academic background", "qualifications", "academic qualifications"]
    )
    if not section:
        return []
    degree_keywords = [
        "bachelor", "master", "phd", "b.tech", "m.tech", "b.e", "mba",
        "bsc", "msc", "b.sc", "m.sc", "diploma", "associate", "doctor",
        "b.com", "m.com", "b.a", "m.a",
    ]
    edu_list = []
    lines = [l.strip() for l in section.split("\n") if l.strip()]
    for i, line in enumerate(lines):
        if any(d in line.lower() for d in degree_keywords):
            entry: Dict[str, Any] = {"degree": line}
            if i + 1 < len(lines):
                entry["institution"] = lines[i + 1]
            if i + 2 < len(lines):
                entry["year"] = lines[i + 2]
            edu_list.append(entry)
        if len(edu_list) >= 5:
            break
    return edu_list if edu_list else [{"raw": section[:500]}]


def extract_projects(text: str) -> List[Dict]:
    section = extract_section(
        text,
        ["projects", "project experience", "key projects", "personal projects", "academic projects"],
        max_chars=3000,
    )
    if not section:
        return []
    return [{"raw": section}]


def extract_work_experience(text: str) -> List[Dict]:
    section = extract_section(
        text,
        [
            "experience",
            "work experience",
            "professional experience",
            "employment history",
            "internship",
            "internships",
        ],
        max_chars=4000,
    )
    if not section:
        return []
    return [{"raw": section}]


def extract_achievements(text: str) -> List[str]:
    section = extract_section(
        text, ["achievements", "accomplishments", "awards", "honors", "recognition"]
    )
    if not section:
        return []
    lines = [l.strip() for l in section.split("\n") if l.strip() and len(l.strip()) > 5]
    return lines[:10]


def parse_resume(file_path: str, file_type: str) -> Dict[str, Any]:
    """
    Main resume parsing function.
    Returns dict with all extracted fields.
    Raises ValueError on unrecoverable parsing errors.
    """
    # Extract raw text
    if file_type == "pdf":
        raw_text = extract_text_from_pdf(file_path)
    elif file_type == "docx":
        raw_text = extract_text_from_docx(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")

    if not raw_text or len(raw_text.strip()) < 50:
        raise ValueError(
            "Could not extract meaningful text. The document may be a scanned image "
            "or corrupted. Please upload a text-based PDF or DOCX."
        )

    normalized = normalize_text(raw_text)

    # Sanitize: ignore any embedded instructions
    # We treat the content as plain data, not instructions
    skills = extract_skills_from_text(normalized)

    programming_languages = [s for s in skills if s in LANGUAGE_SKILLS]
    frameworks = [s for s in skills if s in FRAMEWORK_SKILLS]
    cloud_platforms = [s for s in skills if s in CLOUD_SKILLS]
    technical_skills = [
        s for s in skills
        if s not in LANGUAGE_SKILLS and s not in CLOUD_SKILLS
    ]

    return {
        "raw_text": raw_text,
        "full_name": extract_name_from_text(normalized),
        "email": extract_email(normalized),
        "phone": extract_phone(normalized),
        "professional_summary": extract_section(
            normalized,
            ["summary", "professional summary", "objective", "about me", "profile", "about"],
        ),
        "skills": skills,
        "technical_skills": technical_skills,
        "programming_languages": programming_languages,
        "frameworks": frameworks,
        "cloud_platforms": cloud_platforms,
        "certifications": extract_certifications(normalized),
        "education": extract_education(normalized),
        "projects": extract_projects(normalized),
        "work_experience": extract_work_experience(normalized),
        "achievements": extract_achievements(normalized),
    }

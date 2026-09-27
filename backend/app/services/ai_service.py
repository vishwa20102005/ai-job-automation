"""
AI Service - Abstraction layer for LLM providers.
Supports Google Gemini (gemini-3.8-flash) as primary provider,
with Azure OpenAI as alternative, and deterministic fallback templates.
"""
import json
import logging
import re
from typing import Any, Dict, List, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


class AIService:
    """
    Unified AI provider abstraction.
    Supports Google Gemini (gemini-3.8-flash) via google-genai SDK,
    Azure OpenAI via openai SDK, and graceful fallback templates.
    """

    def __init__(self) -> None:
        self._gemini_client = None
        self._azure_client = None
        self._provider = settings.AI_PROVIDER.lower()
        self._check_configuration()

    def _check_configuration(self) -> None:
        self._gemini_configured = bool(settings.GEMINI_API_KEY)
        self._azure_configured = bool(
            settings.AZURE_OPENAI_ENDPOINT
            and settings.AZURE_OPENAI_KEY
            and settings.AZURE_OPENAI_DEPLOYMENT
        )

    def is_configured(self) -> bool:
        """Returns True if any supported AI provider is configured."""
        self._check_configuration()
        if self._provider == "gemini":
            return self._gemini_configured or self._azure_configured
        elif self._provider == "azure":
            return self._azure_configured or self._gemini_configured
        return self._gemini_configured or self._azure_configured

    @property
    def active_provider(self) -> str:
        """Returns the name of the currently active provider."""
        self._check_configuration()
        if self._gemini_configured:
            return f"gemini ({settings.GEMINI_MODEL})"
        if self._azure_configured:
            return f"azure-openai ({settings.AZURE_OPENAI_DEPLOYMENT})"
        return "template-fallback"

    def _get_gemini_client(self):
        if self._gemini_client:
            return self._gemini_client
        if not settings.GEMINI_API_KEY:
            return None
        try:
            from google import genai

            self._gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
            return self._gemini_client
        except Exception as e:
            logger.warning("Failed to initialize Google Gemini client: %s", e)
            return None

    def _get_azure_client(self):
        if self._azure_client:
            return self._azure_client
        if not (settings.AZURE_OPENAI_ENDPOINT and settings.AZURE_OPENAI_KEY):
            return None
        try:
            from openai import AzureOpenAI

            self._azure_client = AzureOpenAI(
                azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
                api_key=settings.AZURE_OPENAI_KEY,
                api_version=settings.AZURE_OPENAI_API_VERSION or "2024-10-01-preview",
            )
            return self._azure_client
        except Exception as e:
            logger.warning("Failed to initialize Azure OpenAI client: %s", e)
            return None

    def _call_gemini(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 2048,
        json_mode: bool = False,
    ) -> Optional[str]:
        """Generate response using Google Gemini model."""
        client = self._get_gemini_client()
        if not client:
            return None
        try:
            from google.genai import types

            config_kwargs: Dict[str, Any] = {
                "system_instruction": system_prompt,
                "temperature": temperature,
                "max_output_tokens": max_tokens,
            }
            if json_mode:
                config_kwargs["response_mime_type"] = "application/json"

            config = types.GenerateContentConfig(**config_kwargs)
            model_name = settings.GEMINI_MODEL or "gemini-3.8-flash"

            response = client.models.generate_content(
                model=model_name,
                contents=user_prompt,
                config=config,
            )
            return response.text
        except Exception as e:
            logger.error("Gemini API call failed: %s", e)
            return None

    def _call_azure(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 2000,
    ) -> Optional[str]:
        """Generate response using Azure OpenAI model."""
        client = self._get_azure_client()
        if not client:
            return None
        try:
            response = client.chat.completions.create(
                model=settings.AZURE_OPENAI_DEPLOYMENT,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error("Azure OpenAI call failed: %s", e)
            return None

    def _call_llm(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 2048,
        json_mode: bool = False,
    ) -> Optional[str]:
        """
        Unified LLM invoker. Prioritizes Gemini if configured,
        falls back to Azure OpenAI, or returns None.
        """
        self._check_configuration()

        if self._provider == "gemini" and self._gemini_configured:
            result = self._call_gemini(system_prompt, user_prompt, temperature, max_tokens, json_mode)
            if result:
                return result

        if self._azure_configured:
            result = self._call_azure(system_prompt, user_prompt, temperature, max_tokens)
            if result:
                return result

        if self._gemini_configured:
            result = self._call_gemini(system_prompt, user_prompt, temperature, max_tokens, json_mode)
            if result:
                return result

        return None

    def _extract_json_object(self, text: str) -> Optional[dict]:
        """Extract first JSON object from text."""
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        return None

    def _extract_json_array(self, text: str) -> Optional[list]:
        """Extract first JSON array from text."""
        match = re.search(r"\[.*\]", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        return None

    # ------------------------------------------------------------------
    # Cover Letter Generation
    # ------------------------------------------------------------------

    def generate_cover_letter(
        self,
        resume_data: Dict[str, Any],
        job_data: Dict[str, Any],
        tone: str = "formal",
        additional_details: Optional[str] = None,
    ) -> str:
        if not self.is_configured():
            return self._cover_letter_template(resume_data, job_data, tone)

        tone_map = {
            "formal": "Write in a formal, professional tone suitable for corporate applications.",
            "concise": "Write concisely, keeping the letter under 250 words.",
            "friendly_professional": "Write in a warm, approachable yet professional tone.",
        }

        system_prompt = (
            "You are an expert professional cover letter writer.\n"
            "Rules:\n"
            "- Only use information provided. Never invent experience, skills, or achievements.\n"
            "- Be specific and reference actual skills/projects from the resume data.\n"
            "- Keep it to 3-4 paragraphs.\n"
            "- Do not make false claims about the company.\n"
            "- Output ONLY the cover letter text, no meta-commentary or labels."
        )

        skills_str = ", ".join((resume_data.get("skills") or [])[:15])
        exp_str = str(resume_data.get("work_experience") or [])[:400]
        proj_str = str(resume_data.get("projects") or [])[:400]
        summary = (resume_data.get("professional_summary") or "")[:300]

        user_prompt = (
            f"Write a cover letter for:\n\n"
            f"CANDIDATE:\n"
            f"Name: {resume_data.get('full_name', 'Applicant')}\n"
            f"Skills: {skills_str}\n"
            f"Experience: {exp_str}\n"
            f"Projects: {proj_str}\n"
            f"Summary: {summary}\n\n"
            f"JOB:\n"
            f"Title: {job_data.get('title', '')}\n"
            f"Company: {job_data.get('company', 'the company')}\n"
            f"Description: {(job_data.get('description') or '')[:800]}\n\n"
            f"TONE: {tone_map.get(tone, tone_map['formal'])}\n"
        )
        if additional_details:
            user_prompt += f"\nADDITIONAL CONTEXT: {additional_details}"

        result = self._call_llm(system_prompt, user_prompt, temperature=0.4)
        return result if result else self._cover_letter_template(resume_data, job_data, tone)

    def _cover_letter_template(
        self, resume_data: Dict, job_data: Dict, tone: str
    ) -> str:
        name = resume_data.get("full_name") or "Applicant"
        skills = ", ".join((resume_data.get("programming_languages") or [])[:5])
        company = job_data.get("company") or "Your Company"
        title = job_data.get("title") or "the position"
        return (
            f"Dear Hiring Manager,\n\n"
            f"I am writing to express my strong interest in the {title} position at {company}.\n\n"
            f"With expertise in {skills or 'relevant technologies'}, I am confident in my ability "
            f"to contribute effectively to your team. My background in software development and "
            f"passion for building scalable solutions aligns well with your requirements.\n\n"
            f"I would welcome the opportunity to discuss how my skills can contribute to "
            f"{company}'s success. Thank you for considering my application.\n\n"
            f"Sincerely,\n{name}\n\n"
            f"---\n"
            f"[AI generation is in local development mode. Set GEMINI_API_KEY in your backend "
            f".env file to activate Gemini 3.8 Flash AI generation.]"
        )

    # ------------------------------------------------------------------
    # Resume Studio - Suggestions
    # ------------------------------------------------------------------

    def generate_resume_suggestions(
        self,
        resume_data: Dict[str, Any],
        job_data: Dict[str, Any],
        match_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        missing_skills = match_data.get("missing_required_skills") or []

        if not self.is_configured():
            suggestions = []
            if missing_skills:
                suggestions.append(
                    {
                        "section": "skills",
                        "original": "",
                        "suggestion": f"Consider gaining experience with: {', '.join(missing_skills[:6])}",
                        "reason": "These required skills are missing from your resume",
                    }
                )
            if not resume_data.get("professional_summary"):
                suggestions.append(
                    {
                        "section": "summary",
                        "original": "",
                        "suggestion": f"Add a professional summary highlighting your {job_data.get('title', 'role')}-relevant skills and experience.",
                        "reason": "A tailored summary greatly improves ATS matching and recruiter engagement",
                    }
                )
            return {
                "suggestions": suggestions,
                "missing_keywords": missing_skills,
                "summary_suggestion": f"Add a summary tailored to {job_data.get('title', 'the role')}.",
                "note": "Configure GEMINI_API_KEY for real-time Gemini 3.8 Flash suggestions.",
            }

        system_prompt = (
            "You are a professional resume coach and ATS optimization expert.\n"
            "Rules:\n"
            "- NEVER suggest adding false experience, skills, or achievements\n"
            "- Only suggest improvements to existing content or note skills to learn\n"
            "- Output valid JSON only\n"
            "- Be specific and actionable"
        )

        user_prompt = (
            f"Analyze this resume against the job and provide improvement suggestions.\n\n"
            f"RESUME SKILLS: {', '.join((resume_data.get('skills') or [])[:20])}\n"
            f"RESUME SUMMARY: {(resume_data.get('professional_summary') or 'None')[:400]}\n"
            f"MISSING REQUIRED SKILLS: {', '.join(missing_skills[:10])}\n"
            f"JOB TITLE: {job_data.get('title', '')}\n"
            f"JOB REQUIREMENTS: {(job_data.get('description') or '')[:600]}\n\n"
            "Respond with JSON:\n"
            "{\n"
            '  "suggestions": [{"section": "...", "original": "...", "suggestion": "...", "reason": "..."}],\n'
            '  "missing_keywords": ["..."],\n'
            '  "summary_suggestion": "..."\n'
            "}"
        )

        result = self._call_llm(system_prompt, user_prompt, json_mode=True)
        if result:
            data = self._extract_json_object(result)
            if data:
                return data

        return {
            "suggestions": [
                {
                    "section": "skills",
                    "original": "",
                    "suggestion": f"Add: {', '.join(missing_skills[:5])}",
                    "reason": "Missing required skills for this role",
                }
            ],
            "missing_keywords": missing_skills,
            "summary_suggestion": None,
        }

    # ------------------------------------------------------------------
    # Interview Coach
    # ------------------------------------------------------------------

    def generate_interview_questions(
        self,
        target_role: str,
        resume_data: Optional[Dict[str, Any]] = None,
        job_description: Optional[str] = None,
        difficulty: str = "medium",
        num_questions: int = 10,
    ) -> List[Dict[str, str]]:
        if not self.is_configured():
            return self._fallback_questions(target_role, num_questions)

        system_prompt = (
            "You are an expert technical interviewer. Generate realistic, specific interview questions.\n"
            "Output a valid JSON array only."
        )

        skills_str = ", ".join((resume_data or {}).get("skills", [])[:15])
        jd_str = (job_description or "")[:500]

        user_prompt = (
            f"Generate {num_questions} interview questions for a {target_role} candidate.\n"
            f"Difficulty: {difficulty}\n"
            f"Candidate skills: {skills_str}\n"
            f"Job context: {jd_str}\n\n"
            "Include mix: ~40% technical, ~25% behavioral, ~20% resume-based, ~15% HR.\n"
            'Output JSON array: [{"question": "...", "type": "technical|hr|behavioral|resume_based|project"}]'
        )

        result = self._call_llm(system_prompt, user_prompt, temperature=0.5, json_mode=True)
        if result:
            questions = self._extract_json_array(result)
            if questions and isinstance(questions, list):
                return questions[:num_questions]

        return self._fallback_questions(target_role, num_questions)

    def _fallback_questions(self, role: str, num: int) -> List[Dict[str, str]]:
        questions = [
            {"question": f"Tell me about yourself and why you're interested in the {role} role.", "type": "hr"},
            {"question": "What are your strongest technical skills and how have you applied them?", "type": "technical"},
            {"question": "Describe a challenging technical problem you solved and how you approached it.", "type": "behavioral"},
            {"question": "Walk me through your most significant project.", "type": "resume_based"},
            {"question": "How do you stay updated with the latest technology trends?", "type": "hr"},
            {"question": "Explain the difference between SQL and NoSQL databases and when to use each.", "type": "technical"},
            {"question": "Describe a time you had to work under pressure to meet a deadline.", "type": "behavioral"},
            {"question": "What is the difference between REST and GraphQL? When would you choose one over the other?", "type": "technical"},
            {"question": "How do you approach code reviews?", "type": "behavioral"},
            {"question": "Where do you see yourself professionally in 3 years?", "type": "hr"},
            {"question": "Explain how you would design a URL shortener service.", "type": "technical"},
            {"question": "Describe your experience with version control systems.", "type": "resume_based"},
        ]
        return questions[:num]

    def evaluate_answer(
        self,
        question: str,
        question_type: str,
        answer: str,
        target_role: str,
    ) -> Dict[str, Any]:
        if len(answer.strip()) < 10:
            return {
                "score": 0,
                "technical_correctness": "No meaningful answer provided",
                "relevance": "Please provide a complete answer",
                "clarity": "N/A",
                "completeness": "N/A",
                "missing_concepts": [],
                "improved_answer": "Try to provide a detailed, structured answer.",
                "ai_configured": self.is_configured(),
            }

        if not self.is_configured():
            return {
                "score": 6,
                "technical_correctness": "Answer recorded. Configure GEMINI_API_KEY for live evaluation.",
                "relevance": "Your answer was received.",
                "clarity": "Answer recorded.",
                "completeness": "For detailed feedback, please configure GEMINI_API_KEY in .env.",
                "missing_concepts": [],
                "improved_answer": (
                    "Structure your answer using STAR method (Situation, Task, Action, Result) "
                    "for behavioral questions. For technical questions, explain concepts clearly "
                    "and provide examples."
                ),
                "ai_configured": False,
            }

        system_prompt = (
            "You are an expert technical interviewer evaluating a candidate's answer.\n"
            "Be fair, constructive, and specific. Output valid JSON only."
        )

        user_prompt = (
            f"Evaluate this interview answer:\n\n"
            f"ROLE: {target_role}\n"
            f"QUESTION TYPE: {question_type}\n"
            f"QUESTION: {question}\n"
            f"CANDIDATE ANSWER: {answer[:1500]}\n\n"
            "Output JSON:\n"
            "{\n"
            '  "score": <1-10>,\n'
            '  "technical_correctness": "assessment",\n'
            '  "relevance": "assessment",\n'
            '  "clarity": "assessment",\n'
            '  "completeness": "assessment",\n'
            '  "missing_concepts": ["concept1"],\n'
            '  "improved_answer": "example stronger answer"\n'
            "}"
        )

        result = self._call_llm(system_prompt, user_prompt, temperature=0.2, json_mode=True)
        if result:
            data = self._extract_json_object(result)
            if data:
                data["ai_configured"] = True
                return data

        return {
            "score": 6,
            "technical_correctness": "Evaluation temporarily unavailable",
            "relevance": "Answer recorded",
            "clarity": "Answer recorded",
            "completeness": "Answer recorded",
            "missing_concepts": [],
            "improved_answer": "Try to be specific and structured in your answer.",
            "ai_configured": True,
        }


# Singleton instance
ai_service = AIService()

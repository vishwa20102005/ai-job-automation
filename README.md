# CareerPilot AI – Intelligent Job Application & Resume Automation Platform

[![CI Pipeline](https://github.com/vishw/careerpilot-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/vishw/careerpilot-ai)
[![Python 3.11](https://img.shields.io/badge/python-3.11-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/backend-FastAPI%200.115-green.svg)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/frontend-React%20%2B%20TypeScript-61dafb.svg)](https://react.dev/)
[![AI Model](https://img.shields.io/badge/AI%20Model-Google%20Gemini%203.8%20Flash-orange.svg)](https://ai.google.dev/)
[![Docker](https://img.shields.io/badge/deployment-Docker%20Compose-2496ed.svg)](https://www.docker.com/)

A full-stack, production-style, AI-powered engineering portfolio platform built for candidates targeting **Python Developer**, **Software Engineer**, **AI/ML Engineer**, and **Cloud Engineer** roles.

CareerPilot AI eliminates guesswork in job applications through deterministic resume parsing, a **transparent 4-factor hybrid matching engine**, AI cover letter generation with **Google Gemini 3.8 Flash**, interactive STAR-method interview coaching, and a real-time Kanban application tracking pipeline.

---

## 🚀 Key Features

| Feature | Description | Architecture |
|---|---|---|
| **📄 Automated Resume Parser** | Extracts contact details, education, technical competencies, frameworks, cloud platforms, and projects from PDF & DOCX. | PyMuPDF (`fitz`), `python-docx`, regex taxonomy |
| **🎯 Hybrid Matching Engine (v1.0)** | Evaluates compatibility using transparent weighting: Required Skills (40%), Semantic Similarity (30%), Projects Relevance (20%), and Preferred Skills (10%). | scikit-learn TF-IDF, synonym mapping, weighted normalization |
| **💡 Resume Studio (AI Optimizer)** | Identifies skill gaps, suggests role-tailored summaries, and optimizes bullet points with strong action verbs. | Google Gemini 3.8 Flash (`google-genai` SDK) |
| **✉️ Cover Letter Studio** | Generates tailored cover letters in Formal, Concise, or Friendly tones. Exports to PDF & DOCX. | Gemini 3.8 Flash, ReportLab, python-docx |
| **📊 Application Tracker** | Real-time Kanban pipeline across 7 stages: Saved, Applied, Assessment, Interview, Offer, Selected, and Rejected. | React Query, optimistic UI, full CRUD API |
| **🎓 AI Interview Coach** | Simulates technical, behavioral, project, and HR interview questions. Scores answers on a 1-10 scale using the STAR method. | Gemini 3.8 Flash with structured JSON evaluations |
| **📈 Job Search Analytics** | Tracks 30-day velocity, status breakdown pie charts, and top missing skill gaps. | Recharts, SQLAlchemy SQL aggregations |

---

## 🧠 AI Architecture: Google Gemini 3.8 Flash

CareerPilot AI natively uses the **Google Gemini 3.8 Flash** model (`gemini-3.8-flash`) via the modern `google-genai` Python SDK (v2.25+).

- **High Speed & Throughput**: Sub-second question generation and rapid cover letter drafts.
- **Structured JSON Mode**: Uses `response_mime_type="application/json"` for reliable, schema-validated answer evaluation and feedback scores.
- **Multi-Provider Fallback**: Automatically falls back to Azure OpenAI (if configured) or deterministic local templates if API keys are not supplied.

To enable live Gemini generation, add your API key to `backend/.env`:
```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash
```

---

## 📐 Scoring Formula & Logic

The matching algorithm computes compatibility transparently without opaque black boxes:

$$\text{Overall Score} = (S_{\text{req}} \times 0.40) + (S_{\text{sem}} \times 0.30) + (S_{\text{proj}} \times 0.20) + (S_{\text{pref}} \times 0.10)$$

Where:
- $S_{\text{req}}$: Required skills coverage percentage (with canonical alias normalization like `js` $\rightarrow$ `javascript`, `k8s` $\rightarrow$ `kubernetes`)
- $S_{\text{sem}}$: TF-IDF cosine similarity between resume text and job description
- $S_{\text{proj}}$: Applied relevance of demonstrated projects & past experience
- $S_{\text{pref}}$: Preferred/bonus skills coverage

*Disclaimer: The score reflects keyword and semantic alignment for preparation purposes and does not represent hiring probability.*

---

## 🛠️ Tech Stack

- **Backend**: Python 3.11, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, PyMuPDF, ReportLab, scikit-learn
- **AI / LLM**: Google Gemini 3.8 Flash (`google-genai`), Azure OpenAI compatibility
- **Database**: PostgreSQL 16 (SQLite for automated testing)
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts, TanStack React Query
- **DevOps**: Docker, Docker Compose, GitHub Actions CI, Nginx

---

## 🏁 Quickstart Guide

### Option 1: Docker Compose (Recommended)

Run the entire platform (Database, API, and Web App) with one command:

```bash
# Clone the repository
git clone https://github.com/vishw/careerpilot-ai.git
cd careerpilot-ai

# Start all services
docker compose up --build
```
- Frontend UI: `http://localhost:3000`
- Backend API Docs: `http://localhost:8000/api/docs`

---

### Option 2: Local Development Setup

#### 1. Backend Setup
```bash
cd backend

# Create and activate virtual environment (Python 3.11)
python -m venv venv
venv\Scripts\activate  # On Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env

# Run database migrations / seed demo data
python seed.py

# Start FastAPI dev server
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend Setup
```bash
cd frontend

# Install node packages
npm install

# Start Vite dev server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🧪 Testing & Verification

The backend includes a comprehensive pytest suite covering matching engine unit tests, authentication security, ownership isolation, and CRUD operations:

```bash
cd backend
python -m pytest tests/ -v
```
**Test Results: 37/37 passing** (0 errors, 100% pass rate).

To verify the frontend build:
```bash
cd frontend
npm run build
```

---

## 🔑 Demo Credentials

A seed script is provided (`backend/seed.py`) with pre-populated demo data:
- **Email**: `demo@careerpilot.ai`
- **Password**: `DemoPassword123!`

---

## 📄 License
MIT License. Built as an engineering portfolio platform demonstrating full-stack, AI/ML, and cloud engineering capabilities.

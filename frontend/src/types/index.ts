// Auth types
export interface User {
  id: string
  full_name: string
  email: string
  created_at: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  full_name: string
  email: string
  password: string
}

// Resume types
export interface Resume {
  id: string
  name: string
  original_filename: string
  file_size: number
  file_type: string
  full_name: string | null
  email: string | null
  phone: string | null
  professional_summary: string | null
  skills: string[] | null
  technical_skills: string[] | null
  programming_languages: string[] | null
  frameworks: string[] | null
  cloud_platforms: string[] | null
  certifications: unknown[] | null
  education: unknown[] | null
  projects: unknown[] | null
  work_experience: unknown[] | null
  achievements: string[] | null
  is_default: boolean
  parse_status: 'pending' | 'processing' | 'done' | 'failed'
  created_at: string
  updated_at: string
}

// Job types
export interface Job {
  id: string
  title: string
  company: string | null
  location: string | null
  description: string
  job_url: string | null
  source: string
  employment_type: string | null
  required_skills: string[] | null
  preferred_skills: string[] | null
  experience_required: string | null
  education_required: string | null
  is_saved: boolean
  created_at: string
}

export interface JobCreateInput {
  title: string
  company?: string | null
  location?: string | null
  description: string
  job_url?: string | null
  employment_type?: string | null
  required_skills?: string[] | null
  preferred_skills?: string[] | null
  experience_required?: string | null
  education_required?: string | null
  posted_at?: string | null
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// Match types
export interface ScoreExplanation {
  formula: string
  weights_applied: Record<string, number>
  components: Record<string, number>
  scoring_version: string
  note: string
}

export interface JobMatch {
  id: string
  resume_id: string
  job_id: string
  overall_score: number
  required_skills_score: number | null
  semantic_score: number | null
  projects_score: number | null
  preferred_skills_score: number | null
  matched_required_skills: string[] | null
  missing_required_skills: string[] | null
  matched_preferred_skills: string[] | null
  score_explanation: ScoreExplanation | null
  improvement_suggestions: string[] | null
  scoring_version: string
  created_at: string
}

// Application types
export type ApplicationStatus =
  | 'saved'
  | 'applied'
  | 'assessment'
  | 'interview'
  | 'offer'
  | 'selected'
  | 'rejected'
  | 'withdrawn'

export interface Application {
  id: string
  job_id: string | null
  resume_id: string | null
  job_title: string | null
  company: string | null
  status: ApplicationStatus
  applied_at: string | null
  interview_date: string | null
  notes: string | null
  recruiter_name: string | null
  recruiter_email: string | null
  application_url: string | null
  created_at: string
  updated_at: string
}

export interface ApplicationCreateInput {
  job_id?: string | null
  resume_id?: string | null
  job_title?: string | null
  company?: string | null
  status?: ApplicationStatus
  notes?: string | null
  application_url?: string | null
  recruiter_name?: string | null
  recruiter_email?: string | null
}

// Document types
export interface GeneratedDocument {
  id: string
  doc_type: string
  title: string | null
  content: string
  tone: string | null
  created_at: string
}

// Interview types
export interface InterviewSession {
  id: string
  target_role: string
  difficulty: string
  status: string
  current_question_index: number
  total_questions: number
  created_at: string
}

export interface InterviewQuestion {
  id: string
  question_text: string
  question_type: string
  question_index: number
  user_answer: string | null
  feedback: InterviewFeedback | null
  is_answered: boolean
}

export type Question = InterviewQuestion

export interface InterviewDetailResponse {
  session: InterviewSession
  questions: InterviewQuestion[]
}

export interface InterviewFeedback {
  score: number
  technical_correctness?: string
  relevance?: string
  clarity?: string
  completeness?: string
  missing_concepts?: string[]
  improved_answer?: string
  ai_configured?: boolean
}

// Analytics types
export interface AnalyticsOverview {
  total_saved: number
  total_applied: number
  total_interviews: number
  total_offers: number
  total_selected: number
  total_rejected: number
  total_resumes: number
  total_matches: number
  top_missing_skills: Array<{ skill: string; count: number }>
  applications_by_status: Array<{ status: string; count: number }>
  upcoming_interviews: Application[]
}

export interface ApplicationsOverTime {
  date: string
  count: number
}

// Resume Studio types
export interface ResumeSuggestion {
  section: string
  original: string
  suggestion: string
  reason: string
}

export interface SuggestionsResponse {
  suggestions: ResumeSuggestion[]
  missing_keywords: string[]
  summary_suggestion: string | null
  note?: string
}

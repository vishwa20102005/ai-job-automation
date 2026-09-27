import apiClient from './apiClient'
import type {
  AnalyticsOverview,
  Application,
  ApplicationsOverTime,
  GeneratedDocument,
  InterviewDetailResponse,
  InterviewQuestion,
  InterviewSession,
  Job,
  JobCreateInput,
  JobMatch,
  LoginRequest,
  PaginatedResponse,
  RegisterRequest,
  Resume,
  SuggestionsResponse,
  TokenResponse,
  User,
} from '../types'

// ========================
// AUTH
// ========================
export const authService = {
  login: (data: LoginRequest) =>
    apiClient.post<TokenResponse>('/auth/login', data).then((r) => r.data),

  register: (data: RegisterRequest) =>
    apiClient.post<TokenResponse>('/auth/register', data).then((r) => r.data),

  getMe: () => apiClient.get<User>('/auth/me').then((r) => r.data),

  refresh: (refreshToken: string) =>
    apiClient
      .post<TokenResponse>('/auth/refresh', { refresh_token: refreshToken })
      .then((r) => r.data),

  logout: () => apiClient.post('/auth/logout').then((r) => r.data),

  deleteAccount: () => apiClient.delete('/auth/me').then((r) => r.data),
}

// ========================
// RESUMES
// ========================
export const resumeService = {
  upload: (file: File, name?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (name) form.append('name', name)
    return apiClient
      .post<Resume>('/resumes/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  list: () => apiClient.get<Resume[]>('/resumes').then((r) => r.data),

  get: (id: string) => apiClient.get<Resume>(`/resumes/${id}`).then((r) => r.data),

  update: (id: string, data: Partial<Resume>) =>
    apiClient.patch<Resume>(`/resumes/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/resumes/${id}`).then((r) => r.data),

  downloadUrl: (id: string) =>
    `${apiClient.defaults.baseURL || ''}/api/v1/resumes/${id}/download`,
}

// ========================
// JOBS
// ========================
export const jobService = {
  create: (data: JobCreateInput) =>
    apiClient.post<Job>('/jobs', data).then((r) => r.data),

  list: (params?: {
    page?: number
    page_size?: number
    search?: string
    location?: string
  }) =>
    apiClient
      .get<PaginatedResponse<Job>>('/jobs', { params })
      .then((r) => r.data),

  get: (id: string) => apiClient.get<Job>(`/jobs/${id}`).then((r) => r.data),

  update: (id: string, data: Partial<Job>) =>
    apiClient.patch<Job>(`/jobs/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/jobs/${id}`).then((r) => r.data),

  importCsv: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return apiClient
      .post<{ imported: number; skipped: number }>('/jobs/import-csv', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },
}

// ========================
// MATCHES
// ========================
export const matchService = {
  create: (
    dataOrResumeId: { resume_id: string; job_id: string } | string,
    jobId?: string
  ) => {
    const payload =
      typeof dataOrResumeId === 'string'
        ? { resume_id: dataOrResumeId, job_id: jobId }
        : dataOrResumeId
    return apiClient.post<JobMatch>('/matches', payload).then((r) => r.data)
  },

  list: () => apiClient.get<JobMatch[]>('/matches').then((r) => r.data),

  get: (id: string) =>
    apiClient.get<JobMatch>(`/matches/${id}`).then((r) => r.data),
}

// ========================
// RESUME STUDIO
// ========================
export const resumeStudioService = {
  getSuggestions: (
    dataOrResumeId: { resume_id: string; job_id: string } | string,
    jobId?: string
  ) => {
    const payload =
      typeof dataOrResumeId === 'string'
        ? { resume_id: dataOrResumeId, job_id: jobId }
        : dataOrResumeId
    return apiClient
      .post<SuggestionsResponse>('/resume-studio/suggestions', payload)
      .then((r) => r.data)
  },

  rewrite: (
    dataOrResumeId:
      | {
          resume_id: string
          job_id: string
          section: string
          original_text: string
        }
      | string,
    jobId?: string,
    section?: string,
    originalText?: string
  ) => {
    const payload =
      typeof dataOrResumeId === 'string'
        ? {
            resume_id: dataOrResumeId,
            job_id: jobId,
            section,
            original_text: originalText,
          }
        : dataOrResumeId
    return apiClient
      .post<{ original: string; rewritten: string; explanation: string }>(
        '/resume-studio/rewrite',
        payload
      )
      .then((r) => r.data)
  },
}

// ========================
// COVER LETTERS
// ========================
export const coverLetterService = {
  generate: (data: {
    resume_id: string
    job_id: string
    tone?: string
    additional_details?: string
  }) =>
    apiClient
      .post<GeneratedDocument>('/cover-letters/generate', data)
      .then((r) => r.data),

  list: () =>
    apiClient
      .get<GeneratedDocument[]>('/cover-letters')
      .then((r) => r.data),

  get: (id: string) =>
    apiClient
      .get<GeneratedDocument>(`/cover-letters/${id}`)
      .then((r) => r.data),

  update: (id: string, content: string) =>
    apiClient
      .patch<GeneratedDocument>(`/cover-letters/${id}?content=${encodeURIComponent(content)}`)
      .then((r) => r.data),

  export: (id: string, format: 'pdf' | 'docx') =>
    apiClient
      .get(`/cover-letters/${id}/export`, {
        params: { format },
        responseType: 'blob',
      })
      .then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/cover-letters/${id}`).then((r) => r.data),
}

// ========================
// APPLICATIONS
// ========================
export const applicationService = {
  create: (data: Partial<Application>) =>
    apiClient.post<Application>('/applications', data).then((r) => r.data),

  list: (params?: { status?: string; company?: string }) =>
    apiClient
      .get<Application[]>('/applications', { params })
      .then((r) => r.data),

  get: (id: string) =>
    apiClient.get<Application>(`/applications/${id}`).then((r) => r.data),

  update: (id: string, data: Partial<Application>) =>
    apiClient
      .patch<Application>(`/applications/${id}`, data)
      .then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/applications/${id}`).then((r) => r.data),
}

// ========================
// INTERVIEWS
// ========================
export const interviewService = {
  create: (data: {
    target_role: string
    resume_id?: string
    job_id?: string
    difficulty?: string
    num_questions?: number
  }) =>
    apiClient
      .post<InterviewDetailResponse>('/interviews', data)
      .then((r) => r.data),

  createSession: (data: {
    target_role: string
    resume_id?: string
    job_id?: string
    difficulty?: string
    num_questions?: number
  }) =>
    apiClient
      .post<InterviewDetailResponse>('/interviews', data)
      .then((r) => r.data),

  submitAnswer: (
    sessionId: string,
    dataOrQuestionId: { question_id: string; answer: string } | string,
    answerText?: string
  ) => {
    const payload =
      typeof dataOrQuestionId === 'string'
        ? { question_id: dataOrQuestionId, answer: answerText }
        : dataOrQuestionId
    return apiClient
      .post<{ question: InterviewQuestion }>(`/interviews/${sessionId}/answer`, payload)
      .then((r) => r.data)
  },

  get: (sessionId: string) =>
    apiClient
      .get<InterviewDetailResponse>(`/interviews/${sessionId}`)
      .then((r) => r.data),

  getSession: (sessionId: string) =>
    apiClient
      .get<InterviewDetailResponse>(`/interviews/${sessionId}`)
      .then((r) => r.data),

  list: () =>
    apiClient.get<InterviewSession[]>('/interviews').then((r) => r.data),

  listSessions: () =>
    apiClient.get<InterviewSession[]>('/interviews').then((r) => r.data),
}

// ========================
// ANALYTICS
// ========================
export const analyticsService = {
  getOverview: () =>
    apiClient.get<AnalyticsOverview>('/analytics/overview').then((r) => r.data),

  getApplicationsOverTime: (days = 30) =>
    apiClient
      .get<ApplicationsOverTime[]>('/analytics/applications', {
        params: { days },
      })
      .then((r) => r.data),

  getSkillsAnalysis: () =>
    apiClient
      .get<Array<{ skill: string; count: number }>>('/analytics/skills')
      .then((r) => r.data),
}

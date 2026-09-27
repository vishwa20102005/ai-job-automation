import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Award,
  BookOpen,
  Briefcase,
  CheckCircle,
  Code,
  Download,
  FileText,
  Layers,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react'
import { resumeService } from '../../services/api'
import type { Resume } from '../../types'

export default function ResumeAnalyzerPage() {
  const queryClient = useQueryClient()
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string>('')
  const [isUploading, setIsUploading] = useState<boolean>(false)

  // Fetch all user resumes
  const { data: resumes, isLoading } = useQuery({
    queryKey: ['resumes'],
    queryFn: resumeService.list,
  })

  // Select first resume if none selected
  const activeResume =
    resumes?.find((r) => r.id === selectedResumeId) ||
    resumes?.find((r) => r.is_default) ||
    resumes?.[0]

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => resumeService.upload(file),
    onSuccess: (newResume) => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
      setSelectedResumeId(newResume.id)
      setIsUploading(false)
      setUploadError('')
    },
    onError: (err: any) => {
      setIsUploading(false)
      const msg = err?.response?.data?.detail || 'Failed to upload and parse resume'
      setUploadError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => resumeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
      setSelectedResumeId(null)
    },
  })

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validation
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'pdf' && ext !== 'docx') {
      setUploadError('Only PDF and DOCX documents are supported.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds the 5MB limit.')
      return
    }

    setUploadError('')
    setIsUploading(true)
    uploadMutation.mutate(file)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Resume Analyzer & Parser</h1>
          <p className="page-subtitle">
            Upload your resume (PDF or DOCX) to extract structured skills, experience, and profile details.
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="card p-6 border-dashed border-2 border-primary-200 dark:border-primary-900 bg-primary-50/20 dark:bg-primary-950/10">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/50 text-primary-600 mb-3">
            <Upload className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {isUploading ? 'Parsing Resume...' : 'Upload your resume'}
          </h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm">
            Supported formats: PDF or DOCX up to 5MB. All sections will be parsed automatically.
          </p>

          <label className="mt-4 cursor-pointer btn-primary">
            <span>{isUploading ? 'Extracting details...' : 'Select Document'}</span>
            <input
              type="file"
              accept=".pdf,.docx"
              disabled={isUploading}
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {uploadError && (
            <div className="mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900">
              <AlertCircle className="h-3.5 w-3.5" />
              {uploadError}
            </div>
          )}
        </div>
      </div>

      {/* Main Layout: List & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Resumes List */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Your Uploaded Resumes ({resumes?.length || 0})
          </h2>

          {isLoading && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card p-4 skeleton h-20" />
              ))}
            </div>
          )}

          {resumes?.length === 0 && (
            <div className="card p-6 text-center text-sm text-gray-500">
              No resumes uploaded yet. Upload your first resume above.
            </div>
          )}

          {resumes?.map((resume) => {
            const isSelected = activeResume?.id === resume.id
            return (
              <div
                key={resume.id}
                onClick={() => setSelectedResumeId(resume.id)}
                className={`card p-4 cursor-pointer transition-all ${
                  isSelected
                    ? 'ring-2 ring-primary-500 bg-primary-50/10 dark:bg-primary-950/20'
                    : 'hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                        {resume.name || resume.original_filename}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {resume.file_type.toUpperCase()} • {(resume.file_size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  {resume.is_default && (
                    <span className="badge-primary text-[10px]">Default</span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    Parsed {resume.skills?.length || 0} skills
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm('Delete this resume?')) {
                        deleteMutation.mutate(resume.id)
                      }
                    }}
                    className="text-gray-400 hover:text-red-600 transition-colors p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Right Column: Parsed Resume View */}
        <div className="lg:col-span-2">
          {activeResume ? (
            <div className="card p-6 space-y-6">
              {/* Header profile info */}
              <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-800 pb-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {activeResume.full_name || activeResume.name}
                  </h2>
                  <div className="mt-1 flex flex-wrap gap-4 text-xs text-gray-500">
                    {activeResume.email && <span>✉️ {activeResume.email}</span>}
                    {activeResume.phone && <span>📞 {activeResume.phone}</span>}
                    <span>📄 {activeResume.original_filename}</span>
                  </div>
                </div>

                <a
                  href={`/api/v1/resumes/${activeResume.id}/download`}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                  download
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Original
                </a>
              </div>

              {/* Summary */}
              {activeResume.professional_summary && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary-500" />
                    Professional Summary
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-100 dark:border-gray-800">
                    {activeResume.professional_summary}
                  </p>
                </div>
              )}

              {/* Skills Breakdown */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Code className="h-3.5 w-3.5 text-primary-500" />
                  Extracted Skills & Competencies
                </h3>

                <div className="space-y-3">
                  {/* Programming Languages */}
                  {activeResume.programming_languages && activeResume.programming_languages.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-gray-500 mb-1.5 block">
                        Programming Languages:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {activeResume.programming_languages.map((s) => (
                          <span key={s} className="badge-primary capitalize text-xs">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Frameworks & Libraries */}
                  {activeResume.frameworks && activeResume.frameworks.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-gray-500 mb-1.5 block">
                        Frameworks & Libraries:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {activeResume.frameworks.map((s) => (
                          <span key={s} className="badge-yellow capitalize text-xs">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cloud & DevOps */}
                  {activeResume.cloud_platforms && activeResume.cloud_platforms.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-gray-500 mb-1.5 block">
                        Cloud & Infrastructure:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {activeResume.cloud_platforms.map((s) => (
                          <span key={s} className="badge-green capitalize text-xs">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other Technical Skills */}
                  {activeResume.technical_skills && activeResume.technical_skills.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-gray-500 mb-1.5 block">
                        Other Technologies & Tools:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {activeResume.technical_skills.map((s) => (
                          <span key={s} className="badge-gray capitalize text-xs">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Education */}
              {activeResume.education && activeResume.education.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-primary-500" />
                    Education
                  </h3>
                  <div className="space-y-2">
                    {activeResume.education.map((edu: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {edu.degree || edu.raw}
                        </p>
                        {edu.institution && (
                          <p className="text-xs text-gray-500 mt-0.5">{edu.institution}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {activeResume.work_experience && activeResume.work_experience.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-primary-500" />
                    Work Experience
                  </h3>
                  <div className="space-y-2">
                    {activeResume.work_experience.map((exp: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                        {exp.raw || JSON.stringify(exp)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {activeResume.projects && activeResume.projects.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-primary-500" />
                    Projects
                  </h3>
                  <div className="space-y-2">
                    {activeResume.projects.map((proj: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                        {proj.raw || JSON.stringify(proj)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-12 text-center text-gray-400 flex flex-col items-center justify-center">
              <FileText className="h-12 w-12 text-gray-300 dark:text-gray-700 mb-3" />
              <p className="text-base font-medium text-gray-700 dark:text-gray-300">
                No Resume Selected
              </p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">
                Upload a resume or select one from the list to inspect parsed skills and data.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

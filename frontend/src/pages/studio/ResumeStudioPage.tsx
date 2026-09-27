import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowRight,
  Check,
  Copy,
  Lightbulb,
  RefreshCw,
  Rocket,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { jobService, resumeService, resumeStudioService } from '../../services/api'
import type { SuggestionsResponse } from '../../types'

export default function ResumeStudioPage() {
  const [selectedResumeId, setSelectedResumeId] = useState<string>('')
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  // Rewrite bullet state
  const [bulletText, setBulletText] = useState('')
  const [rewriteResult, setRewriteResult] = useState<{ rewritten: string; explanation: string } | null>(null)

  // Data fetching
  const { data: resumes } = useQuery({ queryKey: ['resumes'], queryFn: resumeService.list })
  const { data: jobData } = useQuery({ queryKey: ['jobs'], queryFn: () => jobService.list({ page_size: 100 }) })
  const jobs = jobData?.items || []

  // Suggestions mutation
  const suggestionsMutation = useMutation({
    mutationFn: () =>
      resumeStudioService.getSuggestions({
        resume_id: selectedResumeId,
        job_id: selectedJobId,
      }),
  })

  // Rewrite mutation
  const rewriteMutation = useMutation({
    mutationFn: () =>
      resumeStudioService.rewrite({
        resume_id: selectedResumeId,
        job_id: selectedJobId,
        section: 'bullet_point',
        original_text: bulletText,
      }),
    onSuccess: (res: any) => {
      setRewriteResult(res)
    },
  })

  const suggestionsData: SuggestionsResponse | undefined = suggestionsMutation.data

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(idx)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Resume Studio & AI Optimizer</h1>
          <p className="page-subtitle">
            Powered by Gemini 3.8 Flash to enhance your resume phrasing, keywords, and role-specific impact.
          </p>
        </div>
      </div>

      {/* Target Selector */}
      <div className="card p-6 bg-gradient-to-r from-primary-50/40 via-white to-violet-50/40 dark:from-navy-900/30 dark:via-gray-900 dark:to-navy-950/30">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary-600" />
          Select Target Context
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Your Resume</label>
            <select
              value={selectedResumeId}
              onChange={(e) => setSelectedResumeId(e.target.value)}
              className="input"
            >
              <option value="">-- Choose Resume --</option>
              {resumes?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name || r.original_filename}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Target Job Role</label>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="input"
            >
              <option value="">-- Choose Job --</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} {j.company ? `(${j.company})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            disabled={!selectedResumeId || !selectedJobId || suggestionsMutation.isPending}
            onClick={() => suggestionsMutation.mutate()}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Sparkles className="h-4 w-4" />
            {suggestionsMutation.isPending ? 'Analyzing with Gemini...' : 'Generate AI Recommendations'}
          </button>
        </div>
      </div>

      {/* Two Column Layout: Suggestions & Interactive Rewriter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Targeted Recommendations */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Targeted AI Recommendations
          </h2>

          {suggestionsMutation.isPending && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card p-4 skeleton h-28" />
              ))}
            </div>
          )}

          {suggestionsData?.note && (
            <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-950/20 text-xs text-primary-700 dark:text-primary-300 border border-primary-100 dark:border-primary-900">
              {suggestionsData.note}
            </div>
          )}

          {suggestionsData?.summary_suggestion && (
            <div className="card p-4 space-y-2 border-primary-200 dark:border-primary-900">
              <span className="badge-primary text-[10px] uppercase">Recommended Summary</span>
              <p className="text-xs text-gray-700 dark:text-gray-300 italic leading-relaxed">
                "{suggestionsData.summary_suggestion}"
              </p>
            </div>
          )}

          {suggestionsData?.suggestions?.map((sug, idx) => (
            <div key={idx} className="card p-4 space-y-2 hover:border-primary-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="badge-yellow text-[10px] uppercase capitalize">
                  {sug.section}
                </span>
                <button
                  onClick={() => handleCopy(sug.suggestion, idx)}
                  className="text-xs text-gray-400 hover:text-primary-600 flex items-center gap-1"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-500" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </>
                  )}
                </button>
              </div>

              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {sug.suggestion}
              </p>
              <p className="text-xs text-gray-500">{sug.reason}</p>
            </div>
          ))}

          {!suggestionsData && !suggestionsMutation.isPending && (
            <div className="card p-12 text-center text-gray-400 text-sm">
              Select your resume and target job above to view AI-generated optimization tips.
            </div>
          )}
        </div>

        {/* Right Column: Interactive Bullet Point Rewriter */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-violet-500" />
            AI Bullet Point & Action Verbs Rewriter
          </h2>

          <div className="card p-5 space-y-4">
            <div>
              <label className="label">Paste a bullet point or achievement from your resume:</label>
              <textarea
                rows={3}
                value={bulletText}
                onChange={(e) => setBulletText(e.target.value)}
                placeholder="e.g. Worked on an automated API service using Python and handled database connections..."
                className="input"
              />
            </div>

            <button
              disabled={!bulletText || !selectedJobId || rewriteMutation.isPending}
              onClick={() => rewriteMutation.mutate()}
              className="btn-primary text-xs w-full flex items-center justify-center gap-1.5"
            >
              <Sparkles className="h-4 w-4" />
              {rewriteMutation.isPending ? 'Optimizing with Gemini...' : 'Rewrite for Impact'}
            </button>

            {rewriteResult && (
              <div className="mt-4 p-4 rounded-xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900 space-y-3">
                <span className="badge-primary text-[10px]">Optimized Result</span>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {rewriteResult.rewritten}
                </p>
                {rewriteResult.explanation && (
                  <p className="text-xs text-violet-700 dark:text-violet-300">
                    💡 {rewriteResult.explanation}
                  </p>
                )}
                <div className="pt-1 flex justify-end">
                  <button
                    onClick={() => handleCopy(rewriteResult.rewritten, 999)}
                    className="btn-secondary text-xs flex items-center gap-1"
                  >
                    {copiedIndex === 999 ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    Copy to Clipboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

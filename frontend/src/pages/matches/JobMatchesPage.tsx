import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowRight,
  Award,
  CheckCircle,
  ChevronRight,
  Info,
  Lightbulb,
  Sparkles,
  Target,
  XCircle,
} from 'lucide-react'
import { jobService, matchService, resumeService } from '../../services/api'
import type { JobMatch } from '../../types'

export default function JobMatchesPage() {
  const queryClient = useQueryClient()
  const [selectedResumeId, setSelectedResumeId] = useState<string>('')
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const [activeMatch, setActiveMatch] = useState<JobMatch | null>(null)

  // Fetch all user resumes
  const { data: resumes } = useQuery({
    queryKey: ['resumes'],
    queryFn: resumeService.list,
  })

  // Fetch all user jobs
  const { data: jobData } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobService.list({ page_size: 100 }),
  })

  // Fetch previous matches
  const { data: matches, isLoading: matchesLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: matchService.list,
  })

  // Match mutation
  const matchMutation = useMutation({
    mutationFn: () =>
      matchService.create({
        resume_id: selectedResumeId,
        job_id: selectedJobId,
      }),
    onSuccess: (newMatch) => {
      queryClient.invalidateQueries({ queryKey: ['matches'] })
      setActiveMatch(newMatch)
    },
  })

  const currentMatch = activeMatch || matches?.[0]
  const jobs = jobData?.items || []

  // Helper score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-500 dark:text-red-400'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Job Match & Alignment Engine</h1>
          <p className="page-subtitle">
            Evaluate your resume against target job requirements using our 4-component hybrid algorithm.
          </p>
        </div>
      </div>

      {/* Match Trigger Selector Card */}
      <div className="card p-6 bg-gradient-to-r from-primary-50/50 via-white to-violet-50/50 dark:from-navy-900/40 dark:via-gray-900 dark:to-navy-950/40 border-primary-200/60 dark:border-primary-900/60">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary-600" />
          Run New Compatibility Analysis
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Select Resume</label>
            <select
              value={selectedResumeId}
              onChange={(e) => setSelectedResumeId(e.target.value)}
              className="input"
            >
              <option value="">-- Choose a resume --</option>
              {resumes?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name || r.original_filename} ({r.skills?.length || 0} skills)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Select Job Listing</label>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="input"
            >
              <option value="">-- Choose a job position --</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} {j.company ? `at ${j.company}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Formula: Required Skills (40%) + Semantic Sim (30%) + Projects (20%) + Preferred Skills (10%)
          </p>

          <button
            disabled={!selectedResumeId || !selectedJobId || matchMutation.isPending}
            onClick={() => matchMutation.mutate()}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Target className="h-4 w-4" />
            {matchMutation.isPending ? 'Calculating...' : 'Compute Match Score'}
          </button>
        </div>
      </div>

      {/* Main Analysis Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: History */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Analysis History ({matches?.length || 0})
          </h2>

          {matchesLoading && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card p-4 skeleton h-20" />
              ))}
            </div>
          )}

          {matches?.length === 0 && (
            <div className="card p-6 text-center text-sm text-gray-500">
              No match runs recorded yet. Select a resume and job above to run your first match.
            </div>
          )}

          {matches?.map((m) => {
            const isSelected = currentMatch?.id === m.id
            const matchedJob = jobs.find((j) => j.id === m.job_id)
            return (
              <div
                key={m.id}
                onClick={() => setActiveMatch(m)}
                className={`card p-4 cursor-pointer transition-all ${
                  isSelected
                    ? 'ring-2 ring-primary-500 bg-primary-50/10 dark:bg-primary-950/20'
                    : 'hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1">
                      {matchedJob?.title || 'Job Alignment'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {matchedJob?.company || 'Company'}
                    </p>
                  </div>
                  <span className={`text-lg font-black ${getScoreColor(m.overall_score)}`}>
                    {Math.round(m.overall_score)}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Right: Detailed Match Breakdown */}
        <div className="lg:col-span-2">
          {currentMatch ? (
            <div className="card p-6 space-y-6">
              {/* Overall Score Banner */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                <div>
                  <span className="badge-primary text-xs uppercase tracking-wider mb-1 block">
                    Version {currentMatch.scoring_version}
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Match Compatibility
                  </h2>
                  <p className="text-xs text-gray-500 max-w-sm mt-1">
                    Normalized weighted evaluation of technical requirements, vocabulary similarity, and demonstrated projects.
                  </p>
                </div>

                <div className="flex flex-col items-center">
                  <div className="text-5xl font-extrabold tracking-tight flex items-baseline gap-1">
                    <span className={getScoreColor(currentMatch.overall_score)}>
                      {Math.round(currentMatch.overall_score)}
                    </span>
                    <span className="text-lg text-gray-400 font-normal">/ 100</span>
                  </div>
                  <span className="text-[11px] text-gray-400 mt-1">
                    Overall Match Score
                  </span>
                </div>
              </div>

              {/* Component breakdown bars */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  Component Score Breakdown
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Required Skills (40%) */}
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between text-xs font-medium mb-1.5">
                      <span className="text-gray-700 dark:text-gray-300">Required Skills (40% weight)</span>
                      <span className="font-bold">{Math.round(currentMatch.required_skills_score ?? 0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-2 rounded-full bg-primary-600"
                        style={{ width: `${currentMatch.required_skills_score ?? 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Semantic Similarity (30%) */}
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between text-xs font-medium mb-1.5">
                      <span className="text-gray-700 dark:text-gray-300">Semantic Similarity (30% weight)</span>
                      <span className="font-bold">{Math.round(currentMatch.semantic_score ?? 0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-2 rounded-full bg-indigo-500"
                        style={{ width: `${currentMatch.semantic_score ?? 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Projects & Experience (20%) */}
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between text-xs font-medium mb-1.5">
                      <span className="text-gray-700 dark:text-gray-300">Projects Relevance (20% weight)</span>
                      <span className="font-bold">{Math.round(currentMatch.projects_score ?? 0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-2 rounded-full bg-violet-500"
                        style={{ width: `${currentMatch.projects_score ?? 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Preferred Skills (10%) */}
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between text-xs font-medium mb-1.5">
                      <span className="text-gray-700 dark:text-gray-300">Preferred Skills (10% weight)</span>
                      <span className="font-bold">{Math.round(currentMatch.preferred_skills_score ?? 0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-2 rounded-full bg-purple-500"
                        style={{ width: `${currentMatch.preferred_skills_score ?? 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills matched vs missing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Matched skills */}
                <div className="p-4 rounded-xl border border-green-200 dark:border-green-900/40 bg-green-50/30 dark:bg-green-950/10">
                  <h4 className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4" />
                    Matched Skills ({currentMatch.matched_required_skills?.length || 0})
                  </h4>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {currentMatch.matched_required_skills?.map((s) => (
                      <span key={s} className="badge-green capitalize text-xs">
                        {s}
                      </span>
                    ))}
                    {(!currentMatch.matched_required_skills || currentMatch.matched_required_skills.length === 0) && (
                      <span className="text-xs text-gray-400">None matched</span>
                    )}
                  </div>
                </div>

                {/* Missing skills */}
                <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/10">
                  <h4 className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <XCircle className="h-4 w-4" />
                    Missing Required Skills ({currentMatch.missing_required_skills?.length || 0})
                  </h4>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {currentMatch.missing_required_skills?.map((s) => (
                      <span key={s} className="badge-red capitalize text-xs">
                        {s}
                      </span>
                    ))}
                    {(!currentMatch.missing_required_skills || currentMatch.missing_required_skills.length === 0) && (
                      <span className="text-xs text-gray-400">All required skills present!</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Suggestions */}
              {currentMatch.improvement_suggestions && currentMatch.improvement_suggestions.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                    Targeted Improvement Suggestions
                  </h3>
                  <div className="space-y-2">
                    {currentMatch.improvement_suggestions.map((sug, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2"
                      >
                        <ChevronRight className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>{sug}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Legal Disclaimer notice */}
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 text-[11px] text-gray-400 flex items-start gap-2">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  The compatibility score represents automated resume-job keyword and semantic alignment. It is designed as a career preparation tool and does not guarantee employer interview or hiring outcomes.
                </span>
              </div>
            </div>
          ) : (
            <div className="card p-12 text-center text-gray-400 flex flex-col items-center justify-center">
              <Target className="h-12 w-12 text-gray-300 dark:text-gray-700 mb-3" />
              <p className="text-base font-medium text-gray-700 dark:text-gray-300">
                No Match Selected
              </p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">
                Select an existing analysis from the left, or pick a resume and job position above to run a new evaluation.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

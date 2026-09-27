import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Briefcase,
  Building,
  Check,
  FileSpreadsheet,
  Filter,
  MapPin,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'
import { jobService } from '../../services/api'
import type { Job, JobCreateInput } from '../../types'

export default function FindJobsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [csvStatus, setCsvStatus] = useState<string>('')

  // Form state
  const [formData, setFormData] = useState<JobCreateInput>({
    title: '',
    company: '',
    location: '',
    description: '',
    required_skills: [],
    preferred_skills: [],
    employment_type: 'Full-time',
  })
  const [skillInput, setSkillInput] = useState('')

  // Fetch jobs
  const { data: jobData, isLoading } = useQuery({
    queryKey: ['jobs', search],
    queryFn: () => jobService.list({ search: search || undefined }),
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (newJob: JobCreateInput) => jobService.create(newJob),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      setIsModalOpen(false)
      setSelectedJob(saved)
      setFormData({
        title: '',
        company: '',
        location: '',
        description: '',
        required_skills: [],
        preferred_skills: [],
        employment_type: 'Full-time',
      })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => jobService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      setSelectedJob(null)
    },
  })

  // CSV Import mutation
  const csvMutation = useMutation({
    mutationFn: (file: File) => jobService.importCsv(file),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      setCsvStatus(`Successfully imported ${res.imported} job(s)!`)
      setTimeout(() => setCsvStatus(''), 4000)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || 'CSV Import failed'
      setCsvStatus(`Error: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`)
    },
  })

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvStatus('Importing CSV...')
    csvMutation.mutate(file)
  }

  const addSkill = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault()
      if (!formData.required_skills?.includes(skillInput.trim().toLowerCase())) {
        setFormData({
          ...formData,
          required_skills: [...(formData.required_skills || []), skillInput.trim().toLowerCase()],
        })
      }
      setSkillInput('')
    }
  }

  const removeSkill = (skill: string) => {
    setFormData({
      ...formData,
      required_skills: formData.required_skills?.filter((s) => s !== skill),
    })
  }

  const activeJob = selectedJob || jobData?.items?.[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Job Directory & Listings</h1>
          <p className="page-subtitle">
            Manage your targeted job listings, parse job requirements, or bulk-import via CSV.
          </p>
        </div>
        <div className="flex gap-3">
          <label className="btn-secondary text-xs flex items-center gap-1.5 cursor-pointer">
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
            <span>Import CSV</span>
            <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
          </label>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary text-xs">
            <Plus className="h-4 w-4" />
            Add Job Listing
          </button>
        </div>
      </div>

      {/* CSV Status Message */}
      {csvStatus && (
        <div className="card p-3 text-xs bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-900 flex items-center gap-2">
          <Check className="h-4 w-4" />
          {csvStatus}
        </div>
      )}

      {/* Search Bar */}
      <div className="card p-3 flex items-center gap-3">
        <Search className="h-4 w-4 text-gray-400 ml-2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search job title or company..."
          className="flex-1 bg-transparent text-sm focus:outline-none dark:text-white"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-xs text-gray-400 hover:text-gray-600">
            Clear
          </button>
        )}
      </div>

      {/* Split view: List & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Job Cards */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Jobs Available ({jobData?.total || 0})
          </h2>

          {isLoading && (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card p-4 skeleton h-24" />
              ))}
            </div>
          )}

          {jobData?.items?.length === 0 && (
            <div className="card p-8 text-center text-sm text-gray-500">
              No jobs found. Add a new listing or import a CSV file to begin.
            </div>
          )}

          {jobData?.items?.map((job) => {
            const isSelected = activeJob?.id === job.id
            return (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className={`card p-4 cursor-pointer transition-all ${
                  isSelected
                    ? 'ring-2 ring-primary-500 bg-primary-50/10 dark:bg-primary-950/20'
                    : 'hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {job.title}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {job.company || 'Company not specified'}
                    </p>
                  </div>
                  <span className="badge-gray text-[10px] capitalize">
                    {job.source || 'manual'}
                  </span>
                </div>

                {job.location && (
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {job.location}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-2 text-xs text-gray-400">
                  <span>{job.required_skills?.length || 0} skills listed</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm('Delete this job listing?')) {
                        deleteMutation.mutate(job.id)
                      }
                    }}
                    className="hover:text-red-500 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Right Column: Active Job Details */}
        <div className="lg:col-span-2">
          {activeJob ? (
            <div className="card p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-800 pb-5">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {activeJob.title}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
                    {activeJob.company && (
                      <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300">
                        <Building className="h-3.5 w-3.5" /> {activeJob.company}
                      </span>
                    )}
                    {activeJob.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {activeJob.location}
                      </span>
                    )}
                    {activeJob.employment_type && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5" /> {activeJob.employment_type}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <a
                    href={`/job-matches?job_id=${activeJob.id}`}
                    className="btn-primary text-xs"
                  >
                    Run Match Analysis →
                  </a>
                </div>
              </div>

              {/* Skills required */}
              {activeJob.required_skills && activeJob.required_skills.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Key Required Skills
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {activeJob.required_skills.map((s) => (
                      <span key={s} className="badge-primary text-xs capitalize">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Job Description
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-lg border border-gray-100 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {activeJob.description}
                </div>
              </div>

              {activeJob.job_url && (
                <div className="pt-2">
                  <a
                    href={activeJob.job_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary-600 hover:underline"
                  >
                    View Original Job Posting ↗
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-12 text-center text-gray-400 flex flex-col items-center justify-center">
              <Briefcase className="h-12 w-12 text-gray-300 dark:text-gray-700 mb-3" />
              <p className="text-base font-medium text-gray-700 dark:text-gray-300">
                No Job Selected
              </p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">
                Select a job from the list or add a new one to view details and requirements.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Job Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Add Job Listing
            </h2>

            <div>
              <label className="label">Job Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Python Developer"
                className="input"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Company</label>
                <input
                  type="text"
                  value={formData.company || ''}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="e.g. Google"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Location</label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Remote / Bangalore"
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="label">Required Skills (press Enter to add)</label>
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={addSkill}
                placeholder="e.g. Python, FastAPI, Docker"
                className="input"
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.required_skills?.map((s) => (
                  <span
                    key={s}
                    onClick={() => removeSkill(s)}
                    className="badge-primary text-xs cursor-pointer hover:bg-red-100 hover:text-red-700 transition-colors"
                  >
                    {s} ✕
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Job Description *</label>
              <textarea
                rows={5}
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Paste the full job description here..."
                className="input"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!formData.title || !formData.description || createMutation.isPending}
                onClick={() => createMutation.mutate(formData)}
                className="btn-primary text-xs"
              >
                {createMutation.isPending ? 'Saving...' : 'Save Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

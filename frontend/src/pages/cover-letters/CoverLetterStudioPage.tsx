import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  Copy,
  Download,
  FileDown,
  FileText,
  Mail,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { coverLetterService, jobService, resumeService } from '../../services/api'
import type { GeneratedDocument } from '../../types'

export default function CoverLetterStudioPage() {
  const queryClient = useQueryClient()
  const [selectedResumeId, setSelectedResumeId] = useState<string>('')
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const [tone, setTone] = useState<string>('formal')
  const [additionalNotes, setAdditionalNotes] = useState<string>('')
  const [activeDoc, setActiveDoc] = useState<GeneratedDocument | null>(null)
  const [editableContent, setEditableContent] = useState<string>('')
  const [copied, setCopied] = useState<boolean>(false)

  // Fetch resumes, jobs, and existing cover letters
  const { data: resumes } = useQuery({ queryKey: ['resumes'], queryFn: resumeService.list })
  const { data: jobData } = useQuery({ queryKey: ['jobs'], queryFn: () => jobService.list({ page_size: 100 }) })
  const { data: documents, isLoading } = useQuery({
    queryKey: ['cover-letters'],
    queryFn: coverLetterService.list,
  })

  const jobs = jobData?.items || []

  // Generate mutation
  const generateMutation = useMutation({
    mutationFn: () =>
      coverLetterService.generate({
        resume_id: selectedResumeId,
        job_id: selectedJobId,
        tone,
        additional_details: additionalNotes || undefined,
      }),
    onSuccess: (newDoc) => {
      queryClient.invalidateQueries({ queryKey: ['cover-letters'] })
      setActiveDoc(newDoc)
      setEditableContent(newDoc.content)
    },
  })

  // Update content mutation
  const updateMutation = useMutation({
    mutationFn: () => {
      if (!activeDoc) return Promise.reject()
      return coverLetterService.update(activeDoc.id, editableContent)
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['cover-letters'] })
      setActiveDoc(updated)
      alert('Cover letter saved!')
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => coverLetterService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cover-letters'] })
      setActiveDoc(null)
      setEditableContent('')
    },
  })

  const handleSelectDoc = (doc: GeneratedDocument) => {
    setActiveDoc(doc)
    setEditableContent(doc.content)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(editableContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const currentDisplayDoc = activeDoc || documents?.[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Cover Letter Studio</h1>
          <p className="page-subtitle">
            Generate tailored, ATS-compliant cover letters powered by Gemini 3.8 Flash and export to PDF or DOCX.
          </p>
        </div>
      </div>

      {/* Generation Config Card */}
      <div className="card p-6 bg-gradient-to-r from-primary-50/40 via-white to-violet-50/40 dark:from-navy-900/30 dark:via-gray-900 dark:to-navy-950/30">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary-600" />
          Create New Cover Letter
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Select Resume</label>
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
            <label className="label">Target Job</label>
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

          <div>
            <label className="label">Writing Tone</label>
            <select value={tone} onChange={(e) => setTone(e.target.value)} className="input">
              <option value="formal">Formal & Corporate</option>
              <option value="concise">Concise (under 250 words)</option>
              <option value="friendly_professional">Friendly & Professional</option>
            </select>
          </div>
        </div>

        <div className="mt-3">
          <label className="label">Additional context or custom highlight (optional)</label>
          <input
            type="text"
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="e.g. Highlight my graduation project in computer vision..."
            className="input text-xs"
          />
        </div>

        <div className="mt-4 flex justify-end">
          <button
            disabled={!selectedResumeId || !selectedJobId || generateMutation.isPending}
            onClick={() => generateMutation.mutate()}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Sparkles className="h-4 w-4" />
            {generateMutation.isPending ? 'Writing with Gemini 3.8 Flash...' : 'Generate Letter'}
          </button>
        </div>
      </div>

      {/* Two Column Split: Saved Letters & Active Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Saved Documents */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Your Cover Letters ({documents?.length || 0})
          </h2>

          {isLoading && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card p-4 skeleton h-20" />
              ))}
            </div>
          )}

          {documents?.length === 0 && (
            <div className="card p-6 text-center text-sm text-gray-500">
              No cover letters generated yet. Choose your resume and target job above to draft one.
            </div>
          )}

          {documents?.map((doc) => {
            const isSelected = (activeDoc?.id || currentDisplayDoc?.id) === doc.id
            return (
              <div
                key={doc.id}
                onClick={() => handleSelectDoc(doc)}
                className={`card p-4 cursor-pointer transition-all ${
                  isSelected
                    ? 'ring-2 ring-primary-500 bg-primary-50/10 dark:bg-primary-950/20'
                    : 'hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <FileText className="h-5 w-5 text-primary-600 shrink-0" />
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 line-clamp-1">
                        {doc.title || 'Cover Letter'}
                      </h3>
                      <p className="text-[11px] text-gray-400 capitalize mt-0.5">
                        Tone: {doc.tone || 'Formal'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm('Delete this letter?')) {
                        deleteMutation.mutate(doc.id)
                      }
                    }}
                    className="text-gray-400 hover:text-red-500 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Right: Live Editor & Export Tools */}
        <div className="lg:col-span-2">
          {currentDisplayDoc ? (
            <div className="card p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  {currentDisplayDoc.title || 'Cover Letter Editor'}
                </h3>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="btn-secondary text-xs flex items-center gap-1"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>

                  <a
                    href={`/api/v1/cover-letters/${currentDisplayDoc.id}/export?format=pdf`}
                    download
                    className="btn-secondary text-xs flex items-center gap-1"
                  >
                    <FileDown className="h-3.5 w-3.5 text-red-500" />
                    PDF
                  </a>

                  <a
                    href={`/api/v1/cover-letters/${currentDisplayDoc.id}/export?format=docx`}
                    download
                    className="btn-secondary text-xs flex items-center gap-1"
                  >
                    <Download className="h-3.5 w-3.5 text-blue-500" />
                    DOCX
                  </a>

                  <button
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate()}
                    className="btn-primary text-xs flex items-center gap-1"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save Changes
                  </button>
                </div>
              </div>

              {/* Editable Text Area */}
              <textarea
                rows={16}
                value={editableContent || currentDisplayDoc.content}
                onChange={(e) => setEditableContent(e.target.value)}
                className="input font-mono text-xs leading-relaxed p-4"
              />
            </div>
          ) : (
            <div className="card p-12 text-center text-gray-400 flex flex-col items-center justify-center">
              <Mail className="h-12 w-12 text-gray-300 dark:text-gray-700 mb-3" />
              <p className="text-base font-medium text-gray-700 dark:text-gray-300">
                No Letter Selected
              </p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">
                Select an existing cover letter from the list or generate a new tailored draft above.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

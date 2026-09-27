import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Briefcase,
  Building,
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  Kanban,
  List,
  MoreVertical,
  Plus,
  Trash2,
  User,
} from 'lucide-react'
import { applicationService, jobService, resumeService } from '../../services/api'
import type { Application, ApplicationCreateInput } from '../../types'

const COLUMNS: { id: string; label: string; color: string }[] = [
  { id: 'saved', label: 'Saved', color: 'border-t-gray-400' },
  { id: 'applied', label: 'Applied', color: 'border-t-primary-500' },
  { id: 'assessment', label: 'Assessment', color: 'border-t-amber-400' },
  { id: 'interview', label: 'Interview', color: 'border-t-yellow-500' },
  { id: 'offer', label: 'Offer', color: 'border-t-emerald-500' },
  { id: 'selected', label: 'Selected', color: 'border-t-green-600' },
  { id: 'rejected', label: 'Rejected', color: 'border-t-red-500' },
]

export default function ApplicationsPage() {
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newApp, setNewApp] = useState<ApplicationCreateInput>({
    job_title: '',
    company: '',
    status: 'saved',
    notes: '',
  })

  // Queries
  const { data: applications, isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: () => applicationService.list(),
  })
  const { data: jobData } = useQuery({ queryKey: ['jobs'], queryFn: () => jobService.list({ page_size: 100 }) })
  const { data: resumes } = useQuery({ queryKey: ['resumes'], queryFn: resumeService.list })
  const jobs = jobData?.items || []

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: ApplicationCreateInput) => applicationService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      setIsModalOpen(false)
      setNewApp({ job_title: '', company: '', status: 'saved', notes: '' })
    },
  })

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: any }) =>
      applicationService.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => applicationService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Application Tracker</h1>
          <p className="page-subtitle">
            Manage your full application pipeline from discovery through offer.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-800">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded text-xs flex items-center gap-1 font-medium ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded text-xs flex items-center gap-1 font-medium ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Table
            </button>
          </div>

          <button onClick={() => setIsModalOpen(true)} className="btn-primary text-xs">
            <Plus className="h-4 w-4" />
            Add Application
          </button>
        </div>
      </div>

      {/* Kanban Board View */}
      {viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[500px]">
          {COLUMNS.map((col) => {
            const colApps = applications?.filter((a) => a.status === col.id) || []
            return (
              <div
                key={col.id}
                className={`w-72 shrink-0 rounded-xl bg-gray-100/70 dark:bg-gray-900/60 p-3 border-t-4 ${col.color} border border-gray-200 dark:border-gray-800`}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {col.label}
                  </span>
                  <span className="h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-800 text-[11px] font-bold text-gray-600 dark:text-gray-400 flex items-center justify-center">
                    {colApps.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {colApps.map((app) => (
                    <div
                      key={app.id}
                      className="card p-3.5 space-y-2 shadow-sm hover:shadow transition-shadow group"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">
                            {app.job_title}
                          </h4>
                          <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <Building className="h-3 w-3" />
                            {app.company || 'Not specified'}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm('Delete this application?')) deleteMutation.mutate(app.id)
                          }}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-0.5"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>

                      {app.interview_date && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium bg-amber-50 dark:bg-amber-950/30 p-1.5 rounded">
                          <Calendar className="h-3 w-3" />
                          Interview: {new Date(app.interview_date).toLocaleDateString()}
                        </p>
                      )}

                      {app.notes && (
                        <p className="text-[11px] text-gray-400 line-clamp-2 italic">
                          "{app.notes}"
                        </p>
                      )}

                      {/* Quick Move Status Dropdown */}
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <select
                          value={app.status}
                          onChange={(e) =>
                            updateStatusMutation.mutate({ id: app.id, status: e.target.value })
                          }
                          className="text-[10px] bg-transparent font-medium text-primary-600 dark:text-primary-400 cursor-pointer focus:outline-none"
                        >
                          {COLUMNS.map((c) => (
                            <option key={c.id} value={c.id}>
                              Move to: {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}

                  {colApps.length === 0 && (
                    <div className="py-6 text-center text-[11px] text-gray-400 border border-dashed border-gray-300 dark:border-gray-800 rounded-lg">
                      Empty
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Job Title</th>
                <th className="p-3.5">Company</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Applied Date</th>
                <th className="p-3.5">Interview Date</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {applications?.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                  <td className="p-3.5 font-bold text-gray-900 dark:text-gray-100">
                    {app.job_title}
                  </td>
                  <td className="p-3.5 text-gray-600 dark:text-gray-300">
                    {app.company || '—'}
                  </td>
                  <td className="p-3.5">
                    <span className="badge-primary capitalize text-[10px]">
                      {app.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-gray-500">
                    {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="p-3.5 text-gray-500">
                    {app.interview_date ? new Date(app.interview_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => {
                        if (confirm('Delete application?')) deleteMutation.mutate(app.id)
                      }}
                      className="text-gray-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Application Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Add Job Application
            </h2>

            <div>
              <label className="label">Link to Existing Job (optional)</label>
              <select
                onChange={(e) => {
                  const j = jobs.find((item) => item.id === e.target.value)
                  if (j) {
                    setNewApp({
                      ...newApp,
                      job_id: j.id,
                      job_title: j.title,
                      company: j.company || '',
                    })
                  }
                }}
                className="input"
              >
                <option value="">-- Or enter manually below --</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} ({j.company || 'Company'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Job Title *</label>
              <input
                type="text"
                required
                value={newApp.job_title || ''}
                onChange={(e) => setNewApp({ ...newApp, job_title: e.target.value })}
                placeholder="e.g. AI Engineer"
                className="input"
              />
            </div>

            <div>
              <label className="label">Company Name</label>
              <input
                type="text"
                value={newApp.company || ''}
                onChange={(e) => setNewApp({ ...newApp, company: e.target.value })}
                placeholder="e.g. Microsoft"
                className="input"
              />
            </div>

            <div>
              <label className="label">Status</label>
              <select
                value={newApp.status}
                onChange={(e) => setNewApp({ ...newApp, status: e.target.value as any })}
                className="input"
              >
                {COLUMNS.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Notes / Recruiter details</label>
              <textarea
                rows={2}
                value={newApp.notes || ''}
                onChange={(e) => setNewApp({ ...newApp, notes: e.target.value })}
                placeholder="e.g. Recruiter reached out on LinkedIn..."
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
                disabled={!newApp.job_title || createMutation.isPending}
                onClick={() => createMutation.mutate(newApp)}
                className="btn-primary text-xs"
              >
                {createMutation.isPending ? 'Saving...' : 'Track Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  Target,
  TrendingUp,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { analyticsService } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  link,
}: {
  label: string
  value: number | string
  icon: any
  color: string
  link?: string
}) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
      {link && (
        <Link
          to={link}
          className="mt-4 flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="card p-6">
      <div className="skeleton h-4 w-24 mb-3" />
      <div className="skeleton h-8 w-16" />
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()

  const { data: overview, isLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: analyticsService.getOverview,
  })

  const statusBadgeColors: Record<string, string> = {
    saved: 'badge-gray',
    applied: 'badge-primary',
    assessment: 'badge-yellow',
    interview: 'badge-yellow',
    offer: 'badge-green',
    selected: 'badge-green',
    rejected: 'badge-red',
    withdrawn: 'badge-gray',
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Welcome back, {user?.full_name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="page-subtitle">Here's your job search overview</p>
        </div>
        <div className="flex gap-3">
          <Link to="/resume-analyzer" className="btn-primary">
            <FileText className="h-4 w-4" />
            Upload Resume
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Applied"
            value={overview?.total_applied ?? 0}
            icon={Briefcase}
            color="bg-primary-600"
            link="/applications"
          />
          <StatCard
            label="Interviews"
            value={overview?.total_interviews ?? 0}
            icon={GraduationCap}
            color="bg-amber-500"
            link="/applications?status=interview"
          />
          <StatCard
            label="Offers"
            value={overview?.total_offers ?? 0}
            icon={CheckCircle2}
            color="bg-green-500"
            link="/applications?status=offer"
          />
          <StatCard
            label="Match Analyses"
            value={overview?.total_matches ?? 0}
            icon={Target}
            color="bg-violet-600"
            link="/job-matches"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Application Status Breakdown */}
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Applications by Status
            </h2>
            <Link to="/analytics" className="text-xs text-primary-600 hover:underline dark:text-primary-400">
              Full analytics →
            </Link>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-5 w-full" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {(overview?.applications_by_status || [])
                .filter((s: any) => s.count > 0)
                .map((s: any) => (
                  <div key={s.status} className="flex items-center justify-between">
                    <span className={`badge badge-${statusBadgeColors[s.status]?.split('-')[1] || 'gray'} capitalize`}>
                      {s.status}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-32 rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className="h-2 rounded-full bg-primary-500"
                          style={{
                            width: `${Math.min(100, (s.count / Math.max(1, overview?.total_applied || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {s.count}
                      </span>
                    </div>
                  </div>
                ))}
              {!overview?.applications_by_status?.some((s: any) => s.count > 0) && (
                <p className="text-sm text-gray-500 py-4 text-center">
                  No applications yet.{' '}
                  <Link to="/applications" className="text-primary-600 hover:underline">
                    Add your first →
                  </Link>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Top Missing Skills */}
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Top Skills to Develop
            </h2>
            <Link to="/job-matches" className="text-xs text-primary-600 hover:underline dark:text-primary-400">
              View matches →
            </Link>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-5 w-full" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {(overview?.top_missing_skills || []).slice(0, 8).map((s: any) => (
                <div key={s.skill} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {s.skill}
                  </span>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    missing in {s.count} job{s.count !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
              {(!overview?.top_missing_skills || overview.top_missing_skills.length === 0) && (
                <p className="text-sm text-gray-500 py-4 text-center">
                  Run job matches to see skill gaps.{' '}
                  <Link to="/job-matches" className="text-primary-600 hover:underline">
                    Match now →
                  </Link>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Upcoming Interviews */}
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Upcoming Interviews
            </h2>
            <Link to="/applications" className="text-xs text-primary-600 hover:underline dark:text-primary-400">
              View all →
            </Link>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-12 w-full rounded" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {(overview?.upcoming_interviews || []).map((a: any) => (
                <div key={a.id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 dark:border-gray-700">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {a.job_title}
                    </p>
                    <p className="text-xs text-gray-500">{a.company}</p>
                    {a.interview_date && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        {new Date(a.interview_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {(!overview?.upcoming_interviews || overview.upcoming_interviews.length === 0) && (
                <p className="text-sm text-gray-500 py-4 text-center">No upcoming interviews scheduled.</p>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
            Quick Actions
          </h2>
          <div className="grid gap-3">
            {[
              { to: '/resume-analyzer', icon: FileText, label: 'Upload & Analyze Resume', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
              { to: '/find-jobs', icon: Target, label: 'Add New Job Listing', color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' },
              { to: '/applications', icon: Briefcase, label: 'Track Application', color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400' },
              { to: '/interview-coach', icon: GraduationCap, label: 'Practice Interview', color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' },
            ].map(({ to, icon: Icon, label, color }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 hover:border-primary-200 hover:bg-gray-50 transition-all dark:border-gray-700 dark:hover:border-primary-700 dark:hover:bg-gray-800"
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
                <ArrowRight className="ml-auto h-4 w-4 text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

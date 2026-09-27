import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart3, PieChart as PieIcon, TrendingUp } from 'lucide-react'
import { analyticsService } from '../../services/api'

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444']

export default function AnalyticsPage() {
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: analyticsService.getOverview,
  })

  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ['analytics', 'applications'],
    queryFn: () => analyticsService.getApplicationsOverTime(30),
  })

  const { data: skillGaps, isLoading: skillsLoading } = useQuery({
    queryKey: ['analytics', 'skills'],
    queryFn: analyticsService.getSkillsAnalysis,
  })

  const statusData = (overview?.applications_by_status || []).filter((s: any) => s.count > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics & Pipeline Metrics</h1>
          <p className="page-subtitle">
            Real data aggregated from your saved jobs, application status changes, and match histories.
          </p>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="text-xs text-gray-500">Total Applications</p>
          <p className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mt-1">
            {overview?.total_applied ?? 0}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-gray-500">Interviews Scheduled</p>
          <p className="text-3xl font-extrabold text-amber-500 mt-1">
            {overview?.total_interviews ?? 0}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-gray-500">Offers Received</p>
          <p className="text-3xl font-extrabold text-green-500 mt-1">
            {overview?.total_offers ?? 0}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-gray-500">Matches Calculated</p>
          <p className="text-3xl font-extrabold text-primary-600 mt-1">
            {overview?.total_matches ?? 0}
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline Chart */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary-500" />
              Application Velocity (Last 30 Days)
            </h2>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData || []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Application Status Distribution */}
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <PieIcon className="h-4 w-4 text-violet-500" />
            Applications by Pipeline Stage
          </h2>

          <div className="h-64 w-full flex items-center justify-center">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry: any) => `${entry.status}: ${entry.count}`}
                  >
                    {statusData.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-gray-400">No application data yet to display</p>
            )}
          </div>
        </div>

        {/* Skill Gap Analysis Bar Chart */}
        <div className="card p-6 space-y-4 lg:col-span-2">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-amber-500" />
            Top Skill Gaps across Target Jobs
          </h2>
          <p className="text-xs text-gray-500">
            Skills frequently listed in your target jobs that are missing in your uploaded resume.
          </p>

          <div className="h-64 w-full">
            {(skillGaps || []).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(skillGaps || []).slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="skill" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" fill="#ec4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                Run compatibility matches on your jobs to see skill gap analytics here.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

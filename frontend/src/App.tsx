import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import DashboardLayout from './layouts/DashboardLayout'

// Pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import ResumeAnalyzerPage from './pages/resumes/ResumeAnalyzerPage'
import JobMatchesPage from './pages/matches/JobMatchesPage'
import FindJobsPage from './pages/jobs/FindJobsPage'
import ResumeStudioPage from './pages/studio/ResumeStudioPage'
import CoverLetterStudioPage from './pages/cover-letters/CoverLetterStudioPage'
import ApplicationsPage from './pages/applications/ApplicationsPage'
import InterviewCoachPage from './pages/interviews/InterviewCoachPage'
import AnalyticsPage from './pages/analytics/AnalyticsPage'
import SettingsPage from './pages/settings/SettingsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected app routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/resume-analyzer" element={<ResumeAnalyzerPage />} />
        <Route path="/job-matches" element={<JobMatchesPage />} />
        <Route path="/find-jobs" element={<FindJobsPage />} />
        <Route path="/resume-studio" element={<ResumeStudioPage />} />
        <Route path="/cover-letter-studio" element={<CoverLetterStudioPage />} />
        <Route path="/applications" element={<ApplicationsPage />} />
        <Route path="/interview-coach" element={<InterviewCoachPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

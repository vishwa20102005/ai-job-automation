import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageSquare,
  Moon,
  Rocket,
  Search,
  Settings,
  Sun,
  Target,
  User,
  X,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/resume-analyzer', icon: FileText, label: 'Resume Analyzer' },
  { to: '/job-matches', icon: Target, label: 'Job Matches' },
  { to: '/find-jobs', icon: Search, label: 'Find Jobs' },
  { to: '/resume-studio', icon: Rocket, label: 'Resume Studio' },
  { to: '/cover-letter-studio', icon: Mail, label: 'Cover Letter Studio' },
  { to: '/applications', icon: Briefcase, label: 'Application Tracker' },
  { to: '/interview-coach', icon: GraduationCap, label: 'Interview Coach' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300
          bg-gradient-to-b from-navy-900 to-navy-950
          lg:static lg:z-auto
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarOpen ? 'w-64' : 'w-16'}
        `}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-white/10">
          {sidebarOpen && (
            <Link to="/dashboard" className="flex items-center gap-2 text-white">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500">
                <Rocket className="h-4 w-4" />
              </div>
              <span className="font-bold text-sm">CareerPilot AI</span>
            </Link>
          )}
          {!sidebarOpen && (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500">
              <Rocket className="h-4 w-4 text-white" />
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex h-6 w-6 items-center justify-center rounded text-white/60 hover:text-white"
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-white/60 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all
                ${isActive
                  ? 'bg-white/15 text-white'
                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
                }
                ${!sidebarOpen ? 'justify-center' : ''}`
              }
              title={!sidebarOpen ? label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-white/10 p-3">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white text-xs font-bold">
                {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-white">{user?.full_name}</p>
                <p className="truncate text-xs text-gray-400">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="text-gray-400 hover:text-white"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={logout}
              className="flex w-full justify-center text-gray-400 hover:text-white"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-700 dark:bg-gray-900">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            <LayoutDashboard className="h-5 w-5" />
          </button>

          <div className="flex-1 max-w-md ml-4 lg:ml-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search jobs, resumes..."
                className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-9 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    navigate(`/find-jobs?search=${(e.target as HTMLInputElement).value}`)
                  }
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="btn-ghost p-2"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white text-sm font-bold">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

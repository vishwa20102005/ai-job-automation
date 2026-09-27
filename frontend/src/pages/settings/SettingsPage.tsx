import { useState } from 'react'
import {
  AlertTriangle,
  Bot,
  Check,
  Moon,
  Save,
  Shield,
  Sun,
  User,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { authService } from '../../services/api'

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteStatus, setDeleteStatus] = useState('')

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) return
    try {
      await authService.deleteAccount()
      logout()
    } catch (err) {
      setDeleteStatus('Failed to delete account. Please try again.')
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Account & Platform Settings</h1>
          <p className="page-subtitle">
            Manage your account credentials, visual preferences, and AI integrations.
          </p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <User className="h-4 w-4 text-primary-500" />
          Profile Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Full Name</label>
            <input type="text" readOnly value={user?.full_name || ''} className="input bg-gray-50 dark:bg-gray-800/50" />
          </div>
          <div>
            <label className="label">Email Address</label>
            <input type="email" readOnly value={user?.email || ''} className="input bg-gray-50 dark:bg-gray-800/50" />
          </div>
        </div>
      </div>

      {/* AI Model & Engine Config */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Bot className="h-4 w-4 text-violet-500" />
          AI Architecture & Integration
        </h2>

        <div className="space-y-3 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Primary AI Provider</p>
              <p className="text-gray-400">Google Gemini API via google-genai SDK</p>
            </div>
            <span className="badge-primary text-[10px]">Gemini 3.8 Flash</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Fallback Provider</p>
              <p className="text-gray-400">Azure OpenAI GPT-4o / Deterministic Templates</p>
            </div>
            <span className="badge-gray text-[10px]">Active</span>
          </div>

          <p className="text-[11px] text-gray-400 pt-1">
            To set or change your Gemini API key, update <code className="font-mono text-primary-500">GEMINI_API_KEY</code> in the backend <code className="font-mono text-primary-500">.env</code> file.
          </p>
        </div>
      </div>

      {/* Preferences */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
          Interface & Visual Mode
        </h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">Theme Mode</p>
            <p className="text-xs text-gray-500">Currently using {theme} theme</p>
          </div>

          <button onClick={toggleTheme} className="btn-secondary text-xs flex items-center gap-1.5">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
          </button>
        </div>
      </div>

      {/* Danger Zone: Account Deletion */}
      <div className="card p-6 border-red-200 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/10 space-y-4">
        <h2 className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Danger Zone
        </h2>
        <p className="text-xs text-gray-500">
          Permanently delete your account along with all uploaded resumes, generated documents, and application data.
        </p>

        {deleteStatus && (
          <p className="text-xs text-red-600 font-medium">{deleteStatus}</p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.checked)}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            I understand that this action is irreversible.
          </label>

          <button
            disabled={!deleteConfirm}
            onClick={handleDeleteAccount}
            className="btn-destructive text-xs ml-auto disabled:opacity-40"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  )
}

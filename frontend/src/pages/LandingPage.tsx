import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Bot,
  Briefcase,
  CheckCircle,
  FileText,
  GraduationCap,
  Mail,
  Rocket,
  Star,
  Target,
  Zap,
} from 'lucide-react'

const features = [
  {
    icon: FileText,
    title: 'AI Resume Analysis',
    desc: 'Upload PDF or DOCX. Extract skills, education, projects automatically.',
    color: 'bg-blue-500',
  },
  {
    icon: Target,
    title: 'Smart Job Matching',
    desc: 'Hybrid algorithm: skills coverage + semantic similarity = transparent score.',
    color: 'bg-indigo-500',
  },
  {
    icon: Mail,
    title: 'Cover Letter Studio',
    desc: 'Generate professional cover letters tailored to each job in seconds.',
    color: 'bg-violet-500',
  },
  {
    icon: Briefcase,
    title: 'Application Tracker',
    desc: 'Kanban board tracking every application from saved to selected.',
    color: 'bg-purple-500',
  },
  {
    icon: GraduationCap,
    title: 'Interview Coach',
    desc: 'Practice with AI-generated questions. Get instant feedback on answers.',
    color: 'bg-pink-500',
  },
  {
    icon: BarChart3,
    title: 'Job Search Analytics',
    desc: 'Visualize your progress, identify skill gaps, track application trends.',
    color: 'bg-rose-500',
  },
]

const steps = [
  { step: '01', title: 'Upload Resume', desc: 'Upload your PDF or DOCX resume. AI extracts all details instantly.' },
  { step: '02', title: 'Add Job Listings', desc: 'Paste job descriptions or import from CSV. Manual entry supported.' },
  { step: '03', title: 'Get Match Score', desc: 'Our hybrid engine scores your resume against the job transparently.' },
  { step: '04', title: 'Improve & Apply', desc: 'Generate cover letters, track applications, practice interviews.' },
]

const techStack = [
  'Python 3.11', 'FastAPI', 'PostgreSQL', 'React', 'TypeScript',
  'Tailwind CSS', 'scikit-learn', 'Azure OpenAI', 'Docker', 'Alembic',
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-gray-900 text-white">
      {/* Navigation */}
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500">
              <Rocket className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold">CareerPilot AI</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm text-gray-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 text-center">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-4 py-2 text-sm text-primary-300">
            <Zap className="h-3.5 w-3.5" />
            AI-Powered Job Application Platform
          </div>
          <h1 className="mb-6 text-5xl font-bold leading-tight sm:text-6xl">
            Land Your Dream Job with{' '}
            <span className="bg-gradient-to-r from-primary-400 to-violet-400 bg-clip-text text-transparent">
              AI Intelligence
            </span>
          </h1>
          <p className="mb-10 mx-auto max-w-2xl text-xl text-gray-300 leading-relaxed">
            Upload your resume, match against jobs with our transparent scoring engine,
            generate tailored cover letters, track applications, and ace interviews.
            Built for ECE students targeting tech roles.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-8 py-4 text-base font-semibold text-white shadow-lg hover:bg-primary-700 transition-all"
            >
              Start Free <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-all"
            >
              Sign In
            </Link>
          </div>

          {/* Social proof */}
          <div className="mt-12 flex items-center justify-center gap-6 text-sm text-gray-400">
            {['Resume Parsing', 'Job Matching', 'AI Cover Letters', 'Interview Coach'].map((f) => (
              <div key={f} className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-green-400" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 bg-white/5">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold">Everything You Need to Get Hired</h2>
            <p className="mt-3 text-gray-400">A complete job application ecosystem in one platform</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-all"
              >
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold">How It Works</h2>
            <p className="mt-3 text-gray-400">From resume to offer in 4 steps</p>
          </div>
          <div className="space-y-6">
            {steps.map(({ step, title, desc }) => (
              <div key={step} className="flex items-start gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-lg font-bold">
                  {step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="mt-1 text-gray-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="px-6 py-16 bg-white/5">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-8 text-2xl font-bold">Built with Modern Technology</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {techStack.map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold">Ready to Launch Your Career?</h2>
          <p className="mt-4 text-gray-400">
            Join and start getting better matches, smarter applications, and more interviews.
          </p>
          <Link
            to="/register"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-8 py-4 text-base font-semibold text-white shadow-lg hover:bg-primary-700 transition-all"
          >
            Get Started Free <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-gray-500">
        <p>© 2024 CareerPilot AI. Built for ECE students targeting tech roles.</p>
        <p className="mt-2">
          AI-powered suggestions are for guidance only. Always verify information before applying.
        </p>
      </footer>
    </div>
  )
}

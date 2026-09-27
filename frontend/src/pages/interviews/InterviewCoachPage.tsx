import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Award,
  Bot,
  CheckCircle,
  Clock,
  GraduationCap,
  HelpCircle,
  Play,
  RotateCcw,
  Send,
  Sparkles,
} from 'lucide-react'
import { interviewService, jobService, resumeService } from '../../services/api'
import type { InterviewDetailResponse, Question } from '../../types'

export default function InterviewCoachPage() {
  const queryClient = useQueryClient()
  const [targetRole, setTargetRole] = useState('Python / AI Software Developer')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')

  // Queries
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['interview-sessions'],
    queryFn: interviewService.listSessions,
  })

  const { data: sessionDetail, isLoading: detailLoading } = useQuery<InterviewDetailResponse>({
    queryKey: ['interview-session', selectedSessionId],
    queryFn: () => interviewService.getSession(selectedSessionId!),
    enabled: !!selectedSessionId,
  })

  // Start Session mutation
  const startMutation = useMutation({
    mutationFn: () =>
      interviewService.createSession({
        target_role: targetRole,
        difficulty,
        num_questions: 6,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['interview-sessions'] })
      setSelectedSessionId(data.session.id)
      setCurrentQuestionIndex(0)
      setUserAnswer('')
    },
  })

  // Answer Submit mutation
  const answerMutation = useMutation({
    mutationFn: ({ questionId, answer }: { questionId: string; answer: string }) =>
      interviewService.submitAnswer(selectedSessionId!, {
        question_id: questionId,
        answer,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-session', selectedSessionId] })
      setUserAnswer('')
    },
  })

  const questions: Question[] = sessionDetail?.questions || []
  const activeQuestion: Question | undefined = questions[currentQuestionIndex]

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setUserAnswer('')
    }
  }

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
      setUserAnswer('')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Interview Simulation & Coach</h1>
          <p className="page-subtitle">
            Practice mock interviews tailored to your target engineering roles with live feedback from Gemini 3.8 Flash.
          </p>
        </div>
      </div>

      {/* Start New Session Config */}
      <div className="card p-6 bg-gradient-to-r from-primary-50/40 via-white to-violet-50/40 dark:from-navy-900/30 dark:via-gray-900 dark:to-navy-950/30">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary-600" />
          Launch New Practice Session
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="label">Target Engineering Role</label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Python Developer, AI Engineer, Cloud Fresher"
              className="input"
            />
          </div>

          <div>
            <label className="label">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
              className="input"
            >
              <option value="easy">Fresher / Fundamental</option>
              <option value="medium">Intermediate / Problem-Solving</option>
              <option value="hard">Advanced / System Architecture</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            disabled={!targetRole || startMutation.isPending}
            onClick={() => startMutation.mutate()}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Play className="h-4 w-4" />
            {startMutation.isPending ? 'Generating Questions with Gemini...' : 'Start Mock Interview'}
          </button>
        </div>
      </div>

      {/* Two Column Split: Session List & Interactive Q&A */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Previous Sessions */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Practice Sessions ({sessions?.length || 0})
          </h2>

          {sessionsLoading && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card p-4 skeleton h-20" />
              ))}
            </div>
          )}

          {sessions?.length === 0 && (
            <div className="card p-6 text-center text-sm text-gray-500">
              No interview sessions yet. Launch one above to start practicing.
            </div>
          )}

          {sessions?.map((s) => {
            const isSelected = selectedSessionId === s.id
            return (
              <div
                key={s.id}
                onClick={() => {
                  setSelectedSessionId(s.id)
                  setCurrentQuestionIndex(0)
                  setUserAnswer('')
                }}
                className={`card p-4 cursor-pointer transition-all ${
                  isSelected
                    ? 'ring-2 ring-primary-500 bg-primary-50/10 dark:bg-primary-950/20'
                    : 'hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100">
                      {s.target_role}
                    </h3>
                    <p className="text-[11px] text-gray-400 capitalize mt-0.5">
                      {s.difficulty} • {s.total_questions} questions
                    </p>
                  </div>
                  <span
                    className={`badge text-[10px] ${
                      s.status === 'completed' ? 'badge-green' : 'badge-yellow'
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Right: Active Question & Interactive Answer Form */}
        <div className="lg:col-span-2">
          {sessionDetail && activeQuestion ? (
            <div className="card p-6 space-y-5">
              {/* Question Navigation Header */}
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="badge-primary text-xs">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </span>
                  <span className="badge-gray text-xs capitalize">
                    {activeQuestion.question_type}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={currentQuestionIndex === 0}
                    onClick={handlePrevQuestion}
                    className="btn-secondary text-xs p-1.5 disabled:opacity-30"
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentQuestionIndex === questions.length - 1}
                    onClick={handleNextQuestion}
                    className="btn-secondary text-xs p-1.5 disabled:opacity-30"
                  >
                    Next
                  </button>
                </div>
              </div>

              {/* Question Prompt */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-relaxed">
                  {activeQuestion.question_text}
                </p>
              </div>

              {/* Answer submission zone */}
              <div className="space-y-3">
                <label className="label">Your Spoken or Written Response:</label>
                <textarea
                  rows={5}
                  value={
                    userAnswer ||
                    (activeQuestion.user_answer ? activeQuestion.user_answer : '')
                  }
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Type your response here using the STAR format (Situation, Task, Action, Result)..."
                  className="input text-xs"
                />

                <div className="flex justify-end">
                  <button
                    disabled={
                      !userAnswer ||
                      userAnswer === activeQuestion.user_answer ||
                      answerMutation.isPending
                    }
                    onClick={() =>
                      answerMutation.mutate({
                        questionId: activeQuestion.id,
                        answer: userAnswer,
                      })
                    }
                    className="btn-primary text-xs flex items-center gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {answerMutation.isPending
                      ? 'Evaluating with Gemini...'
                      : activeQuestion.is_answered
                      ? 'Re-evaluate Answer'
                      : 'Submit for Evaluation'}
                  </button>
                </div>
              </div>

              {/* AI Feedback Section */}
              {activeQuestion.feedback && (
                <div className="mt-4 p-5 rounded-xl bg-primary-50/40 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-900 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="badge-primary text-xs flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" />
                      Gemini Evaluation
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-primary-600 dark:text-primary-400">
                        {activeQuestion.feedback.score ?? 7}
                      </span>
                      <span className="text-xs text-gray-400">/ 10</span>
                    </div>
                  </div>

                  {activeQuestion.feedback.technical_correctness && (
                    <div className="text-xs">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        Technical Accuracy:{' '}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {activeQuestion.feedback.technical_correctness}
                      </span>
                    </div>
                  )}

                  {activeQuestion.feedback.improved_answer && (
                    <div className="text-xs bg-white dark:bg-gray-800/80 p-3 rounded-lg border border-primary-100 dark:border-primary-900/50">
                      <span className="font-semibold text-primary-700 dark:text-primary-300 block mb-1">
                        Model Answer Structure:
                      </span>
                      <p className="text-gray-700 dark:text-gray-300 italic leading-relaxed">
                        "{activeQuestion.feedback.improved_answer}"
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="card p-12 text-center text-gray-400 flex flex-col items-center justify-center">
              <Bot className="h-12 w-12 text-gray-300 dark:text-gray-700 mb-3" />
              <p className="text-base font-medium text-gray-700 dark:text-gray-300">
                No Active Session
              </p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">
                Launch a mock interview session above or select an existing one to review questions and feedback.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

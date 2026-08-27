'use client'

import { FormEvent, useMemo, useState, useEffect } from 'react'
import {
  CalendarDays,
  ClipboardList,
  Plus,
  Sparkles,
  Bot,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Search,
  Moon,
  Sun,
  Flame,
  Check,
  PartyPopper,
} from 'lucide-react'

interface Assignment {
  id: number
  title: string
  dueDate: string
}

interface AiGuideResult {
  motivation: string
  todayTask: string
  breakdown: Array<{
    step: number
    task: string
    duration: string
  }>
}

type FormErrors = Partial<Record<'title' | 'dueDate' | 'duplicate' | 'natural', string>>
type FilterType = 'all' | 'urgent' | 'guide' | 'completed'

function getToday() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60 * 1000).toISOString().slice(0, 10)
}

function getDaysLeft(date: string) {
  const today = new Date(`${getToday()}T00:00:00`)
  const due = new Date(`${date}T00:00:00`)
  return Math.round((due.getTime() - today.getTime()) / 86400000)
}

function formatDate(date: string) {
  const [year, month, day] = date.split('-')
  return `${year}.${month}.${day}`
}

function getUrgencyInfo(days: number) {
  if (days === 0) {
    return {
      level: 'critical',
      label: '🔥 당일 마감',
      tagClass: 'tag-critical',
      cardClass: 'card-critical',
      barPercent: 100,
      barColor: '#ef4444',
    }
  }
  if (days <= 2) {
    return {
      level: 'urgent',
      label: '⚡ 긴급 임박',
      tagClass: 'tag-urgent',
      cardClass: 'card-urgent',
      barPercent: 80,
      barColor: '#f97316',
    }
  }
  if (days <= 7) {
    return {
      level: 'upcoming',
      label: '📌 이번 주',
      tagClass: 'tag-upcoming',
      cardClass: '',
      barPercent: 50,
      barColor: '#3b82f6',
    }
  }
  return {
    level: 'planned',
    label: '🌱 여유',
    tagClass: 'tag-planned',
    cardClass: '',
    barPercent: 20,
    barColor: '#10b981',
  }
}

function DdayBadge({ days }: { days: number }) {
  const label = days === 0 ? 'D-Day' : `D-${days}`
  const tone = days === 0 ? 'today' : days <= 3 ? 'soon' : 'normal'
  return <span className={`dday-badge dday-${tone}`}>{label}</span>
}

export function DeadlineCounter() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [inputMode, setInputMode] = useState<'manual' | 'ai'>('manual')
  const [naturalInput, setNaturalInput] = useState('')
  const [isParsingAi, setIsParsingAi] = useState(false)
  const [aiParseMessage, setAiParseMessage] = useState('')

  const [activeGuideId, setActiveGuideId] = useState<number | null>(null)
  const [loadingGuideId, setLoadingGuideId] = useState<number | null>(null)
  const [aiGuides, setAiGuides] = useState<Record<number, AiGuideResult>>({})

  // Interactive Checklist Progress
  const [checklistProgress, setChecklistProgress] = useState<Record<number, Record<number, boolean>>>({})

  // Search & Filter & Theme
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<FilterType>('all')
  const [isDarkMode, setIsDarkMode] = useState(false)

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const today = getToday()

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  function toggleStep(assignmentId: number, stepIndex: number) {
    setChecklistProgress((prev) => {
      const current = prev[assignmentId] || {}
      return {
        ...prev,
        [assignmentId]: {
          ...current,
          [stepIndex]: !current[stepIndex],
        },
      }
    })
  }

  function getCompletionPercentage(assignmentId: number, totalSteps: number) {
    if (!totalSteps || totalSteps === 0) return 0
    const assignmentSteps = checklistProgress[assignmentId] || {}
    const completedCount = Object.values(assignmentSteps).filter(Boolean).length
    return Math.round((completedCount / totalSteps) * 100)
  }

  const filteredAssignments = useMemo(() => {
    return assignments
      .filter((item) => {
        if (searchQuery.trim() && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false
        }
        const days = getDaysLeft(item.dueDate)
        const guide = aiGuides[item.id]
        const progress = guide ? getCompletionPercentage(item.id, guide.breakdown.length) : 0

        if (filterMode === 'urgent') return days <= 3
        if (filterMode === 'guide') return Boolean(guide)
        if (filterMode === 'completed') return progress === 100
        return true
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  }, [assignments, searchQuery, filterMode, aiGuides, checklistProgress])

  async function handleAiParse() {
    if (!naturalInput.trim()) {
      setErrors((prev) => ({ ...prev, natural: '자연어 과제 정보를 입력해주세요.' }))
      return
    }
    setIsParsingAi(true)
    setErrors((prev) => ({ ...prev, natural: undefined }))
    setAiParseMessage('')

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'parse-natural-language',
          text: naturalInput,
          currentDate: today,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'AI 파싱 실패')
      }

      const { title: parsedTitle, dueDate: parsedDueDate, summary } = data.result
      if (parsedTitle) setTitle(parsedTitle)
      if (parsedDueDate) setDueDate(parsedDueDate)
      setAiParseMessage(summary || 'Gemini AI가 입력 정보를 분석하여 폼에 자동 반영했습니다!')
      setInputMode('manual')
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, natural: err.message || 'AI 분석 중 오류가 발생했습니다.' }))
    } finally {
      setIsParsingAi(false)
    }
  }

  async function handleToggleAiGuide(assignment: Assignment) {
    if (activeGuideId === assignment.id) {
      setActiveGuideId(null)
      return
    }

    if (aiGuides[assignment.id]) {
      setActiveGuideId(assignment.id)
      return
    }

    setLoadingGuideId(assignment.id)
    const days = getDaysLeft(assignment.dueDate)
    const dDayText = days === 0 ? 'D-Day' : `D-${days}`

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-guide',
          title: assignment.title,
          dueDate: assignment.dueDate,
          dDayText,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'AI 가이드 생성 실패')
      }

      setAiGuides((prev) => ({ ...prev, [assignment.id]: data.result }))
      setActiveGuideId(assignment.id)
    } catch (err: any) {
      alert(err.message || 'AI 가이드를 불러오는 데 실패했습니다.')
    } finally {
      setLoadingGuideId(null)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    const nextErrors: FormErrors = {}
    const trimmedTitle = title.trim()

    if (!trimmedTitle) {
      nextErrors.title = '과제명을 입력해주세요.'
    }
    if (!dueDate) {
      nextErrors.dueDate = '마감일을 선택해주세요.'
    } else if (dueDate < today) {
      nextErrors.dueDate = '지난 날짜는 마감일로 등록할 수 없습니다.'
    }

    if (
      trimmedTitle &&
      dueDate &&
      assignments.some((item) => item.title.toLowerCase() === trimmedTitle.toLowerCase() && item.dueDate === dueDate)
    ) {
      nextErrors.duplicate = '이미 등록된 과제입니다.'
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      setIsSubmitting(false)
      return
    }

    setAssignments((current) => [...current, { id: Date.now(), title: trimmedTitle, dueDate }])
    setTitle('')
    setDueDate('')
    setErrors({})
    setAiParseMessage('')
    setIsSubmitting(false)
  }

  const urgentCount = assignments.filter((a) => getDaysLeft(a.dueDate) <= 3).length

  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground sm:px-8 sm:py-16">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-10">
        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="brand-mark" aria-hidden="true">
                <CalendarDays />
              </div>
              <span className="ai-badge">
                <Bot className="w-3.5 h-3.5" /> Gemini AI 3.6
              </span>
            </div>
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
              aria-label="테마 전환"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">과제 마감 카운터</h1>
            <p className="text-base leading-6 text-muted-foreground">
              마감일 D-Day 카운트와 Gemini AI 3.6 가이드로 과제를 똑똑하게 정복하세요.
            </p>
          </div>
        </header>

        {/* New Assignment Section */}
        <section className="form-card" aria-labelledby="new-assignment-title">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="section-icon">
                <Sparkles />
              </div>
              <div className="flex flex-col gap-1">
                <h2 id="new-assignment-title" className="text-lg font-semibold">새 과제 등록</h2>
                <p className="text-sm text-muted-foreground">과제 정보를 입력하거나 AI 자연어 입력으로 빠르게 등록하세요.</p>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="tab-group">
              <button
                type="button"
                className={`tab-button ${inputMode === 'manual' ? 'active' : ''}`}
                onClick={() => setInputMode('manual')}
              >
                <ClipboardList className="w-4 h-4" /> 수동 입력
              </button>
              <button
                type="button"
                className={`tab-button ${inputMode === 'ai' ? 'active' : ''}`}
                onClick={() => setInputMode('ai')}
              >
                <Bot className="w-4 h-4 text-purple-600" /> ✨ AI 자연어 빠른 입력
              </button>
            </div>

            {inputMode === 'ai' && (
              <div className="flex flex-col gap-3 p-4 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/40">
                <label className="text-xs font-semibold text-purple-900 dark:text-purple-300">
                  자연어 과제 문구 입력 (예: &quot;다음주 금요일 18시까지 컴퓨터 구조 보고서 제출&quot;)
                </label>
                <div className="input-wrap">
                  <input
                    value={naturalInput}
                    onChange={(e) => setNaturalInput(e.target.value)}
                    placeholder="예: 내일 모레까지 데이터베이스 실습과제"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAiParse()
                      }
                    }}
                  />
                </div>
                {errors.natural && <p className="error-text">{errors.natural}</p>}
                <button
                  type="button"
                  className="ai-button self-end"
                  onClick={handleAiParse}
                  disabled={isParsingAi}
                >
                  {isParsingAi ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Gemini AI 분석 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> AI로 정보 추출하기
                    </>
                  )}
                </button>
              </div>
            )}

            {aiParseMessage && (
              <div className="mt-3 flex items-center gap-2 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 p-2.5 rounded-lg border border-purple-200 dark:border-purple-800">
                <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-none" />
                <span>{aiParseMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5" noValidate>
              <div className="field-group">
                <label htmlFor="assignment-title">과제명</label>
                <div className={`input-wrap ${errors.title || errors.duplicate ? 'has-error' : ''}`}>
                  <input
                    id="assignment-title"
                    value={title}
                    maxLength={50}
                    onChange={(event) => {
                      setTitle(event.target.value)
                      setErrors((current) => ({ ...current, title: undefined, duplicate: undefined }))
                    }}
                    placeholder="예: 정보보안 보고서"
                    aria-invalid={Boolean(errors.title || errors.duplicate)}
                  />
                  <span className="character-count">{title.length} / 50</span>
                </div>
                {errors.title && <p className="error-text" role="alert">{errors.title}</p>}
                {errors.duplicate && <p className="error-text" role="alert">{errors.duplicate}</p>}
              </div>

              <div className="field-group">
                <label htmlFor="assignment-due-date">마감일</label>
                <div className={`input-wrap date-wrap ${errors.dueDate ? 'has-error' : ''}`}>
                  <CalendarDays />
                  <input
                    id="assignment-due-date"
                    type="date"
                    min={today}
                    value={dueDate}
                    onChange={(event) => {
                      setDueDate(event.target.value)
                      setErrors((current) => ({ ...current, dueDate: undefined, duplicate: undefined }))
                    }}
                    aria-invalid={Boolean(errors.dueDate)}
                  />
                </div>
                {errors.dueDate && <p className="error-text" role="alert">{errors.dueDate}</p>}
              </div>

              <button type="submit" className="primary-button" disabled={isSubmitting}>
                <Plus />
                과제 등록
              </button>
            </form>
          </div>
        </section>

        {/* Assignment List Section with Search & Filter */}
        <section className="flex flex-col gap-4" aria-labelledby="assignment-list-title">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <h2 id="assignment-list-title" className="text-xl font-semibold">
                등록된 과제
              </h2>
              <span className="count-badge">{assignments.length}</span>
              {urgentCount > 0 && (
                <span className="priority-tag tag-critical">
                  <Flame className="w-3 h-3" /> 긴급 {urgentCount}개
                </span>
              )}
            </div>
          </div>

          {assignments.length > 0 && (
            <div className="filter-bar">
              <div className="search-input-wrap">
                <div className="input-wrap w-full">
                  <Search className="w-4 h-4 ml-3 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="과제명 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="filter-pills">
                <button
                  type="button"
                  className={`filter-pill ${filterMode === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterMode('all')}
                >
                  전체 ({assignments.length})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${filterMode === 'urgent' ? 'active' : ''}`}
                  onClick={() => setFilterMode('urgent')}
                >
                  🔥 마감 임박
                </button>
                <button
                  type="button"
                  className={`filter-pill ${filterMode === 'guide' ? 'active' : ''}`}
                  onClick={() => setFilterMode('guide')}
                >
                  🤖 AI 가이드
                </button>
                <button
                  type="button"
                  className={`filter-pill ${filterMode === 'completed' ? 'active' : ''}`}
                  onClick={() => setFilterMode('completed')}
                >
                  ✅ 완료됨
                </button>
              </div>
            </div>
          )}

          {assignments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon" aria-hidden="true">
                <ClipboardList />
              </div>
              <h3 className="font-medium">등록된 과제가 없습니다.</h3>
              <p>마감일을 확인할 과제를 등록해보세요.</p>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon" aria-hidden="true">
                <Search />
              </div>
              <h3 className="font-medium">조건에 일치하는 과제가 없습니다.</h3>
              <p>검색어나 필터 조건을 변경해보세요.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredAssignments.map((assignment) => {
                const days = getDaysLeft(assignment.dueDate)
                const urgency = getUrgencyInfo(days)
                const guide = aiGuides[assignment.id]
                const isGuideOpen = activeGuideId === assignment.id
                const isLoadingThisGuide = loadingGuideId === assignment.id
                const completionRate = guide ? getCompletionPercentage(assignment.id, guide.breakdown.length) : 0
                const isCompleted = completionRate === 100

                return (
                  <article key={assignment.id} className={`assignment-card ${urgency.cardClass}`}>
                    <div className="assignment-main">
                      <div className="assignment-info">
                        <div className="assignment-icon" aria-hidden="true">
                          <ClipboardList />
                        </div>
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={`font-semibold break-all ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                              {assignment.title}
                            </h3>
                            <span className={`priority-tag ${urgency.tagClass}`}>{urgency.label}</span>
                            {isCompleted && (
                              <span className="priority-tag tag-planned">
                                <Check className="w-3 h-3" /> 완료
                              </span>
                            )}
                          </div>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarDays />
                            마감일: {formatDate(assignment.dueDate)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 flex-none">
                        <DdayBadge days={days} />
                        <button
                          type="button"
                          className="ai-button !px-2.5 !py-1.5 !text-xs"
                          onClick={() => handleToggleAiGuide(assignment)}
                          disabled={isLoadingThisGuide}
                          title="Gemini AI 가이드"
                        >
                          {isLoadingThisGuide ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Bot className="w-3.5 h-3.5" />
                          )}
                          <span>AI 가이드</span>
                          {isGuideOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        <button
                          type="button"
                          className="remove-button"
                          onClick={() => {
                            setAssignments((current) => current.filter((item) => item.id !== assignment.id))
                            if (activeGuideId === assignment.id) setActiveGuideId(null)
                          }}
                          aria-label={`${assignment.title} 삭제`}
                        >
                          &times;
                        </button>
                      </div>
                    </div>

                    {/* Urgency Gauge Bar */}
                    <div className="urgency-bar-track" title={`마감 위험도 게이지 (${urgency.barPercent}%)`}>
                      <div
                        className="urgency-bar-fill"
                        style={{
                          width: `${urgency.barPercent}%`,
                          backgroundColor: urgency.barColor,
                        }}
                      />
                    </div>

                    {/* AI Guide & Interactive Checklist */}
                    {isGuideOpen && guide && (
                      <div className="ai-guide-card animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="ai-guide-header">
                          <div className="flex items-center gap-2 text-xs font-bold text-purple-900 dark:text-purple-300">
                            <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span>Gemini AI 학습 코치 가이드</span>
                          </div>
                          <span className="text-[11px] text-muted-foreground">맞춤형 실행 전략</span>
                        </div>

                        <div className="ai-motivation">
                          💡 <strong>코치 한마디:</strong> {guide.motivation}
                        </div>

                        <div className="ai-today-box">
                          🎯 <strong>오늘 완료할 핵심 액션:</strong> {guide.todayTask}
                        </div>

                        {/* Interactive Checklist Header & Progress */}
                        <div className="mt-3 flex flex-col gap-2">
                          <div className="checklist-progress-box">
                            <span className="flex items-center gap-1.5 text-xs text-foreground font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" /> 과제 실행 체크리스트
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-purple-100 dark:bg-purple-950 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-purple-600 transition-all duration-300"
                                  style={{ width: `${completionRate}%` }}
                                />
                              </div>
                              <span className="text-xs text-purple-700 dark:text-purple-300 font-bold">
                                {completionRate}%
                              </span>
                            </div>
                          </div>

                          {isCompleted && (
                            <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                              <PartyPopper className="w-4 h-4 text-emerald-600 flex-none" />
                              <span>🎉 축하합니다! 모든 준비 스텝을 마쳤습니다. 이제 과제를 제출하세요!</span>
                            </div>
                          )}

                          <div className="ai-checklist-container">
                            {guide.breakdown.map((item, idx) => {
                              const isStepChecked = Boolean(checklistProgress[assignment.id]?.[idx])
                              return (
                                <div
                                  key={idx}
                                  className={`ai-step-item ${isStepChecked ? 'completed' : ''}`}
                                  onClick={() => toggleStep(assignment.id, idx)}
                                >
                                  <div className={`ai-step-checkbox ${isStepChecked ? 'checked' : ''}`}>
                                    {isStepChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                  <span className="ai-step-num">{item.step}</span>
                                  <span className="font-medium text-foreground flex-1">{item.task}</span>
                                  <span className="ai-step-duration">{item.duration}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <footer className="flex flex-col items-center justify-center gap-2 pt-6 text-xs text-muted-foreground border-t border-border">
          <p className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            대학생을 위한 빠르고 스마트한 과제 마감 카운터 &copy; {new Date().getFullYear()}
          </p>
        </footer>
      </div>
    </main>
  )
}

export default DeadlineCounter

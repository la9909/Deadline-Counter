'use client'

import { FormEvent, useMemo, useState } from 'react'
import { CalendarDays, ClipboardList, Plus, Sparkles, Bot, Loader2, CheckCircle2, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react'

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

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const today = getToday()

  const sortedAssignments = useMemo(
    () => [...assignments].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [assignments],
  )

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

  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground sm:px-8 sm:py-16">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-10">
        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="brand-mark" aria-hidden="true">
              <CalendarDays />
            </div>
            <span className="ai-badge">
              <Bot className="w-3.5 h-3.5" /> Gemini AI Powered
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">과제 마감 카운터</h1>
            <p className="text-base leading-6 text-muted-foreground">마감일까지 얼마나 남았는지 확인하고, Gemini AI 가이드를 받아보세요.</p>
          </div>
        </header>

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
                <Bot className="w-4 h-4 text-purple-600" /> ✨ AI 자연어 입력
              </button>
            </div>

            {inputMode === 'ai' && (
              <div className="flex flex-col gap-3 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                <label className="text-xs font-semibold text-purple-900">
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
              <div className="mt-3 flex items-center gap-2 text-xs font-medium text-purple-700 bg-purple-50 p-2.5 rounded-lg border border-purple-200">
                <CheckCircle2 className="w-4 h-4 text-purple-600 flex-none" />
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
                <label htmlFor="assignment-date">마감일</label>
                <div className={`input-wrap date-wrap ${errors.dueDate ? 'has-error' : ''}`}>
                  <CalendarDays aria-hidden="true" />
                  <input
                    id="assignment-date"
                    type="date"
                    min={today}
                    value={dueDate}
                    onChange={(event) => {
                      setDueDate(event.target.value)
                      setErrors((current) => ({ ...current, dueDate: undefined }))
                    }}
                    aria-invalid={Boolean(errors.dueDate)}
                  />
                </div>
                {errors.dueDate && <p className="error-text" role="alert">{errors.dueDate}</p>}
              </div>

              <button className="primary-button" type="submit" disabled={isSubmitting}>
                <Plus data-icon="inline-start" />
                과제 등록
              </button>
            </form>
          </div>
        </section>

        <section className="flex flex-col gap-5" aria-labelledby="upcoming-title">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 id="upcoming-title" className="text-xl font-semibold tracking-[-0.02em]">등록된 과제</h2>
              {assignments.length > 0 && <span className="count-badge">{assignments.length}개</span>}
            </div>
          </div>

          {sortedAssignments.length > 0 ? (
            <div className="flex flex-col gap-4">
              {sortedAssignments.map((assignment) => {
                const days = getDaysLeft(assignment.dueDate)
                const isGuideOpen = activeGuideId === assignment.id
                const isLoadingGuide = loadingGuideId === assignment.id
                const guideData = aiGuides[assignment.id]

                return (
                  <article className="flex flex-col border border-border rounded-2xl bg-card p-4 sm:p-5 shadow-sm transition-all hover:shadow-md" key={assignment.id}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="assignment-info">
                        <div className="assignment-icon">
                          <ClipboardList />
                        </div>
                        <div className="flex min-w-0 flex-col gap-1">
                          <h3 className="truncate text-base font-semibold">{assignment.title}</h3>
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />
                            {formatDate(assignment.dueDate)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <DdayBadge days={days} />
                        <button
                          type="button"
                          className="ai-button text-xs py-1.5 px-2.5"
                          onClick={() => handleToggleAiGuide(assignment)}
                          disabled={isLoadingGuide}
                        >
                          {isLoadingGuide ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Bot className="w-3.5 h-3.5" />
                              <span>AI 가이드</span>
                              {isGuideOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {isGuideOpen && guideData && (
                      <div className="ai-guide-card animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="ai-guide-header">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-600" />
                            <h4 className="text-sm font-bold text-purple-950">Gemini AI 맞춤형 실행 가이드</h4>
                          </div>
                          <span className="text-[11px] font-semibold text-purple-600 bg-purple-100/80 px-2 py-0.5 rounded-md">
                            D-Day 맞춤 조언
                          </span>
                        </div>

                        <div className="ai-motivation">
                          💡 <strong>AI 한줄 팁:</strong> {guideData.motivation}
                        </div>

                        <div className="ai-today-box">
                          📌 <strong>오늘 꼭 할 일:</strong> {guideData.todayTask}
                        </div>

                        <div className="flex flex-col gap-1.5 mt-3">
                          <h5 className="text-xs font-semibold text-foreground/80 flex items-center gap-1">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> 추천 3단계 실행 가이드
                          </h5>
                          {guideData.breakdown?.map((item) => (
                            <div key={item.step} className="ai-step-item">
                              <div className="ai-step-num">{item.step}</div>
                              <span className="text-foreground/90 font-medium">{item.task}</span>
                              <span className="ai-step-duration">{item.duration}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <ClipboardList />
              </div>
              <h3>등록된 과제가 없습니다.</h3>
              <p>마감일을 확인할 과제를 수동 또는 AI 자연어로 등록해보세요.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default DeadlineCounter


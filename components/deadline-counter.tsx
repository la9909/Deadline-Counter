'use client'

import { FormEvent, useMemo, useState, useEffect, useRef } from 'react'
import {
  CalendarDays,
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
  ArrowRight,
  Star,
  BookOpen,
  HelpCircle,
  Plus,
  Clock
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

const DINO_LOGO_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuABxi5LHLA9TVBoqaeQAWPXAFkfqofy9UbYMW4RuiD_xBTlodlYgWKByz0KT72tz6N9izaBrhLJBDs3S7G8jM8lrM2tcV5FfpLySXybygJtG_nx1l0i5hFRwWh-Reom78MpbeK3u9DYuwGS6W19pxrVuB3F2xLph5gTEDEHSS94zwX06HmhzGc-La5G2UfMbLHvRATw-5pKl2FoC9qZf4yqY-7SBPhZbeM7zspZVp_Pwxz6LGlKpTawvQ'

const DINO_HERO_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuActQA_6NFygreO-VeUQSAYwLtAPdJFx7PBRP4FrWXEMjdrL5uGtTnTRETUkEOZPTAa0PD9gw43fOkrd-MMcZ37TIQbAApRjEvlI8pCUv80KOs2VOVWK7YtQQ9UU9XfBzSw_UDHtsh1TVN7t1ZbrKfWpo9NM4FJhv-r9pW6F1SFxmCT1CAsjBVmDSMljAYAd4bX71jnPVy5HdtPWWJVhueDGnn4fR6Lu5FLH1ghNL-orMWa1TBdkuP_bw'

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
      label: '🔥 오늘 마감',
      badgeClass: 'dday-today',
      cardClass: 'dino-card-urgent',
      barPercent: 100,
      barColor: '#ff8a80',
    }
  }
  if (days <= 2) {
    return {
      level: 'urgent',
      label: '⚡ 마감 임박',
      badgeClass: 'dday-soon',
      cardClass: '',
      barPercent: 80,
      barColor: '#ffb84d',
    }
  }
  if (days <= 7) {
    return {
      level: 'upcoming',
      label: '📌 이번 주',
      badgeClass: 'dday-normal',
      cardClass: '',
      barPercent: 50,
      barColor: '#bfecae',
    }
  }
  return {
    level: 'planned',
    label: '🌱 여유',
    badgeClass: 'dday-normal',
    cardClass: '',
    barPercent: 20,
    barColor: '#a6d296',
  }
}

function DdayBadge({ days }: { days: number }) {
  const label = days === 0 ? 'D-Day' : `D-${days}`
  const urgency = getUrgencyInfo(days)
  return <span className={`dday-badge ${urgency.badgeClass}`}>{label}</span>
}

export function DeadlineCounter() {
  const [assignments, setAssignments] = useState<Assignment[]>([
    { id: 1, title: '컴퓨터 구조 기말 과제', dueDate: getToday() },
  ])
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [inputMode, setInputMode] = useState<'manual' | 'ai'>('manual')
  const [naturalInput, setNaturalInput] = useState('')
  const [isParsingAi, setIsParsingAi] = useState(false)
  const [aiParseMessage, setAiParseMessage] = useState('')

  const [activeGuideId, setActiveGuideId] = useState<number | null>(null)
  const [loadingGuideId, setLoadingGuideId] = useState<number | null>(null)
  const [aiGuides, setAiGuides] = useState<Record<number, AiGuideResult>>({})
  const [checklistProgress, setChecklistProgress] = useState<Record<number, Record<number, boolean>>>({})

  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<FilterType>('all')
  const [isDarkMode, setIsDarkMode] = useState(false)

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const formSectionRef = useRef<HTMLDivElement>(null)
  const today = getToday()

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  function scrollToForm() {
    formSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

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
      setAiParseMessage(summary || '디노가 입력하신 문장을 분석하여 폼에 쏙 넣었어요!')
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
    <div className="relative min-h-screen bg-[#fbf9f8] dark:bg-[#1b1c1c] text-[#1b1c1c] dark:text-[#fbf9f8] transition-colors duration-200">
      {/* Background Decorative Blur Circles */}
      <div className="fixed top-0 right-0 w-80 h-80 bg-[#bfecae]/25 dark:bg-[#2a4f21]/20 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3 pointer-events-none" />
      <div className="fixed bottom-40 left-0 w-96 h-96 bg-[#ffb84d]/20 dark:bg-[#633f00]/20 rounded-full blur-3xl -z-10 -translate-x-1/3 translate-y-1/3 pointer-events-none" />

      {/* Fixed Top Header */}
      <header className="fixed top-0 w-full z-50 bg-[#fbf9f8]/85 dark:bg-[#1b1c1c]/85 backdrop-blur-xl border-b border-[#e4e2e2] dark:border-[#302c29] shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
        <div className="h-16 px-4 sm:px-8 max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={DINO_LOGO_URL}
              alt="Cute Cactus Dino Logo"
              className="h-9 w-auto object-contain animate-dino-float"
            />
            <span className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-[#825500] dark:text-[#ffb951]">
              Deadline-Counter
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-[#bfecae]/40 dark:bg-[#2a4f21]/60 text-[#416837] dark:text-[#a6d296] rounded-full text-xs font-bold font-heading">
              <Sparkles className="w-3.5 h-3.5" />
              과제 {assignments.length}개 관리 중
            </span>
            <button
              type="button"
              className="w-10 h-10 rounded-full bg-[#ffb84d] dark:bg-[#633f00] flex items-center justify-center cursor-pointer hover:opacity-90 transition-all shadow-[0_3px_0_0_#c2882c]"
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
              aria-label="테마 전환"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-amber-300" />
              ) : (
                <Moon className="w-5 h-5 text-[#514536]" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="pt-24 pb-32 px-4 sm:px-8 max-w-4xl mx-auto flex flex-col gap-16">
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center gap-8 animate-fade-in-up">
          <div className="relative w-full max-w-xl mx-auto">
            {/* Background Layer with Soft Rotation */}
            <div className="absolute inset-0 bg-[#825500]/10 dark:bg-[#ffb951]/10 rounded-[3rem] transform rotate-3 scale-105 transition-transform duration-500 hover:rotate-6" />
            
            {/* Hero Image */}
            <img
              src={DINO_HERO_URL}
              alt="Cute Dino studying at a desk"
              className="relative z-10 w-full h-auto rounded-[3rem] object-cover shadow-[0_8px_0_0_#d6c4b0] dark:shadow-[0_8px_0_0_#302c29] transition-transform duration-300 hover:-translate-y-2"
            />

            {/* Decorative Stamps */}
            <div className="absolute -top-4 -right-4 w-12 h-12 bg-[#416837] text-white rounded-full flex items-center justify-center shadow-[0_4px_0_0_#2a4f21] z-20 rotate-12">
              <Star className="w-6 h-6 fill-current text-[#ffb84d]" />
            </div>
            <div className="absolute -bottom-5 -left-5 w-14 h-14 bg-[#ffb84d] text-[#514536] rounded-full flex items-center justify-center shadow-[0_4px_0_0_#c2882c] z-20 -rotate-12">
              <Sparkles className="w-7 h-7" />
            </div>
          </div>

          <div className="flex flex-col gap-3 max-w-xl">
            <h1 className="font-heading text-3xl sm:text-5xl font-extrabold text-[#825500] dark:text-[#ffb951] leading-tight">
              선인장 공룡 디노와 함께<br />마감 스트레스 탈출!
            </h1>
            <p className="text-base sm:text-lg text-[#514536] dark:text-[#d6c4b0] leading-relaxed">
              복잡한 과제 일정, 이제 귀여운 선인장 공룡이 꼼꼼하게 챙겨줄게요.<br className="hidden sm:inline" />
              Gemini AI 가이드로 계획부터 실행까지 함께해요!
            </p>
          </div>

          <button
            type="button"
            onClick={scrollToForm}
            className="btn-primary-3d inline-flex items-center gap-2 px-8 py-4 font-heading text-lg font-bold cursor-pointer"
          >
            <span>지금 과제 등록하기</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </section>

        {/* 3 Core Features */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <div className="dino-card p-6 flex flex-col gap-3">
            <div className="w-14 h-14 rounded-full bg-[#bfecae] dark:bg-[#2a4f21] flex items-center justify-center text-[#416837] dark:text-[#bfecae]">
              <Clock className="w-7 h-7" />
            </div>
            <h3 className="font-heading text-lg font-bold">똑똑한 D-Day 알림</h3>
            <p className="text-sm text-[#514536] dark:text-[#d6c4b0]">
              마감일이 다가오면 꼼꼼하게! 잊지 않도록 다정하게 D-Day를 알려드려요.
            </p>
          </div>

          <div className="dino-card p-6 flex flex-col gap-3">
            <div className="w-14 h-14 rounded-full bg-[#ffb84d]/50 dark:bg-[#633f00]/60 flex items-center justify-center text-[#825500] dark:text-[#ffb951]">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="font-heading text-lg font-bold">AI 자연어 파서</h3>
            <p className="text-sm text-[#514536] dark:text-[#d6c4b0]">
              &quot;수요일까지 DB 리포트 제출&quot;이라고 적기만 하면 마감일과 과제명을 쏙 추출해요.
            </p>
          </div>

          <div className="dino-card p-6 flex flex-col gap-3">
            <div className="w-14 h-14 rounded-full bg-[#ccc6a2]/50 dark:bg-[#4b472c] flex items-center justify-center text-[#565236] dark:text-[#eae3be]">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="font-heading text-lg font-bold">3단계 퀘스트 가이드</h3>
            <p className="text-sm text-[#514536] dark:text-[#d6c4b0]">
              막막한 과제도 걱정 끝! 자료조사부터 검토까지 3단계로 쪼개어 가이드해줘요.
            </p>
          </div>
        </section>

        {/* New Assignment Form Section */}
        <div ref={formSectionRef} className="scroll-mt-24">
          <section className="dino-card p-6 sm:p-8 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#ffb84d] flex items-center justify-center text-[#514536] shadow-[0_3px_0_0_#c2882c]">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-heading text-2xl font-bold">새 과제 등록</h2>
                  <p className="text-xs sm:text-sm text-[#514536] dark:text-[#d6c4b0]">
                    과제 정보를 입력하거나 AI 자연어로 빠르게 등록하세요.
                  </p>
                </div>
              </div>
            </div>

            {/* Input Mode Tabs */}
            <div className="flex gap-2 p-1.5 bg-[#efeded] dark:bg-[#302c29] rounded-full">
              <button
                type="button"
                className={`flex-1 py-2.5 px-4 rounded-full font-heading text-sm font-bold transition-all ${
                  inputMode === 'manual'
                    ? 'bg-white dark:bg-[#1b1c1c] text-[#1b1c1c] dark:text-white shadow-sm'
                    : 'text-[#514536] dark:text-[#d6c4b0]'
                }`}
                onClick={() => setInputMode('manual')}
              >
                ✏️ 직접 입력
              </button>
              <button
                type="button"
                className={`flex-1 py-2.5 px-4 rounded-full font-heading text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                  inputMode === 'ai'
                    ? 'bg-[#ffb84d] text-[#514536] shadow-sm'
                    : 'text-[#514536] dark:text-[#d6c4b0]'
                }`}
                onClick={() => setInputMode('ai')}
              >
                <Bot className="w-4 h-4" />
                <span>✨ AI 자연어 빠른 입력</span>
              </button>
            </div>

            {/* AI Natural Language Input Tab */}
            {inputMode === 'ai' && (
              <div className="flex flex-col gap-3 p-5 bg-[#ffb84d]/15 dark:bg-[#633f00]/30 rounded-2xl border border-[#ffb84d]/30">
                <label className="text-xs font-bold text-[#825500] dark:text-[#ffb951] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> 자연어 문구 입력 (예: &quot;다음주 금요일 18시까지 컴퓨터 구조 과제&quot;)
                </label>
                <div className="dino-input-wrap">
                  <input
                    value={naturalInput}
                    onChange={(e) => setNaturalInput(e.target.value)}
                    placeholder="예: 내일 모레까지 데이터베이스 실습 리포트"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAiParse()
                      }
                    }}
                  />
                </div>
                {errors.natural && <p className="text-xs text-[#ba1a1a] font-bold">{errors.natural}</p>}
                <button
                  type="button"
                  className="btn-yellow-3d self-end px-5 py-2.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  onClick={handleAiParse}
                  disabled={isParsingAi}
                >
                  {isParsingAi ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>디노가 분석 중...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI로 정보 쏙 채우기</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {aiParseMessage && (
              <div className="flex items-center gap-2 text-xs font-bold text-[#416837] dark:text-[#a6d296] bg-[#bfecae]/40 dark:bg-[#2a4f21]/40 p-3 rounded-xl border border-[#bfecae]">
                <CheckCircle2 className="w-4 h-4 flex-none" />
                <span>{aiParseMessage}</span>
              </div>
            )}

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-[#514536] dark:text-[#d6c4b0]">
                  <label htmlFor="title">과제명</label>
                  <span>{title.length} / 50</span>
                </div>
                <div className={`dino-input-wrap ${errors.title || errors.duplicate ? 'has-error' : ''}`}>
                  <input
                    id="title"
                    value={title}
                    maxLength={50}
                    onChange={(e) => {
                      setTitle(e.target.value)
                      setErrors((cur) => ({ ...cur, title: undefined, duplicate: undefined }))
                    }}
                    placeholder="예: 정보보안 실습 보고서"
                  />
                </div>
                {errors.title && <p className="text-xs text-[#ba1a1a] font-bold">{errors.title}</p>}
                {errors.duplicate && <p className="text-xs text-[#ba1a1a] font-bold">{errors.duplicate}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="dueDate" className="text-xs font-bold text-[#514536] dark:text-[#d6c4b0]">
                  마감일
                </label>
                <div className={`dino-input-wrap ${errors.dueDate ? 'has-error' : ''}`}>
                  <CalendarDays className="w-4 h-4 text-[#514536] dark:text-[#d6c4b0] ml-1" />
                  <input
                    id="dueDate"
                    type="date"
                    min={today}
                    value={dueDate}
                    onChange={(e) => {
                      setDueDate(e.target.value)
                      setErrors((cur) => ({ ...cur, dueDate: undefined, duplicate: undefined }))
                    }}
                  />
                </div>
                {errors.dueDate && <p className="text-xs text-[#ba1a1a] font-bold">{errors.dueDate}</p>}
              </div>

              <button
                type="submit"
                className="btn-yellow-3d py-4 font-heading text-base font-bold flex items-center justify-center gap-2 cursor-pointer mt-2"
                disabled={isSubmitting}
              >
                <Plus className="w-5 h-5" />
                <span>과제 등록하기</span>
              </button>
            </form>
          </section>
        </div>

        {/* Assignment List Section */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <h2 className="font-heading text-2xl font-bold">등록된 과제 목록</h2>
              <span className="px-3 py-1 bg-[#bfecae] dark:bg-[#2a4f21] text-[#416837] dark:text-[#a6d296] rounded-full text-xs font-extrabold font-heading">
                {assignments.length}개
              </span>
              {urgentCount > 0 && (
                <span className="px-3 py-1 bg-[#ffdad6] text-[#ba1a1a] rounded-full text-xs font-bold inline-flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" /> 긴급 {urgentCount}개
                </span>
              )}
            </div>
          </div>

          {/* Search and Filters */}
          {assignments.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="dino-input-wrap w-full sm:max-w-xs !py-1">
                <Search className="w-4 h-4 text-[#514536] dark:text-[#d6c4b0] ml-1 flex-none" />
                <input
                  type="text"
                  placeholder="과제명 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex gap-1.5 flex-wrap w-full sm:w-auto">
                <button
                  type="button"
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold font-heading transition-all ${
                    filterMode === 'all'
                      ? 'bg-[#825500] text-white shadow-[0_2px_0_0_#633f00]'
                      : 'bg-[#efeded] dark:bg-[#302c29] text-[#514536] dark:text-[#d6c4b0]'
                  }`}
                  onClick={() => setFilterMode('all')}
                >
                  전체 ({assignments.length})
                </button>
                <button
                  type="button"
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold font-heading transition-all ${
                    filterMode === 'urgent'
                      ? 'bg-[#ff8a80] text-[#5c0000] shadow-[0_2px_0_0_#c25950]'
                      : 'bg-[#efeded] dark:bg-[#302c29] text-[#514536] dark:text-[#d6c4b0]'
                  }`}
                  onClick={() => setFilterMode('urgent')}
                >
                  🔥 마감 임박
                </button>
                <button
                  type="button"
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold font-heading transition-all ${
                    filterMode === 'guide'
                      ? 'bg-[#ffb84d] text-[#514536] shadow-[0_2px_0_0_#c2882c]'
                      : 'bg-[#efeded] dark:bg-[#302c29] text-[#514536] dark:text-[#d6c4b0]'
                  }`}
                  onClick={() => setFilterMode('guide')}
                >
                  🤖 AI 가이드
                </button>
                <button
                  type="button"
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold font-heading transition-all ${
                    filterMode === 'completed'
                      ? 'bg-[#bfecae] text-[#1b4d1b] shadow-[0_2px_0_0_#7cae6b]'
                      : 'bg-[#efeded] dark:bg-[#302c29] text-[#514536] dark:text-[#d6c4b0]'
                  }`}
                  onClick={() => setFilterMode('completed')}
                >
                  ✅ 완료됨
                </button>
              </div>
            </div>
          )}

          {/* Cards List */}
          {assignments.length === 0 ? (
            <div className="dino-card p-12 text-center flex flex-col items-center gap-3">
              <img
                src={DINO_LOGO_URL}
                alt="Empty dino"
                className="w-16 h-16 object-contain opacity-60 animate-dino-float"
              />
              <h3 className="font-heading text-lg font-bold">아직 등록된 과제가 없어요!</h3>
              <p className="text-sm text-[#514536] dark:text-[#d6c4b0]">
                위 폼에서 과제명과 마감일을 입력하고 디노와 함께 시작해보세요.
              </p>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="dino-card p-10 text-center flex flex-col items-center gap-2">
              <HelpCircle className="w-10 h-10 text-[#ffb84d]" />
              <h3 className="font-heading text-base font-bold">조건에 맞는 과제가 없어요.</h3>
              <p className="text-xs text-[#514536] dark:text-[#d6c4b0]">검색어나 필터를 변경해보세요.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredAssignments.map((assignment) => {
                const days = getDaysLeft(assignment.dueDate)
                const urgency = getUrgencyInfo(days)
                const guide = aiGuides[assignment.id]
                const isGuideOpen = activeGuideId === assignment.id
                const isLoadingThisGuide = loadingGuideId === assignment.id
                const completionRate = guide ? getCompletionPercentage(assignment.id, guide.breakdown.length) : 0
                const isCompleted = completionRate === 100

                return (
                  <article
                    key={assignment.id}
                    className={`dino-card p-5 sm:p-6 flex flex-col gap-4 ${urgency.cardClass}`}
                  >
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-full bg-[#efeded] dark:bg-[#302c29] flex items-center justify-center text-[#825500] dark:text-[#ffb951] flex-none">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={`font-heading text-base sm:text-lg font-bold break-all ${isCompleted ? 'line-through opacity-60' : ''}`}>
                              {assignment.title}
                            </h3>
                            <span className="text-xs font-bold px-2.5 py-0.5 bg-[#efeded] dark:bg-[#302c29] text-[#514536] dark:text-[#d6c4b0] rounded-full">
                              {urgency.label}
                            </span>
                            {isCompleted && (
                              <span className="text-xs font-bold px-2 py-0.5 bg-[#bfecae] text-[#1b4d1b] rounded-full inline-flex items-center gap-1">
                                <Check className="w-3 h-3 stroke-[3]" /> 완료
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#514536] dark:text-[#d6c4b0] flex items-center gap-1">
                            <CalendarDays className="w-3.5 h-3.5" />
                            마감일: {formatDate(assignment.dueDate)}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2.5 flex-none ml-auto">
                        <DdayBadge days={days} />
                        <button
                          type="button"
                          className="btn-yellow-3d px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                          onClick={() => handleToggleAiGuide(assignment)}
                          disabled={isLoadingThisGuide}
                          title="디노의 AI 학습 코치 가이드"
                        >
                          {isLoadingThisGuide ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Bot className="w-3.5 h-3.5" />
                          )}
                          <span>디노 AI 가이드</span>
                          {isGuideOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          className="w-8 h-8 rounded-full bg-[#efeded] dark:bg-[#302c29] text-[#514536] dark:text-[#d6c4b0] hover:bg-[#ba1a1a] hover:text-white flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
                          onClick={() => {
                            setAssignments((cur) => cur.filter((item) => item.id !== assignment.id))
                            if (activeGuideId === assignment.id) setActiveGuideId(null)
                          }}
                          aria-label="과제 삭제"
                        >
                          &times;
                        </button>
                      </div>
                    </div>

                    {/* Urgency Progress Bar */}
                    <div className="w-full h-2 bg-[#efeded] dark:bg-[#302c29] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${urgency.barPercent}%`,
                          backgroundColor: urgency.barColor,
                        }}
                      />
                    </div>

                    {/* AI Guide Expandable Card */}
                    {isGuideOpen && guide && (
                      <div className="mt-2 p-5 bg-[#ffb84d]/10 dark:bg-[#633f00]/20 rounded-2xl border border-[#ffb84d]/30 flex flex-col gap-4 animate-fade-in-up">
                        <div className="flex items-center justify-between border-b border-[#ffb84d]/30 pb-3">
                          <div className="flex items-center gap-2 font-heading text-sm font-bold text-[#825500] dark:text-[#ffb951]">
                            <img src={DINO_LOGO_URL} alt="Dino coach" className="w-6 h-6 object-contain" />
                            <span>디노의 맞춤 학습 코칭 노트</span>
                          </div>
                          <span className="text-xs font-bold px-2 py-0.5 bg-[#ffb84d] text-[#514536] rounded-full">
                            Gemini 3.6 AI
                          </span>
                        </div>

                        {/* Motivation */}
                        <div className="p-3 bg-white dark:bg-[#1b1c1c] rounded-xl text-xs sm:text-sm text-[#825500] dark:text-[#ffb951] leading-relaxed border border-[#ffb84d]/20">
                          💡 <strong>디노의 한마디:</strong> {guide.motivation}
                        </div>

                        {/* Today Task */}
                        <div className="p-3 bg-[#bfecae]/40 dark:bg-[#2a4f21]/40 rounded-xl text-xs sm:text-sm text-[#416837] dark:text-[#a6d296] leading-relaxed border border-[#bfecae]/60">
                          🎯 <strong>오늘 꼭 끝낼 핵심 액션:</strong> {guide.todayTask}
                        </div>

                        {/* Checklist & Progress */}
                        <div className="flex flex-col gap-2.5">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="flex items-center gap-1 font-heading">
                              <CheckCircle2 className="w-4 h-4 text-[#416837] dark:text-[#a6d296]" />
                              3단계 실행 퀘스트
                            </span>
                            <span className="text-[#825500] dark:text-[#ffb951] font-heading font-extrabold">
                              달성률 {completionRate}%
                            </span>
                          </div>

                          <div className="w-full h-2 bg-white dark:bg-[#1b1c1c] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#ffb84d] transition-all duration-300"
                              style={{ width: `${completionRate}%` }}
                            />
                          </div>

                          {isCompleted && (
                            <div className="p-3 bg-[#bfecae] text-[#1b4d1b] rounded-xl text-xs font-bold flex items-center gap-2">
                              <PartyPopper className="w-4 h-4 flex-none" />
                              <span>🎉 대단해요! 모든 퀘스트를 완료했습니다. 이제 과제를 제출해보세요!</span>
                            </div>
                          )}

                          <div className="flex flex-col gap-2 mt-1">
                            {guide.breakdown.map((item, idx) => {
                              const isStepChecked = Boolean(checklistProgress[assignment.id]?.[idx])
                              return (
                                <div
                                  key={idx}
                                  className={`flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-[#1b1c1c] border border-[#e4e2e2] dark:border-[#302c29] cursor-pointer transition-all hover:border-[#ffb84d] ${
                                    isStepChecked ? 'opacity-60 line-through' : ''
                                  }`}
                                  onClick={() => toggleStep(assignment.id, idx)}
                                >
                                  <div
                                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                                      isStepChecked
                                        ? 'bg-[#416837] border-[#416837] text-white'
                                        : 'border-[#514536] dark:border-[#d6c4b0]'
                                    }`}
                                  >
                                    {isStepChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                  </div>
                                  <span className="w-5 h-5 rounded-full bg-[#ffb84d] text-[#514536] text-[11px] font-bold flex items-center justify-center flex-none">
                                    {item.step}
                                  </span>
                                  <span className="text-xs sm:text-sm font-medium flex-1 text-[#1b1c1c] dark:text-[#fbf9f8]">
                                    {item.task}
                                  </span>
                                  <span className="text-[11px] text-[#514536] dark:text-[#d6c4b0] px-2 py-0.5 bg-[#efeded] dark:bg-[#302c29] rounded-md flex-none">
                                    {item.duration}
                                  </span>
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

        {/* Social Proof Quote Card */}
        <section className="flex flex-col items-center justify-center gap-4 py-8 px-6 bg-[#bfecae]/25 dark:bg-[#2a4f21]/30 rounded-[2.5rem] text-center border border-[#bfecae]/40">
          <div className="flex gap-1 text-[#ffb84d]">
            <Star className="w-5 h-5 fill-current" />
            <Star className="w-5 h-5 fill-current" />
            <Star className="w-5 h-5 fill-current" />
            <Star className="w-5 h-5 fill-current" />
            <Star className="w-5 h-5 fill-current" />
          </div>
          <blockquote className="font-heading text-base sm:text-lg italic font-bold text-[#416837] dark:text-[#a6d296] max-w-xl">
            &quot;Deadline-Counter 덕분에 과제 하는 게 즐거워졌어요! 매일 귀여운 선인장 공룡 만나는 재미에 공부 앱을 켜게 돼요.&quot;
          </blockquote>
          <span className="text-xs text-[#514536] dark:text-[#d6c4b0] font-bold">지우 (대학생) • 3개월 차 유저</span>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 text-center text-xs text-[#514536] dark:text-[#d6c4b0] border-t border-[#e4e2e2] dark:border-[#302c29] flex flex-col items-center justify-center gap-1">
        <p className="flex items-center gap-1 font-bold">
          <Sparkles className="w-3.5 h-3.5 text-[#ffb84d]" />
          Deadline-Counter &copy; {new Date().getFullYear()} • 선인장 공룡 디노와 함께하는 스마트 과제 카운터
        </p>
      </footer>
    </div>
  )
}

export default DeadlineCounter

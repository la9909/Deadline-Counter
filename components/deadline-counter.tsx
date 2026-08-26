'use client'

import { FormEvent, useMemo, useState } from 'react'
import { CalendarDays, ClipboardList, Plus, Sparkles } from 'lucide-react'

interface Assignment {
  id: number
  title: string
  dueDate: string
}

type FormErrors = Partial<Record<'title' | 'dueDate' | 'duplicate', string>>

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
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const today = getToday()

  const sortedAssignments = useMemo(
    () => [...assignments].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [assignments],
  )

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
    setIsSubmitting(false)
  }

  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground sm:px-8 sm:py-16">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-10">
        <header className="flex flex-col gap-4">
          <div className="brand-mark" aria-hidden="true">
            <CalendarDays />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">과제 마감 카운터</h1>
            <p className="text-base leading-6 text-muted-foreground">마감일까지 얼마나 남았는지 확인해보세요.</p>
          </div>
        </header>

        <section className="form-card" aria-labelledby="new-assignment-title">
          <div className="flex items-start gap-4">
            <div className="section-icon">
              <Sparkles />
            </div>
            <div className="flex flex-col gap-1">
              <h2 id="new-assignment-title" className="text-lg font-semibold">새 과제 등록</h2>
              <p className="text-sm text-muted-foreground">과제명과 마감일을 입력하고 등록해보세요.</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-5" noValidate>
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
        </section>

        <section className="flex flex-col gap-5" aria-labelledby="upcoming-title">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 id="upcoming-title" className="text-xl font-semibold tracking-[-0.02em]">등록된 과제</h2>
              {assignments.length > 0 && <span className="count-badge">{assignments.length}개</span>}
            </div>
          </div>
          {sortedAssignments.length > 0 ? (
            <div className="flex flex-col gap-3">
              {sortedAssignments.map((assignment) => {
                const days = getDaysLeft(assignment.dueDate)
                return (
                  <article className="assignment-card" key={assignment.id}>
                    <div className="assignment-info">
                      <div className="assignment-icon">
                        <ClipboardList />
                      </div>
                      <div className="flex min-w-0 flex-col gap-2">
                        <h3 className="truncate text-[15px] font-medium">{assignment.title}</h3>
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <CalendarDays aria-hidden="true" />
                          {formatDate(assignment.dueDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <DdayBadge days={days} />
                    </div>
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
              <p>마감일을 확인할 과제를 등록해보세요.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default DeadlineCounter


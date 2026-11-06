// 학습 기록(LearningActivity)으로 집중도 통계를 만든다.
// 학습 탭의 집중도 리포트(ConcentrationTab)와 학습 패턴 탭 요약 카드에서 같이 쓴다.
import { normalizeReportSubject } from './reportSubjects'

export const SCORE_MAX = 5

// 집중도 별점(1~5) → 단계
export function concentrationLevel(score) {
  if (score == null || Number.isNaN(score)) return { label: '기록 없음', color: '#94A3B8' }
  if (score >= 4) return { label: '집중 좋음', color: '#00C49A' }
  if (score >= 3) return { label: '보통', color: '#1A56DB' }
  if (score >= 2) return { label: '흔들림', color: '#FFB800' }
  return { label: '집중 부족', color: '#FF3B3B' }
}

// 카메라 측정 상태별 색
export const STATE_COLORS = {
  focused: '#00C49A',
  unfocused: '#CBD5E1',
  drowsy: '#FF8A3D',
}

const round1 = (n) => Math.round(n * 10) / 10
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null)
const isRatio = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1

function hourOf(time) {
  if (typeof time !== 'string') return null
  const h = Number(time.slice(0, 2))
  return Number.isInteger(h) && h >= 0 && h < 24 ? h : null
}

// API 응답을 화면에서 쓰기 좋은 형태로 정리 (오래된 기록 → 최근 기록 순)
export function normalizeActivities(data) {
  const list = Array.isArray(data) ? data : (data?.activities ?? [])
  return list
    .filter(a => a && Number(a.concentrationScore) >= 1 && Number(a.concentrationScore) <= SCORE_MAX)
    .map(a => {
      // 카메라 기록인데 비율이 없거나 잘못된 경우에는 비율을 쓰지 않는다
      const camera = a.measurementSource === 'CAMERA' && isRatio(a.focusedRatio) && isRatio(a.drowsyRatio)
        && a.focusedRatio + a.drowsyRatio <= 1.0001
      return {
        id: a.id,
        subject: normalizeReportSubject(a.subject) || a.subject || '기타',
        date: a.studyDate ?? '',
        hour: hourOf(a.studyStartTime),
        startTime: typeof a.studyStartTime === 'string' ? a.studyStartTime.slice(0, 5) : null,
        minutes: Number(a.studyDurationMinutes) || 0,
        concentration: Number(a.concentrationScore),
        understanding: Number(a.understandingScore) || null,
        feedback: a.instructorFeedback || null,
        source: camera ? 'CAMERA' : 'MANUAL',
        focused: camera ? a.focusedRatio : null,
        drowsy: camera ? a.drowsyRatio : null,
        unfocused: camera ? Math.max(0, 1 - a.focusedRatio - a.drowsyRatio) : null,
      }
    })
    .sort((a, b) =>
      a.date === b.date
        ? (a.hour ?? 0) - (b.hour ?? 0) || (a.id ?? 0) - (b.id ?? 0)
        : a.date < b.date ? -1 : 1,
    )
}

export function summarizeConcentration(activities) {
  const list = activities ?? []
  const totalMinutes = list.reduce((s, a) => s + a.minutes, 0)
  const average = avg(list.map(a => a.concentration))

  // 과목별 평균
  const bySubjectMap = {}
  list.forEach(a => {
    const s = (bySubjectMap[a.subject] ??= { subject: a.subject, scores: [], minutes: 0 })
    s.scores.push(a.concentration)
    s.minutes += a.minutes
  })
  const bySubject = Object.values(bySubjectMap)
    .map(s => ({ subject: s.subject, average: round1(avg(s.scores)), sessions: s.scores.length, minutes: s.minutes }))
    .sort((a, b) => b.average - a.average || b.minutes - a.minutes)

  // 시간대별 평균 (공부 시작 시각 기준)
  const byHourMap = {}
  list.forEach(a => {
    if (a.hour == null) return
    ;(byHourMap[a.hour] ??= []).push(a.concentration)
  })
  const byHour = Object.entries(byHourMap)
    .map(([h, scores]) => ({ hour: Number(h), label: `${h}시`, average: round1(avg(scores)), sessions: scores.length }))
    .sort((a, b) => a.hour - b.hour)
  const bestHour = byHour.reduce((best, h) => (!best || h.average > best.average ? h : best), null)

  // 최근 3회와 그 이전 비교
  let trend = null
  if (list.length >= 4) {
    const recent = avg(list.slice(-3).map(a => a.concentration))
    const before = avg(list.slice(0, -3).map(a => a.concentration))
    trend = round1(recent - before)
  }

  // 카메라 측정 기록 (공부 시간으로 가중 평균)
  const cameraList = list.filter(a => a.source === 'CAMERA')
  let camera = null
  if (cameraList.length) {
    const weight = (a) => a.minutes || 1
    const totalWeight = cameraList.reduce((s, a) => s + weight(a), 0)
    const weighted = (key) => cameraList.reduce((s, a) => s + a[key] * weight(a), 0) / totalWeight
    camera = {
      sessions: cameraList.length,
      minutes: cameraList.reduce((s, a) => s + a.minutes, 0),
      focused: weighted('focused'),
      drowsy: weighted('drowsy'),
      unfocused: weighted('unfocused'),
    }
  }

  return {
    sessions: list.length,
    totalMinutes,
    average: average == null ? null : round1(average),
    bySubject,
    byHour,
    bestHour,
    trend,
    lowSessions: list.filter(a => a.concentration <= 2).length,
    camera,
  }
}

// 요약 수치로 짧은 안내 문장을 만든다 (규칙 기반, AI 서버 불필요)
export function concentrationInsights(summary) {
  if (!summary || summary.sessions === 0) return []
  const tips = []
  const { bySubject, bestHour, trend, lowSessions, sessions, camera } = summary

  if (camera) {
    const focusedPct = Math.round(camera.focused * 100)
    const drowsyPct = Math.round(camera.drowsy * 100)
    if (camera.drowsy >= 0.25) {
      tips.push(`카메라로 측정한 공부 시간 중 ${drowsyPct}%가 졸음 상태였어요. 잠이 부족하지 않은지, 공부 시간을 옮겨 볼 수 있는지 확인해 보세요.`)
    } else {
      tips.push(`카메라로 측정한 공부 시간 중 ${focusedPct}%를 집중한 상태로 보냈어요.`)
    }
  }
  if (bySubject.length >= 2) {
    const top = bySubject[0]
    const low = bySubject[bySubject.length - 1]
    if (top.average > low.average) {
      tips.push(`${top.subject} 시간에 가장 집중을 잘하고, ${low.subject} 시간에는 집중이 떨어지는 편이에요.`)
    }
  }
  if (bestHour && summary.byHour.length >= 2) {
    tips.push(`${bestHour.label}에 시작한 공부의 집중도가 가장 높았어요. 어려운 과목을 이 시간에 배치해 보세요.`)
  }
  if (trend != null) {
    if (trend >= 0.5) tips.push('최근 세 번의 공부에서 집중도가 이전보다 올라갔어요. 👏')
    else if (trend <= -0.5) tips.push('최근 세 번의 공부에서 집중도가 이전보다 내려갔어요. 컨디션이나 공부 환경을 확인해 보세요.')
  }
  if (lowSessions > 0 && lowSessions / sessions >= 0.4) {
    tips.push(`최근 기록 ${sessions}번 중 ${lowSessions}번이 집중도 2점 이하예요. 공부 시간을 짧게 나눠 보는 것도 방법이에요.`)
  }
  return tips.slice(0, 3)
}

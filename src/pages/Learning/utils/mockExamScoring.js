/**
 * 수능·전국연합학력평가 모의고사 성적 산출 방식
 * 1) 표준점수 = 50 + 10 × (원점수 − 평균) / 표준편차
 * 2) 백분위 = 정규분포 누적확률 Φ((표준점수 − 50) / 10) × 100
 * 3) 등급 = 백분위 구간 (평가원 9등급 기준)
 */

/** 과목별 모의고사 집단 통계 (원점수 기준, 학원·학년 응시생 분포) */
export const MOCK_EXAM_COHORT = {
  국어: { mean: 72, stdDev: 12, maxScore: 100 },
  수학: { mean: 68, stdDev: 14, maxScore: 100 },
  영어: { mean: 70, stdDev: 13, maxScore: 100 },
  사회: { mean: 71, stdDev: 11, maxScore: 100 },
  과학: { mean: 69, stdDev: 12, maxScore: 100 },
}

/** 평가원 9등급 — 백분위 하한 (이상) */
export const SUNEUNG_GRADE_CUTOFFS = [
  { grade: 1, minPercentile: 96 },
  { grade: 2, minPercentile: 89 },
  { grade: 3, minPercentile: 77 },
  { grade: 4, minPercentile: 60 },
  { grade: 5, minPercentile: 40 },
  { grade: 6, minPercentile: 23 },
  { grade: 7, minPercentile: 11 },
  { grade: 8, minPercentile: 4 },
  { grade: 9, minPercentile: 0 },
]

/** 정규분포 누적분포 Φ(z) */
function normalCdf(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989423 * Math.exp(-z * z / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))))
  return z >= 0 ? 1 - p : p
}

/** 표준점수 (평가원 산출식, 정수 반올림) */
export function calcStandardScore(rawScore, mean, stdDev) {
  if (stdDev <= 0) return 50
  const z = (rawScore - mean) / stdDev
  const standard = 50 + 10 * z
  return Math.max(0, Math.min(150, Math.round(standard)))
}

/** 표준점수 → 백분위 (정규분포 가정, 정수 반올림) */
export function calcPercentileFromStandard(standardScore) {
  const z = (standardScore - 50) / 10
  const p = normalCdf(z) * 100
  return Math.max(0, Math.min(100, Math.round(p)))
}

/** 백분위 → 9등급 */
export function calcSuneungGrade(percentile) {
  for (const { grade, minPercentile } of SUNEUNG_GRADE_CUTOFFS) {
    if (percentile >= minPercentile) return grade
  }
  return 9
}

export function formatSuneungGrade(gradeNum) {
  return `${gradeNum}등급`
}

/** 과목별 모의고사 성적 산출 */
export function calcMockExamSubject(rawScore, subject) {
  const cohort = MOCK_EXAM_COHORT[subject]
  if (!cohort) return null

  const raw = Number(rawScore)
  if (Number.isNaN(raw)) return null

  const standard = calcStandardScore(raw, cohort.mean, cohort.stdDev)
  const percentile = calcPercentileFromStandard(standard)
  const gradeNum = calcSuneungGrade(percentile)

  return {
    subject,
    raw,
    standard,
    percentile,
    gradeNum,
    gradeLabel: formatSuneungGrade(gradeNum),
    cohort,
  }
}

/** 여러 과목 일괄 산출 */
export function calcMockExamScores(rawScoresBySubject) {
  return Object.entries(rawScoresBySubject).reduce((acc, [subject, raw]) => {
    if (raw === '' || raw == null || Number.isNaN(Number(raw))) return acc
    const result = calcMockExamSubject(raw, subject)
    if (result) acc[subject] = result
    return acc
  }, {})
}

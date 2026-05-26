import { apiCall } from './client'

export const analysisAPI = {
  getReport: (studentId, subject) =>
    apiCall(`/api/analysis/report?studentId=${studentId}&subject=${encodeURIComponent(subject)}`),

  getStudyPattern: (studentId) =>
    apiCall(`/api/analysis/study-pattern?studentId=${studentId}`),

  getStrengths: (studentId) =>
    apiCall(`/api/analysis/strengths?studentId=${studentId}`),

  getPredictedScore: (studentId, subjectId) =>
    apiCall(`/api/analysis/predict?studentId=${studentId}&subjectId=${subjectId}`),

  getMetaCognition: (studentId, subject) =>
    apiCall(`/api/analysis/meta-cognition?studentId=${studentId}&subject=${encodeURIComponent(subject)}`),

  getStudyPatternV2: (studentId) =>
    apiCall(`/api/analysis/study-pattern-v2?studentId=${studentId}`),

  getRiskAnalysis: (studentId) =>
    apiCall(`/api/analysis/risk?studentId=${studentId}`),
}
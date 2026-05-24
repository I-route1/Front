export const SUBJECTS = ['국어', '수학', '영어', '사회', '과학']
export const EXAM_TYPES = ['중간고사', '기말고사', '모의고사']
export const EXAM_TYPE_MOCK = '모의고사'
export const SUBJECT_COLORS = {
  국어:'#1A56DB', 수학:'#FF6B35', 영어:'#00C49A', 사회:'#9B59B6', 과학:'#FFB800',
}

/* 내신·단원평가 등급 (5등급, 점수 기준) */
export const getGrade = (score) => {
  if (score >= 96) return '1등급'
  if (score >= 89) return '2등급'
  if (score >= 77) return '3등급'
  if (score >= 60) return '4등급'
  return '5등급'
}
/* 백분위 추정 */
export const getPercentile = (score) => Math.min(99, Math.round(score * 0.9 + 5))

export const INIT_TREND = [
  { date:'24.03', 국어:78, 수학:62, 영어:85, 사회:70, 과학:74 },
  { date:'24.06', 국어:82, 수학:58, 영어:88, 사회:75, 과학:71 },
  { date:'24.09', 국어:80, 수학:67, 영어:84, 사회:78, 과학:76 },
  { date:'24.12', 국어:85, 수학:72, 영어:90, 사회:80, 과학:79 },
  { date:'25.03', 국어:83, 수학:76, 영어:91, 사회:82, 과학:83 },
]

export const WRONG_TYPES = [
  { type:'개념 부족', count:12, color:'#FF3B3B' },
  { type:'계산 실수', count:8,  color:'#FF6B35' },
  { type:'문제 이해', count:5,  color:'#FFB800' },
  { type:'시간 부족', count:3,  color:'#94A3B8' },
]

export const GOLDEN_TIME_DATA = [
  { time:'06시', focus:20 }, { time:'08시', focus:45 }, { time:'10시', focus:72 },
  { time:'12시', focus:38 }, { time:'14시', focus:55 }, { time:'16시', focus:88 },
  { time:'18시', focus:95 }, { time:'20시', focus:82 }, { time:'22시', focus:60 },
]

export const STUDY_TIME_DATA = [
  { subject:'수학', minutes:85, color:'#FF6B35' },
  { subject:'영어', minutes:70, color:'#00C49A' },
  { subject:'국어', minutes:50, color:'#1A56DB' },
  { subject:'과학', minutes:40, color:'#FFB800' },
  { subject:'사회', minutes:30, color:'#9B59B6' },
]

export const STRENGTH_AREAS = [
  { unit:'영어 독해', subject:'영어', accuracy:94, trend:'▲' },
  { unit:'문학 감상', subject:'국어', accuracy:89, trend:'▲' },
  { unit:'생물 분류', subject:'과학', accuracy:86, trend:'→' },
]

export const WEAK_AREAS = [
  { unit:'분수 나눗셈', subject:'수학', accuracy:42, trend:'▼' },
  { unit:'관계대명사',  subject:'영어', accuracy:55, trend:'▲' },
]

export const RECOMMEND_BOOKS = [
  { title:'개념 원리 수학 6-1', type:'문제집', match:96, subject:'수학', emoji:'📘' },
  { title:'EBS 영어 기초 인강', type:'인강',   match:91, subject:'영어', emoji:'🎬' },
  { title:'국어 비문학 100제',  type:'문제집', match:87, subject:'국어', emoji:'📗' },
]

export const INIT_DAILY_PLAN = [
  { id:1, subject:'수학', task:'분수 나눗셈 개념', time:40, done:true  },
  { id:2, subject:'영어', task:'관계대명사 예문 10개', time:25, done:true  },
  { id:3, subject:'수학', task:'연습문제 20선', time:30, done:false },
  { id:4, subject:'국어', task:'비문학 지문 2편', time:25, done:false },
  { id:5, subject:'과학', task:'물질 변화 정리', time:20, done:false },
]
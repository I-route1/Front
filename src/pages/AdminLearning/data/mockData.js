export const SUBJECTS = ['국어', '수학', '영어', '사회', '과학']

export const SUBJECT_COLORS = {
  국어:'#1A56DB', 수학:'#FF6B35', 영어:'#00C49A', 사회:'#9B59B6', 과학:'#FFB800',
}

export const STUDENTS = [
  // 🆕 백엔드 실제 데이터 학생 (성적 오름차순으로 배치)
  { id:'S-1686', name:'김위험', grade:'고1', class:'A반', avgScore:55, trend:'▼', trendVal:-8,
    scores:{ 국어:60, 수학:45, 영어:50, 사회:55, 과학:65 }, risk:'high' },
  { id:'S-0155', name:'이보통', grade:'고1', class:'B반', avgScore:72, trend:'→', trendVal:0,
    scores:{ 국어:70, 수학:68, 영어:75, 사회:72, 과학:75 }, risk:'low' },
  { id:'S-KOR',  name:'박우수', grade:'고1', class:'A반', avgScore:92, trend:'▲', trendVal:5,
    scores:{ 국어:95, 수학:88, 영어:90, 사회:93, 과학:94 }, risk:'low' },

  // 기존 mock 학생들 (백엔드 데이터 없음)
  { id:1, name:'홍민준', grade:'초6', class:'A반', avgScore:82, trend:'▲', trendVal:4,
    scores:{ 국어:83, 수학:76, 영어:91, 사회:82, 과학:83 }, risk:'low' },
  { id:2, name:'김지은', grade:'초6', class:'A반', avgScore:71, trend:'▼', trendVal:-8,
    scores:{ 국어:70, 수학:65, 영어:78, 사회:72, 과학:70 }, risk:'high' },
  { id:3, name:'박준서', grade:'초6', class:'B반', avgScore:88, trend:'▲', trendVal:6,
    scores:{ 국어:90, 수학:85, 영어:92, 사회:88, 과학:85 }, risk:'low' },
  { id:4, name:'이수아', grade:'초5', class:'B반', avgScore:75, trend:'→', trendVal:0,
    scores:{ 국어:78, 수학:70, 영어:80, 사회:74, 과학:73 }, risk:'low' },
  { id:5, name:'최유진', grade:'초5', class:'A반', avgScore:65, trend:'▼', trendVal:-11,
    scores:{ 국어:68, 수학:60, 영어:70, 사회:65, 과학:62 }, risk:'high' },
  { id:6, name:'정민호', grade:'초6', class:'C반', avgScore:79, trend:'▲', trendVal:3,
    scores:{ 국어:80, 수학:75, 영어:82, 사회:79, 과학:79 }, risk:'low' },
  { id:7, name:'강하은', grade:'초5', class:'C반', avgScore:91, trend:'▲', trendVal:5,
    scores:{ 국어:93, 수학:90, 영어:95, 사회:89, 과학:88 }, risk:'low' },
  { id:8, name:'윤서준', grade:'초6', class:'B반', avgScore:68, trend:'▼', trendVal:-6,
    scores:{ 국어:70, 수학:62, 영어:72, 사회:68, 과학:68 }, risk:'high' },
]

export const ACADEMY_STATS = {
  totalStudents: 11,   // 8 → 11
  avgScore: 76,
  topCount: 4,
  riskCount: 4,
}

export const SUBJECT_AVG = [
  { subject:'국어', avg:79, color:'#1A56DB' },
  { subject:'수학', avg:73, color:'#FF6B35' },
  { subject:'영어', avg:83, color:'#00C49A' },
  { subject:'사회', avg:77, color:'#9B59B6' },
  { subject:'과학', avg:76, color:'#FFB800' },
]

export const GRADE_DIST = [
  { grade:'1등급', count:2, color:'#1A56DB' },
  { grade:'2등급', count:2, color:'#00C49A' },
  { grade:'3등급', count:3, color:'#FFB800' },
  { grade:'4등급', count:3, color:'#FF6B35' },
  { grade:'5등급', count:1, color:'#FF3B3B' },
]

export const INIT_FEEDBACKS = [
  { id:1, studentId:1, studentName:'홍민준', teacher:'김수학 선생님', date:'5.19', text:'분수 단원 집중도 매우 좋았음. 계산 실수가 줄어드는 추세.' },
  { id:2, studentId:2, studentName:'김지은', teacher:'이영어 선생님', date:'5.18', text:'최근 결석 이후 집중력이 많이 떨어진 상태. 학부모 상담 필요.' },
  { id:3, studentId:3, studentName:'박준서', teacher:'김수학 선생님', date:'5.17', text:'모든 과목 고르게 우수. 상위권 대비 심화 문제 추가 제공 예정.' },
  { id:4, studentId:5, studentName:'최유진', teacher:'이영어 선생님', date:'5.16', text:'이해 속도가 느린 편. 보충 학습 필요하며 반 배정 재검토 권장.' },
]

export const AI_REPORTS = {
  // 🆕 백엔드 실제 학생 폴백 (API 실패 시)
  'S-1686': { summary:'성적 하락 추세가 명확하게 감지됩니다. 기초 학력 보강이 시급합니다.', strong:'과학 기초', weak:'수학, 영어 전반', recommend:'개별 맞춤 보충 학습 + 학부모 상담 진행 권장' },
  'S-0155': { summary:'평균적인 학습 수준으로 안정적입니다. 약점 과목 보완 시 상위권 진입 가능합니다.', strong:'영어, 과학', weak:'수학 응용', recommend:'수학 응용 문제 집중 훈련 4주 권장' },
  'S-KOR':  { summary:'전 과목 최상위권 유지 중입니다. 심화 학습 및 경시대회 준비 권장합니다.', strong:'전 과목 고른 강점', weak:'없음', recommend:'올림피아드/경시대회 심화반 추천' },

  // 기존 학생 폴백
  1: { summary:'전반적으로 안정적인 성적을 유지하고 있습니다. 수학 분수 영역 집중 보완 시 전체 평균 85점 달성 가능합니다.', strong:'영어 독해, 국어 문학', weak:'수학 분수', recommend:'분수 나눗셈 집중 훈련 2주 권장' },
  2: { summary:'최근 급격한 성적 하락이 감지되었습니다. 정서적 요인 점검 및 학부모 상담이 시급합니다.', strong:'영어 기초', weak:'수학 전반, 국어', recommend:'기초 개념 재학습 및 상담 병행 권장' },
  3: { summary:'전 과목 최상위권 유지 중입니다. 심화 학습으로 경시대회 준비를 권장합니다.', strong:'전 과목 고른 강점', weak:'없음', recommend:'올림피아드 준비 심화반 추천' },
  4: { summary:'전반적으로 평균적인 학습 수준입니다. 영어 강점을 활용한 타 과목 연계 학습이 효과적입니다.', strong:'영어', weak:'수학 연산', recommend:'영어 강점 활용 독해 확장 + 수학 연산 보완' },
  5: { summary:'기초 학력 부족이 다수 과목에서 나타납니다. 즉각적인 보충 학습 배정이 필요합니다.', strong:'없음', weak:'전 과목', recommend:'기초반 재배정 및 개별 맞춤 학습 설계 필요' },
  6: { summary:'꾸준한 성적 향상이 감지됩니다. 현재 학습 패턴을 유지하면 다음 시험 82점 예상됩니다.', strong:'국어, 영어', weak:'수학', recommend:'현 패턴 유지 + 수학 주 2회 추가 학습' },
  7: { summary:'최우수 학생입니다. 자기주도 학습 능력이 매우 뛰어나며 상위 0.1% 수준입니다.', strong:'전 과목 최상위', weak:'없음', recommend:'전국 단위 경시대회 출전 권장' },
  8: { summary:'성적 하락세가 지속되고 있습니다. 수학 기초 개념 점검이 우선 필요합니다.', strong:'국어', weak:'수학, 영어', recommend:'수학 기초 개념 집중 보충 + 규칙적 학습 습관 형성' },
}
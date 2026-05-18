import { useState } from 'react';

// 🚀 [수정 완료!] 사진 주소(photo)만 보내주신 샘플과 비슷한 느낌의 고유한 3D 아바타 주소로 각각 수정했습니다.
const INITIAL_STUDENTS = [
    { id: 1, name: '김민준', school: '경산초', grade: '3학년', stop: '사동 푸르지오', status: 'waiting', photo: '/images/s1.png' },
    { id: 2, name: '이서윤', school: '사동초', grade: '1학년', stop: '사동 푸르지오', status: 'waiting', photo: '/images/s2.png' },
    { id: 3, name: '박도윤', school: '경산초', grade: '4학년', stop: '백천 삼산타운', status: 'boarded', photo: '/images/s3.png' },
    { id: 4, name: '최지우', school: '평산초', grade: '2학년', stop: '우미린 아파트', status: 'absent', photo: '/images/s4.png' },
    { id: 5, name: '정예준', school: '사동초', grade: '2학년', stop: '사동 푸르지오', status: 'waiting', photo: '/images/s5.png' },
    { id: 6, name: '한지아', school: '경산초', grade: '1학년', stop: '백천 삼산타운', status: 'waiting', photo: '/images/s6.png' },
    { id: 7, name: '강우진', school: '평산초', grade: '3학년', stop: '우미린 아파트', status: 'waiting', photo: '/images/s7.png' },
    { id: 8, name: '윤서진', school: '사동초', grade: '4학년', stop: '사동 푸르지오', status: 'waiting', photo: '/images/s8.png' },
    { id: 9, name: '임지훈', school: '경산초', grade: '2학년', stop: '백천 삼산타운', status: 'waiting', photo: '/images/s9.png' },
    { id: 10, name: '신하은', school: '평산초', grade: '1학년', stop: '우미린 아파트', status: 'waiting', photo: '/images/s10.png' }
];

export default function DriverBoardingList() {
    const [students, setStudents] = useState(INITIAL_STUDENTS);
    const [selectedId, setSelectedId] = useState(null);
    const [filter, setFilter] = useState(''); // 드롭다운 필터 상태 (유지)

    // 2. 상태 제출 함수 (유지)
    const handleStatusSubmit = (studentId, newStatus) => {
        // [백엔드 연동 자리] (유지)
        const targetStudent = students.find(s => s.id === studentId);
        console.log(`📡 [서버로 데이터 전송] ID: ${studentId}, 이름: ${targetStudent.name}, 변경할 상태: ${newStatus}`);

        // 화면에 보이는 상태 업데이트 (유지)
        setStudents(prevStudents =>
            prevStudents.map(student =>
                student.id === studentId ? { ...student, status: newStatus } : student
            )
        );

        // 처리가 끝났으니 인라인 버튼 숨기기
        setSelectedId(null);
    };

    // 3. 필터링 및 정렬 로직 (유지)
    const filteredStudents = students
        .filter(student => (filter === '' || student.stop === filter)) // 동별 필터링
        .sort((a, b) => a.stop.localeCompare(b.stop)); // 같은 정류장끼리 모으기

    return (
        <div style={{ background: '#F3F4F6', minHeight: '100vh', padding: '20px', paddingBottom: '80px' }}>

            {/* 상단 헤더 (유지) */}
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '28px', color: '#111', fontWeight: '900' }}>오늘의 탑승 명단 🚌</h2>
                <p style={{ margin: '8px 0 0', fontSize: '16px', color: '#666' }}>원생을 터치하여 탑승 여부를 바로 처리하세요.</p>
            </div>

            {/* 동 선택 드롭다운 (유지) */}
            <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', color: '#111', fontWeight: 'bold', marginBottom: '8px' }}>동 선택</h3>
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', background: 'white', fontSize: '16px' }}
                >
                    <option value="">전체</option>
                    <option value="사동 푸르지오">사동 푸르지오</option>
                    <option value="백천 삼산타운">백천 삼산타운</option>
                    <option value="우미린 아파트">우미린 아파트</option>
                </select>
            </div>

            {/* 학생 리스트 (세로 스크롤 가능) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {filteredStudents.map(student => {
                    const isEditing = student.id === selectedId; // 현재 이 카드가 버튼 모드인지 확인

                    return (
                        <div
                            key={student.id}
                            onClick={() => {
                                if (!isEditing) {
                                    setSelectedId(student.id);
                                }
                            }}
                            style={{
                                background: 'white',
                                padding: isEditing ? '0' : '20px',
                                borderRadius: '16px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: isEditing ? '0' : '20px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease-in-out',
                                overflow: 'hidden', // 버튼이 튀어나가지 않게
                                minHeight: '120px' // 카드 최소 높이 유지
                            }}
                        >
                            {/* 버튼 모드(`isEditing`)일 때와 일반 모드일 때의 렌더링 분기 */}
                            {isEditing ? (
                                // 🛑 [인라인 버튼 모드] 카드 크기 그대로 반반 탑승/미탑승 버튼
                                <div style={{ display: 'flex', width: '100%', height: '120px' }}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation(); // 카드 자체 onClick 방지
                                            handleStatusSubmit(student.id, 'boarded');
                                        }}
                                        style={{ flex: 1, border: 'none', background: '#3B82F6', color: 'white', fontSize: '24px', fontWeight: '900', cursor: 'pointer' }}
                                    >
                                        탑승
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation(); // 카드 자체 onClick 방지
                                            handleStatusSubmit(student.id, 'absent');
                                        }}
                                        style={{ flex: 1, border: 'none', background: '#EF4444', color: 'white', fontSize: '24px', fontWeight: '900', cursor: 'pointer' }}
                                    >
                                        미탑승
                                    </button>
                                </div>
                            ) : (
                                // ✅ [일반 학생 정보 모드] (기존 UI 유지)
                                <>
                                    {/* 학생 아바타 (유지, 주소만 샘플 스타일로 변경됨) */}
                                    <img
                                        src={student.photo}
                                        alt={student.name}
                                        style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#E5E7EB', objectFit: 'cover' }}
                                    />

                                    {/* 학생 정보 (유지) */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '18px', color: '#4B5563', fontWeight: '600', marginBottom: '8px' }}>📍 {student.stop}</div>
                                        <div style={{ fontSize: '28px', fontWeight: '900', color: '#111' }}>{student.name}</div>
                                    </div>

                                    {/* 상태 뱃지 (유지) */}
                                    <div>
                                        {student.status === 'boarded' && <span style={{ padding: '8px 14px', background: '#D1FAE5', color: '#065F46', borderRadius: '8px', fontWeight: '900', fontSize: '18px' }}>탑승 완료</span>}
                                        {student.status === 'absent' && <span style={{ padding: '8px 14px', background: '#FEE2E2', color: '#991B1B', borderRadius: '8px', fontWeight: '900', fontSize: '18px' }}>미탑승</span>}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
import { useState } from 'react';

// 임시
const INITIAL_STUDENTS = [
    { id: 1, name: '김민준', school: '경산초', grade: '3학년', stop: '푸르지오', status: 'waiting', photo: '/images/s1.png' },
    { id: 2, name: '이서윤', school: '사동초', grade: '1학년', stop: '계양네거리', status: 'waiting', photo: '/images/s2.png' },
    { id: 3, name: '박도윤', school: '경산초', grade: '4학년', stop: '영남대역', status: 'boarded', photo: '/images/s3.png' },
    { id: 4, name: '최지우', school: '평산초', grade: '2학년', stop: '압량우미린', status: 'absent', photo: '/images/s4.png' },
    { id: 5, name: '정예준', school: '사동초', grade: '2학년', stop: '푸르지오', status: 'waiting', photo: '/images/s5.png' },
    { id: 6, name: '한지아', school: '경산초', grade: '1학년', stop: '계양네거리', status: 'waiting', photo: '/images/s6.png' },
    { id: 7, name: '강우진', school: '평산초', grade: '3학년', stop: '영남대역', status: 'waiting', photo: '/images/s7.png' },
    { id: 8, name: '윤서진', school: '사동초', grade: '4학년', stop: '압량우미린', status: 'waiting', photo: '/images/s8.png' },
    { id: 9, name: '임지훈', school: '경산초', grade: '2학년', stop: '푸르지오', status: 'waiting', photo: '/images/s9.png' },
    { id: 10, name: '신하은', school: '평산초', grade: '1학년', stop: '계양네거리', status: 'waiting', photo: '/images/s10.png' }
];

export default function DriverBoardingList() {
    const [students] = useState(INITIAL_STUDENTS);
    const [filter, setFilter] = useState('');

    const filteredStudents = students
        .filter(student => (filter === '' || student.stop === filter))
        .sort((a, b) => a.stop.localeCompare(b.stop));

    return (
        <div style={{ background: '#F3F4F6', minHeight: '100vh', padding: '20px', paddingBottom: '80px' }}>

            {/* 상단 헤더 */}
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '28px', color: '#111', fontWeight: '900' }}>오늘의 탑승 명단</h2>
                <p style={{ margin: '8px 0 0', fontSize: '16px', color: '#666' }}>오늘의 탑승 예정 학생 리스트를 조회하세요.</p>
            </div>

            {/*정류장 필터 드롭다운 옵션 동기화 */}
            <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', color: '#111', fontWeight: 'bold', marginBottom: '8px' }}>정류장 선택</h3>
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', background: 'white', fontSize: '16px' }}
                >
                    <option value="">전체 노선</option>
                    <option value="푸르지오">푸르지오</option>
                    <option value="계양네거리">계양네거리</option>
                    <option value="영남대역">영남대역</option>
                    <option value="압량우미린">압량우미린</option>
                </select>
            </div>

            {/* 학생 리스트 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {filteredStudents.map(student => {
                    return (
                        <div
                            key={student.id}
                            style={{
                                background: 'white',
                                padding: '20px',
                                borderRadius: '16px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '20px',
                                transition: 'all 0.2s ease-in-out',
                                overflow: 'hidden',
                                minHeight: '120px'
                            }}
                        >
                            <img
                                src={student.photo}
                                alt={student.name}
                                style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#E5E7EB', objectFit: 'cover' }}
                            />

                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '18px', color: '#4B5563', fontWeight: '600', marginBottom: '8px' }}>{student.stop}</div>
                                <div style={{ fontSize: '28px', fontWeight: '900', color: '#111' }}>{student.name}</div>
                            </div>

                            <div>
                                {student.status === 'boarded' && <span style={{ padding: '8px 14px', background: '#D1FAE5', color: '#065F46', borderRadius: '8px', fontWeight: '900', fontSize: '18px' }}>탑승 완료</span>}
                                {student.status === 'absent' && <span style={{ padding: '8px 14px', background: '#FEE2E2', color: '#991B1B', borderRadius: '8px', fontWeight: '900', fontSize: '18px' }}> 미탑승 </span>}
                                {student.status === 'waiting' && <span style={{ padding: '8px 14px', background: '#FEF3C7', color: '#92400E', borderRadius: '8px', fontWeight: '900', fontSize: '18px' }}> 대기 중</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { studentAPI } from '@/api'
import { ScopedActivityRecord } from '@/components/learning/AttentionRecords'
import { isAdmin, useAuth } from '@/context/AuthContext'
import OverviewTab from './OverviewTab'
import StudentsTab from './StudentsTab'
import FeedbackTab from './FeedbackTab'
import GradeRegisterTab from './GradeRegisterTab'   

const TABS = [
  { id: 'overview', label: '📊 전체현황' },
  { id: 'students', label: '👥 학생관리' },
  { id: 'feedback', label: '📝 피드백' },
  { id: 'grade',    label: '🎯 성적 등록' },         
]

export default function AdminLearning() {
  const { user } = useAuth()
  const isAdministrator = isAdmin(user?.role)
  const getStudents = isAdministrator ? studentAPI.getAdminStudents : studentAPI.getAcademyStudents
  const [activeTab, setActiveTab] = useState('overview')
  const [searchParams, setSearchParams] = useSearchParams()
  const activityId = searchParams.get('activityId')
  const studentId = searchParams.get('studentId')

  if (activityId !== null) {
    return <div style={{ margin: '16px' }}>
      <ScopedActivityRecord key={`${studentId}:${activityId}`} studentId={studentId} activityId={activityId}
        onBack={() => setSearchParams({}, { replace: true })} backLabel="학습 관리로 돌아가기" />
    </div>
  }

  return (
    <div>
      <div style={{
        display: 'flex', overflowX: 'auto', scrollbarWidth: 'none',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flexShrink: 0, padding: '14px 20px', border: 'none', background: 'transparent',
            cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
            fontWeight: activeTab === t.id ? 700 : 500,
            color: activeTab === t.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
            borderBottom: `2.5px solid ${activeTab === t.id ? 'var(--color-primary)' : 'transparent'}`,
            transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}>{t.label}</button>
        ))}
      </div>
      {activeTab === 'overview' && <OverviewTab getStudents={getStudents} isAdministrator={isAdministrator} />}
      {activeTab === 'students' && <StudentsTab getStudents={getStudents} isAdministrator={isAdministrator} />}
      {activeTab === 'feedback' && <FeedbackTab getStudents={getStudents} />}
      {activeTab === 'grade' && <GradeRegisterTab getStudents={getStudents} />}
    </div>
  )
}

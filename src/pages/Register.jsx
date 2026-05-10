import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const ROLES = [
  { value: 'parent',  label: '학부모' },
  { value: 'academy', label: '학원 관리자' },
]

const PASSWORD_RULES = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '', password: '', passwordConfirm: '',
    name: '', email: '', phone: '', role: 'parent',
    academyName: '', academyAddress: '', businessNumber: '',
  })
  const [agreed, setAgreed]   = useState(false)
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const update = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }))
    setErrors(prev => ({ ...prev, [key]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.username.trim())            e.username = '아이디를 입력해 주세요'
    else if (form.username.length < 4)   e.username = '아이디는 4자 이상이어야 합니다'
    if (!form.password)                  e.password = '비밀번호를 입력해 주세요'
    else if (!PASSWORD_RULES.test(form.password))
                                         e.password = '영문·숫자·특수문자 포함 8자 이상'
    if (form.password !== form.passwordConfirm)
                                         e.passwordConfirm = '비밀번호가 일치하지 않습니다'
    if (!form.name.trim())               e.name  = '이름을 입력해 주세요'
    if (!form.email.includes('@'))       e.email = '올바른 이메일을 입력해 주세요'
    if (form.phone.replace(/\D/g,'').length < 10)
                                         e.phone = '올바른 전화번호를 입력해 주세요'
    if (!agreed)                         e.agree = '개인정보 수집 및 이용에 동의해 주세요'
    if (form.role === 'academy') {
      if (!form.academyName.trim())      e.academyName = '학원 이름을 입력해 주세요'
      if (!form.academyAddress.trim())   e.academyAddress = '학원 주소를 입력해 주세요'
      const bn = form.businessNumber.replace(/\D/g, '')
      if (bn.length !== 10)              e.businessNumber = '사업자번호 10자리를 입력해 주세요'
    }
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }

    setLoading(true)
    try {
      // TODO: POST /api/auth/register
      await new Promise(r => setTimeout(r, 1000)) // mock
      setSuccess(true)
      setTimeout(() => navigate('/login'), 1500)
    } catch {
      setErrors({ submit: '회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.' })
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'var(--color-bg)', gap:16 }}>
        <div style={{ fontSize:56 }}>🎉</div>
        <h2 style={{ fontSize:20, fontWeight:800, color:'var(--color-text-primary)' }}>회원가입이 완료되었습니다!</h2>
        <p style={{ fontSize:14, color:'var(--color-text-muted)' }}>로그인 화면으로 이동합니다...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--color-bg)', padding:'0 0 40px' }}>
      {/* 헤더 */}
      <div style={{ background:'linear-gradient(135deg, #0A1628 0%, #1A56DB 100%)', padding:'48px 24px 32px', color:'white', textAlign:'center' }}>
        <Link to="/login" style={{ position:'absolute', left:20, top:16, color:'rgba(255,255,255,0.7)', fontSize:24 }}>←</Link>
        <h1 style={{ fontSize:24, fontWeight:800 }}>회원가입</h1>
        <p style={{ fontSize:13, opacity:0.7, marginTop:6 }}>아이루트 서비스에 오신 것을 환영합니다</p>
      </div>

      <div style={{ padding:'24px 20px', display:'flex', flexDirection:'column', gap:20, maxWidth:480, margin:'0 auto' }}>

        {/* 역할 선택 */}
        <div>
          <p style={{ fontSize:13, fontWeight:600, color:'var(--color-text-secondary)', marginBottom:10 }}>가입 유형</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
            {ROLES.map(r => (
              <button key={r.value} onClick={() => update('role', r.value)} style={{
                padding:'10px 4px', borderRadius:10, border:`2px solid ${form.role===r.value ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: form.role===r.value ? 'var(--color-primary-light)' : 'var(--color-surface)',
                color: form.role===r.value ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s',
              }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* 입력 필드들 */}
        <Field label="아이디" error={errors.username}>
          <input className="input-field" placeholder="아이디 (4자 이상)" value={form.username}
            onChange={e => update('username', e.target.value)} />
        </Field>

        <Field label="비밀번호" error={errors.password}>
          <input className="input-field" type="password" placeholder="영문·숫자·특수문자 포함 8자 이상" value={form.password}
            onChange={e => update('password', e.target.value)} />
        </Field>

        <Field label="비밀번호 확인" error={errors.passwordConfirm}>
          <input className="input-field" type="password" placeholder="비밀번호를 다시 입력해 주세요" value={form.passwordConfirm}
            onChange={e => update('passwordConfirm', e.target.value)} />
        </Field>

        <Field label="이름" error={errors.name}>
          <input className="input-field" placeholder="실명을 입력해 주세요" value={form.name}
            onChange={e => update('name', e.target.value)} />
        </Field>

        <Field label="이메일" error={errors.email}>
          <input className="input-field" type="email" placeholder="example@email.com" value={form.email}
            onChange={e => update('email', e.target.value)} />
        </Field>

        <Field label="전화번호" error={errors.phone}>
          <input className="input-field" type="tel" placeholder="010-0000-0000" value={form.phone}
            onChange={e => update('phone', e.target.value)} />
        </Field>

        {/* 학원 관리자 전용 필드 */}
        {form.role === 'academy' && (
          <div style={{
            display:'flex', flexDirection:'column', gap:16,
            background:'var(--color-primary-light)',
            border:'1.5px solid var(--color-primary)',
            borderRadius:14, padding:'16px 16px 20px',
          }}>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--color-primary)', marginBottom:-4 }}>
              🏫 학원 정보
            </p>
            <Field label="학원 이름" error={errors.academyName}>
              <input className="input-field" placeholder="학원 이름을 입력해 주세요" value={form.academyName}
                onChange={e => update('academyName', e.target.value)} />
            </Field>
            <Field label="학원 주소" error={errors.academyAddress}>
              <input className="input-field" placeholder="도로명 주소를 입력해 주세요" value={form.academyAddress}
                onChange={e => update('academyAddress', e.target.value)} />
            </Field>
            <Field label="사업자 번호" error={errors.businessNumber}>
              <input className="input-field" placeholder="000-00-00000" value={form.businessNumber}
                onChange={e => {
                  const raw = e.target.value.replace(/\D/g,'').slice(0,10)
                  const fmt = raw.length <= 3 ? raw
                    : raw.length <= 5 ? raw.slice(0,3)+'-'+raw.slice(3)
                    : raw.slice(0,3)+'-'+raw.slice(3,5)+'-'+raw.slice(5)
                  update('businessNumber', fmt)
                }} />
            </Field>
          </div>
        )}

        {/* 개인정보 동의 */}
        <div style={{
          background:'var(--color-surface)', border:`1.5px solid ${errors.agree ? 'var(--color-danger)' : 'var(--color-border)'}`,
          borderRadius:12, padding:16,
        }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:12, cursor:'pointer' }} onClick={() => { setAgreed(p=>!p); setErrors(p=>({...p, agree:''})) }}>
            <div style={{
              width:22, height:22, borderRadius:6, flexShrink:0, marginTop:1,
              border:`2px solid ${agreed ? 'var(--color-primary)' : 'var(--color-border)'}`,
              background: agreed ? 'var(--color-primary)' : 'transparent',
              display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s',
            }}>
              {agreed && <span style={{ color:'white', fontSize:13, fontWeight:700 }}>✓</span>}
            </div>
            <div>
              <p style={{ fontSize:14, fontWeight:600, color:'var(--color-text-primary)' }}>개인정보 수집 및 이용 동의 <span style={{ color:'var(--color-danger)' }}>(필수)</span></p>
              <p style={{ fontSize:12, color:'var(--color-text-muted)', marginTop:4, lineHeight:1.5 }}>
                아이루트는 서비스 제공을 위해 아이디, 이름, 이메일, 전화번호를 수집하며 회원 탈퇴 시 즉시 삭제됩니다.
              </p>
            </div>
          </div>
          {errors.agree && <p style={{ fontSize:12, color:'var(--color-danger)', marginTop:8 }}>{errors.agree}</p>}
        </div>

        {/* 서버 에러 */}
        {errors.submit && (
          <div style={{ background:'#FFE9E9', border:'1px solid #FFBCBC', borderRadius:10, padding:'12px 14px' }}>
            <p style={{ fontSize:13, color:'var(--color-danger)', fontWeight:600 }}>{errors.submit}</p>
          </div>
        )}

        {/* 가입 버튼 */}
        <button onClick={handleSubmit} disabled={loading} style={{
          width:'100%', padding:'16px', borderRadius:14, border:'none', cursor: loading ? 'not-allowed' : 'pointer',
          background: loading ? 'var(--color-text-muted)' : 'var(--color-primary)',
          color:'white', fontSize:16, fontWeight:700, fontFamily:'inherit',
          boxShadow: loading ? 'none' : '0 4px 16px rgba(26,86,219,0.35)',
          transition:'all 0.15s',
        }}>
          {loading ? '처리 중...' : '회원가입'}
        </button>

        <p style={{ textAlign:'center', fontSize:13, color:'var(--color-text-muted)' }}>
          이미 계정이 있으신가요?{' '}
          <Link to="/login" style={{ color:'var(--color-primary)', fontWeight:600 }}>로그인</Link>
        </p>
      </div>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div className="input-group">
      <label className="input-label">{label}</label>
      {children}
      {error && <p style={{ fontSize:12, color:'var(--color-danger)', marginTop:2 }}>{error}</p>}
    </div>
  )
}
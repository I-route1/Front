import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

function BackButton({
  label = '뒤로가기',
  to,
  className = '',
  style = {},
}) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (to) {
      navigate(to)
      return
    }

    navigate(-1)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`back-button ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        border: 'none',
        background: 'transparent',
        padding: 0,
        margin: 0,
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 700,
        fontFamily: 'inherit',
        color: 'inherit',
        ...style,
      }}
      aria-label={label}
    >
      <ChevronLeft size={22} color="currentColor" />

      <span>{label}</span>
    </button>
  )
}

export default BackButton
export default function AnonymousPostOption({ checked, onChange }) {
  return (
    <label className="post-privacy-option">
      <span>
        <strong>익명으로 게시</strong>
        <small>게시글에 닉네임과 프로필을 숨겨요.</small>
      </span>
      <input type="checkbox" role="switch" aria-label="익명으로 게시"
        checked={checked} onChange={event => onChange(event.target.checked)} />
      <span className="post-privacy-option__track" aria-hidden="true" />
    </label>
  )
}

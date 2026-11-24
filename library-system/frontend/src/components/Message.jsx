// Shows a success or error message, plus an optional list of details.
export default function Message({ type = 'error', text, details = [] }) {
  if (!text) return null;
  return (
    <div className={`message ${type}`} role={type === 'error' ? 'alert' : 'status'}>
      {text}
      {details.length > 0 && (
        <ul>
          {details.map((d) => <li key={d}>{d}</li>)}
        </ul>
      )}
    </div>
  );
}

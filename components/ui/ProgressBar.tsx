export function ProgressBar({ pct, color, style }: { pct: number; color: string; style?: React.CSSProperties }) {
  return (
    <div className="progress-track" style={style}>
      <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

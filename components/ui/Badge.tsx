export function Badge({ tone, children }: { tone: "ok" | "tight" | "risk" | "neutral"; children: React.ReactNode }) {
  return <span className={`badge b-${tone}`}>{children}</span>;
}

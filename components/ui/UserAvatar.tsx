import { initials } from "@/lib/scheduling/engine";

export function UserAvatar({ name, color, size }: { name: string; color: string; size?: number }) {
  const style = size ? { width: size, height: size, fontSize: Math.round(size * 0.36) } : undefined;
  return (
    <div className="user-avatar" style={{ background: color, ...style }} title={name}>
      {initials(name)}
    </div>
  );
}

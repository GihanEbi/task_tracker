const pad = (n: number) => String(n).padStart(2, "0");

export const dkey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const keyToDate = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

export const isWorkday = (d: Date) => {
  const g = d.getDay();
  return g >= 1 && g <= 5;
};

export const nextWorkday = (d: Date) => {
  let r = addDays(d, 1);
  while (!isWorkday(r)) r = addDays(r, 1);
  return r;
};

export const fmtShort = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
export const fmtLong = (d: Date) => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
export const fmtWeekday = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short" });
export const fmtWeekdayLong = (d: Date) => d.toLocaleDateString("en-US", { weekday: "long" });

export const t2m = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export const fmtClock = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ap = h >= 12 ? "PM" : "AM";
  let hh = h % 12;
  if (hh === 0) hh = 12;
  return `${hh}:${pad(m)} ${ap}`;
};

// Fixed "today" — the prototype hardcodes this rather than using `new Date()`
// so the seeded demo schedule renders deterministically on server and client.
export const TODAY_DATE = new Date(2026, 8, 3); // Thu Sep 3, 2026
export const TODAY_KEY = dkey(TODAY_DATE);

export const MON = addDays(TODAY_DATE, -3);
export const TUE = addDays(TODAY_DATE, -2);
export const WED = addDays(TODAY_DATE, -1);
export const THU = TODAY_DATE;
export const FRI = addDays(TODAY_DATE, 1);

export const relDay = (key: string) => {
  const diff = Math.round((keyToDate(key).getTime() - TODAY_DATE.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return fmtShort(keyToDate(key));
};

export const weekKeys = () => [dkey(MON), dkey(TUE), dkey(WED), dkey(THU), dkey(FRI)];

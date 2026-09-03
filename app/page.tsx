import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export default async function RootPage() {
  const { userId } = await auth();
  if (userId) redirect("/today");

  return (
    <div className="landing">
      <div className="landing-card panel">
        <span className="corner-tick tl"></span>
        <span className="corner-tick tr"></span>
        <span className="corner-tick bl"></span>
        <span className="corner-tick br"></span>

        <div className="brand landing-brand">
          <div className="brand-mark"></div>
          <div>
            <div className="brand-name">WorkTime</div>
            <div className="brand-tag">schedule&nbsp;engine</div>
          </div>
        </div>

        <h1 className="landing-title">Plan your work against real capacity.</h1>
        <p className="landing-sub">
          Add a task and see exactly what shifts — today&apos;s timeline recalculates automatically, overflow moves to the next
          working day, and deadline risk stays visible before it becomes a problem.
        </p>

        <div className="landing-actions">
          <Link className="btn" href="/sign-in">
            Sign in
          </Link>
          <Link className="btn secondary" href="/sign-up">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}

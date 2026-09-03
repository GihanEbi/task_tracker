"use client";

import { useRef, useState } from "react";
import { useWorkTime } from "@/lib/scheduling/context";

// Remounted (via a `key` from the store) each time it's opened, so plain
// useState defaults below are enough — no reset effect needed.
export function AddUserModal() {
  const store = useWorkTime();
  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [capacity, setCapacity] = useState(8);
  const [invalid, setInvalid] = useState(false);

  function close() {
    store.closeAddUserModal();
  }

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setInvalid(true);
      nameRef.current?.focus();
      return;
    }
    const finalRole = role.trim() || "Team member";
    const finalDept = department.trim() || "General";
    const finalEmail = email.trim() || `${trimmed.split(" ")[0].toLowerCase()}@worktime.io`;
    const finalCapacity = Math.max(1, capacity || 8);
    close();
    store.addUser({ name: trimmed, role: finalRole, department: finalDept, email: finalEmail, capacity: finalCapacity });
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="modal">
        <div className="modal-head">
          <h2>Add team member</h2>
          <button className="modal-close" onClick={close}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Full name</label>
            <input
              ref={nameRef}
              type="text"
              placeholder="e.g. Sam Rivera"
              value={name}
              style={invalid ? { borderColor: "var(--red)" } : undefined}
              onChange={(e) => {
                setName(e.target.value);
                if (invalid) setInvalid(false);
              }}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Role / title</label>
              <input type="text" placeholder="e.g. Backend Engineer" value={role} onChange={(e) => setRole(e.target.value)} />
            </div>
            <div className="field">
              <label>Department</label>
              <input type="text" placeholder="e.g. Engineering" value={department} onChange={(e) => setDepartment(e.target.value)} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Email</label>
              <input type="text" placeholder="name@worktime.io" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label>Daily capacity (hours)</label>
              <input type="number" min={1} max={16} step={0.5} value={capacity} onChange={(e) => setCapacity(parseFloat(e.target.value))} />
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn secondary" onClick={close}>
            Cancel
          </button>
          <button className="btn" onClick={submit}>
            Add to team
          </button>
        </div>
      </div>
    </div>
  );
}

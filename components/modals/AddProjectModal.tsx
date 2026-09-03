"use client";

import { useRef, useState } from "react";
import { useWorkTime } from "@/lib/scheduling/context";

const PALETTE = [
  { name: "Blue", hex: "#2D5A8C" },
  { name: "Violet", hex: "#6B4FA0" },
  { name: "Teal", hex: "#1F7A6C" },
  { name: "Slate", hex: "#8B98A5" },
  { name: "Rust", hex: "#8C5A2B" },
  { name: "Indigo", hex: "#4A5FA0" },
];

// Remounted (via a `key` from the store) each time it's opened, so plain
// useState defaults below are enough — no reset effect needed.
export function AddProjectModal() {
  const store = useWorkTime();
  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PALETTE[0].hex);
  const [invalid, setInvalid] = useState(false);

  function close() {
    store.closeAddProjectModal();
  }

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setInvalid(true);
      nameRef.current?.focus();
      return;
    }
    const created = store.addProject({ name: trimmed, description: description.trim(), color });
    if (created) close();
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="modal">
        <div className="modal-head">
          <h2>Add project</h2>
          <button className="modal-close" onClick={close}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Project name</label>
            <input
              ref={nameRef}
              type="text"
              placeholder="e.g. Onboarding Revamp"
              value={name}
              style={invalid ? { borderColor: "var(--red)" } : undefined}
              onChange={(e) => {
                setName(e.target.value);
                if (invalid) setInvalid(false);
              }}
            />
          </div>
          <div className="field">
            <label>Description (optional)</label>
            <textarea placeholder="What is this project about?" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="field">
            <label>Color</label>
            <div className="color-pick">
              {PALETTE.map((c) => (
                <label key={c.hex}>
                  <input type="radio" name="pColor" value={c.hex} checked={color === c.hex} onChange={() => setColor(c.hex)} />
                  <span>
                    <span className="color-swatch" style={{ background: c.hex }}></span>
                    {c.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn secondary" onClick={close}>
            Cancel
          </button>
          <button className="btn" onClick={submit}>
            Add project
          </button>
        </div>
      </div>
    </div>
  );
}

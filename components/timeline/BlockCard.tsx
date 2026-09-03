"use client";

import { ScheduleBlock, Task } from "@/lib/scheduling/types";
import { fmtClock } from "@/lib/scheduling/dates";

export function BlockCard({
  block,
  task,
  label,
  top,
  height,
  className = "",
  onOpen,
  onMove,
  onDragStart,
  onDragOver,
  onDragEnd,
}: {
  block: ScheduleBlock;
  task: Task;
  label: string;
  top: number;
  height: number;
  className?: string;
  onOpen: () => void;
  onMove: () => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      className={`block-card ${task.isFreeSlot ? "is-free-slot" : ""} ${className}`.trim()}
      draggable
      style={{ top, height }}
      onClick={onOpen}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="block-time-tab">{block.start != null ? fmtClock(block.start).replace(" ", "") : ""}</div>
      <button
        className="block-move"
        title="Move to next available day"
        onClick={(e) => {
          e.stopPropagation();
          onMove();
        }}
      >
        →
      </button>
      <div className="block-body">
        <div className="block-title">{label}</div>
        <div className="block-sub">
          {task.isFreeSlot ? "Free time" : task.project} · {block.duration}h
        </div>
        {task.priority && (
          <div className="block-meta">
            <span className="block-chip">
              <span className={`prio-dot prio-${task.priority}`}></span>
              {task.priority}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

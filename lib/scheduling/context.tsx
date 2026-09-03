"use client";

import { createContext, useContext, useState, useSyncExternalStore } from "react";
import { WorkTimeStore } from "./store";
import type { WorkTimeState } from "./types";

const StoreContext = createContext<WorkTimeStore | null>(null);

export function WorkTimeProvider({ initialState, children }: { initialState: WorkTimeState; children: React.ReactNode }) {
  const [store] = useState(() => new WorkTimeStore(initialState));
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useWorkTime(): WorkTimeStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useWorkTime must be used within a WorkTimeProvider");
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return store;
}

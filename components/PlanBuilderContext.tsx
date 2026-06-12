"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import PlanBuilderModal from "@/components/PlanBuilderModal";

const PlanBuilderContext = createContext<{ openPlanner: () => void }>({
  openPlanner: () => {},
});

export function PlanBuilderProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <PlanBuilderContext.Provider value={{ openPlanner: () => setOpen(true) }}>
      {children}
      {/* Mount only while open so state resets on close. */}
      {open && <PlanBuilderModal onClose={() => setOpen(false)} />}
    </PlanBuilderContext.Provider>
  );
}

export function usePlanBuilder() {
  return useContext(PlanBuilderContext);
}

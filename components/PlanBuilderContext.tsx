"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import PlanBuilderModal from "@/components/PlanBuilderModal";

interface PlannerRequest {
  initialCityId?: string;
}

const PlanBuilderContext = createContext<{
  openPlanner: (initialCityId?: string) => void;
}>({
  openPlanner: () => {},
});

export function PlanBuilderProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<PlannerRequest | null>(null);

  return (
    <PlanBuilderContext.Provider
      value={{ openPlanner: (initialCityId) => setRequest({ initialCityId }) }}
    >
      {children}
      {/* Mount only while open so state resets on close. */}
      {request && (
        <PlanBuilderModal
          initialCityId={request.initialCityId}
          onClose={() => setRequest(null)}
        />
      )}
    </PlanBuilderContext.Provider>
  );
}

export function usePlanBuilder() {
  return useContext(PlanBuilderContext);
}

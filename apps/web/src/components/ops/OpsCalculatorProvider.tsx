"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PricingParams } from "@oct3d/pricing";
import { OpsCalculatorModal, type SupplyOption } from "./OpsCalculatorModal";

type OpsCalculatorContextValue = {
  open: () => void;
  close: () => void;
  isOpen: boolean;
};

const OpsCalculatorContext = createContext<OpsCalculatorContextValue | null>(null);

export function useOpsCalculator() {
  const ctx = useContext(OpsCalculatorContext);
  if (!ctx) {
    throw new Error("useOpsCalculator debe usarse dentro de OpsCalculatorProvider");
  }
  return ctx;
}

export function OpsCalculatorProvider({
  children,
  supplies,
  pricing,
  longPrintHours,
}: {
  children: ReactNode;
  supplies: SupplyOption[];
  pricing: PricingParams;
  longPrintHours: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo(
    () => ({ open, close, isOpen }),
    [open, close, isOpen],
  );

  return (
    <OpsCalculatorContext.Provider value={value}>
      {children}
      <OpsCalculatorModal
        open={isOpen}
        onClose={close}
        supplies={supplies}
        pricing={pricing}
        longPrintHours={longPrintHours}
      />
    </OpsCalculatorContext.Provider>
  );
}

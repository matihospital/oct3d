import type { ReactNode } from "react";
import "./ops.css";

export function OpsShell({ children }: { children: ReactNode }) {
  return <div className="ops-shell">{children}</div>;
}

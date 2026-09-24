import { OpsShell } from "@/components/ops/OpsShell";

export default function OpsRootLayout({ children }: { children: React.ReactNode }) {
  return <OpsShell>{children}</OpsShell>;
}

import { CalculatorApp } from "@/components/CalculatorApp";
import { getPricingSettings } from "@/lib/pricing-settings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { longPrintHours, ...pricing } = await getPricingSettings();

  return (
    <div className="relative z-10 min-h-full">
      <CalculatorApp pricing={pricing} longPrintHours={longPrintHours} />
    </div>
  );
}

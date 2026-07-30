import { DemoShell } from "@/components/app-shell";
import { DashboardView } from "@/components/dashboard-view";

export default function DemoPage() {
  return (
    <DemoShell>
      <DashboardView demo />
    </DemoShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import {
  PageHeader, Panel
} from "@/components/ui-kit/primitives";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Attention Queue — MPLADS Guardian" },
      { name: "description", content: "Anomaly signals requiring officer review." },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  return (
    <div className="space-y-5 fade-in-up">
      <PageHeader
        title="Attention Queue"
        subtitle="Priority tracking for projects flagged for review."
      />

      <Panel>
        <div className="px-4 py-20 text-center text-[13px] text-muted-foreground flex flex-col items-center justify-center">
          <p className="font-semibold text-foreground">Detection engine not yet active.</p>
          <p className="mt-1 text-[12px] opacity-70">
            The automated investigation module has not been deployed yet. Real data is available, and future anomaly detection models will populate this queue with verified signals.
          </p>
        </div>
      </Panel>
    </div>
  );
}


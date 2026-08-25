import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, PanelHeader, Button } from "@/components/ui-kit/primitives";
import { Save } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — MPLADS Guardian" },
      { name: "description", content: "Platform configuration and notification preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-5 fade-in-up">
      <PageHeader title="Settings" subtitle="Platform configuration and notification preferences." />

      <Panel>
        <PanelHeader title="Notification Preferences" />
        <div className="space-y-4 px-4 py-4">
          <SettingToggle label="Email alerts for projects requiring immediate review" defaultChecked />
          <SettingToggle label="Email digest — daily summary of new anomaly alerts" defaultChecked />
          <SettingToggle label="Browser push notifications" defaultChecked={false} />
          <SettingToggle label="Slack integration notifications" defaultChecked={false} />
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Priority Thresholds" />
        <div className="divide-y divide-border">
          <ThresholdRow label="Immediate Review threshold" value={85} unit="priority score" />
          <ThresholdRow label="High Priority threshold" value={65} unit="priority score" />
          <ThresholdRow label="Financial–physical mismatch alert" value={25} unit="percentage points" />
          <ThresholdRow label="Delay alert trigger" value={3} unit="months" />
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Profile" />
        <div className="space-y-3 px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label-meta mb-1 block">Name</label>
              <input defaultValue="R. Kulkarni"
                className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px]" />
            </div>
            <div>
              <label className="label-meta mb-1 block">Role</label>
              <input defaultValue="District Monitoring Officer" disabled
                className="h-9 w-full rounded-md border border-border bg-surface px-3 text-[13px] text-muted-foreground" />
            </div>
          </div>
          <div>
            <label className="label-meta mb-1 block">Email</label>
            <input defaultValue="r.kulkarni@mplads.gov.in"
              className="h-9 w-full max-w-sm rounded-md border border-border bg-card px-3 text-[13px]" />
          </div>
        </div>
      </Panel>

      <div className="flex justify-end">
        <Button variant="primary" size="md">
          <Save className="h-3.5 w-3.5" /> Save Changes
        </Button>
      </div>
    </div>
  );
}

function SettingToggle({ label, defaultChecked }: { label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center justify-between gap-3 text-[13px] text-foreground cursor-pointer">
      <span>{label}</span>
      <input type="checkbox" defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-border accent-primary" />
    </label>
  );
}

function ThresholdRow({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <input type="number" defaultValue={value}
          className="h-8 w-16 rounded-md border border-border bg-card px-2 text-center text-[13px] tnum" />
        <span className="text-[12px] text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

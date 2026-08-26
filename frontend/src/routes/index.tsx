import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    const completed = localStorage.getItem("mplads_guardian_onboarding_completed");
    throw redirect({
      to: completed === "true" ? "/dashboard" : "/get-started",
    });
  },
  component: () => null,
});

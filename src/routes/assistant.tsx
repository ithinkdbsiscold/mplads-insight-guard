import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, PanelHeader, Button } from "@/components/ui-kit/primitives";
import { MessageSquareText, Send, Bot, User } from "lucide-react";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "AI Assistant — MPLADS Guardian" },
      { name: "description", content: "Query the MPLADS knowledge base using natural language." },
    ],
  }),
  component: AssistantPage,
});

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Which districts in Bihar have the most immediate-review projects?",
  "Summarise the priority findings for MPL-1842.",
  "Show projects where financial progress exceeds physical by more than 30%.",
  "What are the top delay categories this quarter?",
];

function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello, I'm the MPLADS Guardian assistant. I can help you explore project data, anomaly patterns and findings across monitored states. What would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");

  function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", content: msg },
      {
        role: "assistant",
        content:
          "Thank you for your query. The AI assistant integration is pending — when connected, this will query the FastAPI backend and return contextual analysis with project-level citations. For now, please use the sidebar navigation to explore dashboards and project details directly.",
      },
    ]);
    setInput("");
  }

  return (
    <div className="space-y-5 fade-in-up">
      <PageHeader
        title="AI Assistant"
        subtitle="Natural-language interface to the MPLADS monitoring knowledge base."
      />

      <Panel className="flex flex-col" style={{ minHeight: "calc(100vh - 280px)" }}>
        <PanelHeader title="Conversation" />

        {/* messages */}
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && (
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" />
                </span>
              )}
              <div
                className={`max-w-[75%] rounded-lg px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface text-foreground border border-border"
                }`}
              >
                {m.content}
              </div>
              {m.role === "user" && (
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-foreground">
                  <User className="h-4 w-4" />
                </span>
              )}
            </div>
          ))}
        </div>

        {/* suggestions */}
        {messages.length <= 2 && (
          <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-[11.5px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* input */}
        <div className="border-t border-border px-4 py-3">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about projects, anomaly patterns, or specific findings…"
              className="h-9 flex-1 rounded-md border border-border bg-card px-3 text-[13px] placeholder:text-subtle transition-colors focus:border-border-strong"
            />
            <Button type="submit" variant="primary" size="md" disabled={!input.trim()}>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      </Panel>
    </div>
  );
}

"""
MPLADS Guardian — Detection Agent Interfaces

IMPORTANT: These are STUBS for future implementation.
The first version contains interfaces, data models, and one simple
example agent (FinancialAnomalyAgent) to demonstrate the pattern.

NEVER state that a finding proves wrongdoing.
Use language such as:
  "Requires Review"
  "Unusual Pattern"
  "Attention Needed"
  "Suspicious Pattern"
  "Investigation Recommended"

The system supports human investigation — it does not make accusations.
"""

from __future__ import annotations

import json
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional


# ---------------------------------------------------------------------------
# AgentFinding data model
# ---------------------------------------------------------------------------

@dataclass
class Finding:
    """
    A structured finding from a detection agent.

    severity: "low" | "medium" | "high" | "critical"
    score: 0.0–1.0 explainable composite score
    confidence: 0.0–1.0 model confidence (leave low/null if heuristic)
    """
    agent_name:    str
    finding_type:  str
    severity:      str
    score:         float
    explanation:   str
    evidence:      dict[str, Any] = field(default_factory=dict)
    confidence:    float = 0.5
    work_id:       Optional[int] = None
    mp_id:         Optional[str] = None
    created_at:    str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict:
        return {
            "agent_name":   self.agent_name,
            "finding_type": self.finding_type,
            "severity":     self.severity,
            "score":        self.score,
            "explanation":  self.explanation,
            "evidence":     json.dumps(self.evidence),
            "confidence":   self.confidence,
            "work_id":      self.work_id,
            "mp_id":        self.mp_id,
            "created_at":   self.created_at,
        }


SEVERITY_LEVELS = ("low", "medium", "high", "critical")


# ---------------------------------------------------------------------------
# Base Agent interface
# ---------------------------------------------------------------------------

class BaseAgent(ABC):
    """
    All detection agents must implement this interface.

    analyze(work, context) → list[Finding]

    The agent is allowed to return zero findings (no anomaly detected).
    A finding is an observation, not a conclusion.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable agent name."""
        ...

    @abstractmethod
    def analyze(self, work: dict, context: dict) -> list[Finding]:
        """
        Analyse a single work project.

        Args:
            work:    normalised Work record dict
            context: additional context (MP data, similar works, expenditures, etc.)

        Returns:
            List of Finding objects (empty if no issues detected).
        """
        ...


# ---------------------------------------------------------------------------
# Agent stubs
# ---------------------------------------------------------------------------

class FinancialAnomalyAgent(BaseAgent):
    """
    PHASE 1 IMPLEMENTATION — simple rule-based heuristics.

    Checks:
    1. Expenditure exceeds allocated amount
    2. Works with zero expenditure but marked completed
    3. Unusually high single-vendor expenditure
    """
    name = "FinancialAnomalyAgent"

    def analyze(self, work: dict, context: dict) -> list[Finding]:
        findings: list[Finding] = []

        recommended_amount = work.get("recommended_amount") or 0.0
        final_amount       = work.get("final_amount") or 0.0
        expenditures       = context.get("expenditures", [])
        total_exp          = sum(e.get("expenditure_amount", 0) for e in expenditures)

        # Rule 1: Final amount significantly exceeds recommended amount (>50% overrun)
        if recommended_amount > 0 and final_amount > recommended_amount * 1.5:
            overshoot_pct = round((final_amount - recommended_amount) / recommended_amount * 100, 1)
            findings.append(Finding(
                agent_name=self.name,
                finding_type="cost_overrun",
                severity="high" if overshoot_pct > 100 else "medium",
                score=min(overshoot_pct / 200, 1.0),
                explanation=(
                    f"Final amount (₹{final_amount/1e5:.1f}L) is {overshoot_pct}% above "
                    f"recommended amount (₹{recommended_amount/1e5:.1f}L). "
                    "Requires Review — verify project scope changes and approvals."
                ),
                evidence={
                    "recommended_amount": recommended_amount,
                    "final_amount": final_amount,
                    "overshoot_pct": overshoot_pct,
                },
                work_id=work.get("work_id"),
                mp_id=work.get("mp_id"),
            ))

        # Rule 2: Completed work but no expenditure recorded
        if work.get("work_status") == "Completed" and total_exp == 0:
            findings.append(Finding(
                agent_name=self.name,
                finding_type="missing_expenditure",
                severity="medium",
                score=0.6,
                explanation=(
                    "Work is marked Completed but no expenditure records exist. "
                    "Attention Needed — verify payment records are properly recorded."
                ),
                evidence={"work_status": "Completed", "total_expenditure": 0},
                work_id=work.get("work_id"),
                mp_id=work.get("mp_id"),
            ))

        return findings


class TimelineDelayAgent(BaseAgent):
    """
    STUB — detect long delays between recommendation and completion.
    To be fully implemented in a future phase.
    """
    name = "TimelineDelayAgent"

    def analyze(self, work: dict, context: dict) -> list[Finding]:
        # Stub — returns no findings until implemented
        return []


class DuplicateWorkAgent(BaseAgent):
    """
    STUB — detect similar/duplicate works in same constituency.
    To be fully implemented in a future phase.
    """
    name = "DuplicateWorkAgent"

    def analyze(self, work: dict, context: dict) -> list[Finding]:
        return []


class PaymentPatternAgent(BaseAgent):
    """
    STUB — detect unusual payment patterns (e.g. round numbers, single-vendor).
    To be fully implemented in a future phase.
    """
    name = "PaymentPatternAgent"

    def analyze(self, work: dict, context: dict) -> list[Finding]:
        return []


class ComplianceAgent(BaseAgent):
    """
    STUB — check works against MPLADS scheme rules.
    To be fully implemented in a future phase.
    """
    name = "ComplianceAgent"

    def analyze(self, work: dict, context: dict) -> list[Finding]:
        return []


# ---------------------------------------------------------------------------
# Agent registry
# ---------------------------------------------------------------------------

AGENT_REGISTRY: list[BaseAgent] = [
    FinancialAnomalyAgent(),
    TimelineDelayAgent(),
    DuplicateWorkAgent(),
    PaymentPatternAgent(),
    ComplianceAgent(),
]


def run_all_agents(work: dict, context: dict) -> list[Finding]:
    """Run all registered agents against a work project."""
    all_findings: list[Finding] = []
    for agent in AGENT_REGISTRY:
        try:
            findings = agent.analyze(work, context)
            all_findings.extend(findings)
        except Exception as exc:
            import logging
            logging.getLogger(__name__).error(
                "Agent %s failed for work_id=%s: %s",
                agent.name, work.get("work_id"), exc
            )
    return all_findings

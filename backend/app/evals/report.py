"""Terminal + Markdown reporting for eval runs."""

from __future__ import annotations

from typing import Iterable, Optional

from app.evals.runner import ProviderSummary, RunRecord


# ─── Leaderboard ───

_COLUMNS: list[tuple[str, str, str]] = [
    # (header, key, kind) — kind drives formatting
    ("model", "_label", "text"),
    ("yield", "_yield", "pct"),
    ("gate", "generate.gate_pass", "pct"),
    ("feat", "generate.feature_match_full", "pct"),
    ("exact", "generate.exact_match", "pct"),
    ("diag", "diagnose.full_diagnosis", "pct"),
    ("falseacc", "diagnose.false_accusation", "pct"),
    ("badjson", "diagnose.schema_violation", "pct"),
    ("tr-f1", "translate.content_f1", "pct"),
    ("p50ms", "_p50", "latency"),
    ("INR/ok", "_cpa", "money"),
    ("INR tot", "_cost", "money"),
]


def _lookup(s: ProviderSummary, key: str) -> Optional[float]:
    if key == "_yield":
        # Across all tasks: replies that came back at all. Every other quality
        # column is an average over just those, so it is the denominator that
        # makes them readable.
        done = sum(m.get("_n", 0.0) for m in s.per_task.values())
        total = sum(m.get("_n_total", 0.0) for m in s.per_task.values())
        return (done / total) if total else None
    if key == "_p50":
        # No live calls means every response came from cache; reporting 0 ms
        # would read as "instant" rather than "not measured".
        return s.latency_p50 if s.n_live else None
    if key == "_cpa":
        return s.cost_per_accepted_inr
    if key == "_cost":
        return s.cost_inr
    task, _, metric = key.partition(".")
    return s.per_task.get(task, {}).get(metric)


def _fmt(value, kind: str) -> str:
    if value is None:
        return "cache" if kind == "latency" else "-"
    if kind == "pct":
        return f"{100 * value:.0f}%"
    if kind == "int":
        return f"{value:.0f}"
    if kind == "latency":
        return f"{value:.0f}"
    if kind == "money":
        return f"{value:.4f}" if value < 1 else f"{value:.2f}"
    return str(value)


def render_leaderboard(summaries: list[ProviderSummary], sort_by: str = "generate.gate_pass") -> str:
    if not summaries:
        return "(no results)"

    ordered = sorted(
        summaries,
        key=lambda s: (_lookup(s, sort_by) is not None, _lookup(s, sort_by) or 0.0),
        reverse=True,
    )

    rows: list[list[str]] = []
    for s in ordered:
        row = []
        for header, key, kind in _COLUMNS:
            row.append(s.label if key == "_label" else _fmt(_lookup(s, key), kind))
        rows.append(row)

    headers = [h for h, _, _ in _COLUMNS]
    widths = [
        max(len(headers[i]), *(len(r[i]) for r in rows)) for i in range(len(headers))
    ]

    def line(cells: list[str]) -> str:
        out = [cells[0].ljust(widths[0])]
        out += [cells[i].rjust(widths[i]) for i in range(1, len(cells))]
        return "  ".join(out)

    sep = "  ".join("-" * w for w in widths)
    body = "\n".join(line(r) for r in rows)

    errors = [s for s in summaries if s.n_errors]
    footer = ""
    if errors:
        footer = "\n\n" + "\n".join(
            f"  ! {s.label}: {s.n_errors}/{s.n_cases} calls failed" for s in errors
        )

    legend = (
        "\n\nyield    = calls that returned a usable reply at all; the rest truncated\n"
        "           or errored. Every other column averages over ONLY those, so a\n"
        "           low yield makes the quality columns look better than they are.\n"
        "gate     = Vidyut parses the generated Sanskrit confidently (the ship gate)\n"
        "feat     = all required grammatical features present\n"
        "exact    = feature set matches a gold parse exactly\n"
        "diag     = caught the error AND named the right word AND the right fix\n"
        "falseacc = flagged a CORRECT sentence as wrong (lower is better)\n"
        "badjson  = reply had no readable verdict field, so intent was inferred.\n"
        "           A formatting defect, not a Sanskrit one — fixable with a\n"
        "           repair/retry layer, so do not read it as a quality signal.\n"
        "INR/ok   = rupees per sentence that clears the gate, i.e. cost including "
        "regeneration"
    )
    return f"{line(headers)}\n{sep}\n{body}{footer}{legend}"


# ─── Failure inspection ───

def render_failures(records: Iterable[RunRecord], limit: int = 12,
                    task: str = "generate") -> str:
    """Show what a model actually produced when it failed.

    Aggregate scores tell you a model is worse; only the raw output tells you
    whether it is worse in a way you could prompt around.
    """
    out: list[str] = []
    for rec in records:
        if rec.task != task or len(out) >= limit:
            continue
        sc = rec.score
        if sc is None:
            out.append(f"[{rec.provider}:{rec.model}] {rec.case_id} API ERROR: "
                       f"{rec.response.error}")
            continue
        failed = (
            sc.metrics.get("gate_pass", 1.0) < 1.0 if task == "generate"
            else sc.metrics.get("full_diagnosis", 1.0) < 1.0 if task == "diagnose"
            else sc.metrics.get("content_f1", 1.0) < 0.5
        )
        if not failed:
            continue
        head = f"[{rec.provider}:{rec.model}] {rec.case_id}"
        if task == "generate":
            out.append(
                f"{head}\n"
                f"   produced : {sc.detail.get('sanskrit', '')}\n"
                f"   reference: {sc.detail.get('reference', '')}\n"
                f"   unparsed : {', '.join(sc.detail.get('unparsed_words') or []) or '-'}"
            )
        elif task == "diagnose":
            out.append(
                f"{head}\n"
                f"   gold : {sc.detail.get('gold_word', '-')} -> "
                f"{sc.detail.get('gold_feature', '-')}\n"
                f"   said : {sc.detail.get('pred_word', '-')} -> "
                f"{sc.detail.get('pred_feature', '-')}\n"
                f"   why  : {sc.detail.get('explanation', '')}"
            )
        else:
            out.append(
                f"{head}\n"
                f"   said: {sc.detail.get('english', '')}\n"
                f"   gold: {sc.detail.get('gold', '')}"
            )
    return "\n".join(out) if out else "(no failures to show)"


# ─── Markdown ───

def render_markdown(summaries: list[ProviderSummary]) -> str:
    headers = [h for h, _, _ in _COLUMNS]
    lines = ["| " + " | ".join(headers) + " |",
             "|" + "|".join("---" for _ in headers) + "|"]
    ordered = sorted(
        summaries,
        key=lambda s: _lookup(s, "generate.gate_pass") or 0.0, reverse=True,
    )
    for s in ordered:
        cells = [
            s.label if key == "_label" else _fmt(_lookup(s, key), kind)
            for _, key, kind in _COLUMNS
        ]
        lines.append("| " + " | ".join(cells) + " |")
    return "\n".join(lines)

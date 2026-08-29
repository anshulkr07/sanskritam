# Shabd — Orchestrator Decisions

Log of decisions made during the build. The spec lives in architecture.md; this file records what the orchestrator and workers decided while implementing.

## 2026-08-29 — Backend v0.1

- **Stack**: Python 3.11 + FastAPI + SQLAlchemy 2.0 + SQLite (file: `backend/app.db`). Chosen for: zero-setup on Windows, server-side learner model per spec §8, fast iteration. Postgres migration is a config change later (SQLAlchemy keeps it portable).
- **No GPU, no compiled Sanskrit libs in v0.1.** Grading runs on a rule-based morphology analyzer module behind an `ANALYZER=rule|vidyut` config flag, so Vidyut (Rust) can drop in without touching the grading engine. See `research/tech-research.md` for the Vidyut integration path.
- **Grading is by morphological feature set, not string match** (spec §6.1): free word order accepted automatically. `off_by_one` verdicts name the exact feature that differs. Abstention on low-confidence parses (spec §6.3) — never mark incorrect when unsure.
- **Register (laukika/classical) is a routing key enforced in the data layer**, not by prompt (spec §5).
- **Adaptive engine**: per-feature mastery (0..1) with SM-2-inspired updates; challenge selection at the mastery edge (~0.5–0.7); last-N no-repeat; two independent dials `sanskrit_ratio` and `script_ratio` (spec §7).
- **API contract locked before build** so frontend (test console) and backend could be built in parallel by separate agents. Contract documented in `backend/README.md`.
- **Test console frontend**: static vanilla JS, light theme, no build step. It is a testing tool, not the product (product is Expo per spec §1).
- Workers used: 1 research (tech findings), 1 build (backend), 1 build (frontend). Test worker follows build completion; findings from research get integrated in iteration 2.

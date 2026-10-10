"""Book-search (RAG) comparison, stage 5: the scorecard and the costs.

Reads marks.json (blind marks), review/_mapping.json (letters to models),
checks.jsonl (automatic checks), answers/, ttft/, ledger.jsonl and the
retrieval files, and writes results/rag_full_20261009/report.json (every
number) for the published report page.
"""

from __future__ import annotations

import json
import statistics
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from rag_bench_cases import CASES, CATEGORIES, HARD  # noqa: E402

OUT = ROOT / "results" / "rag_full_20261009"
USD_INR = 100.0
EMBED = {"gemini-embedding-001": (0.15, "tokens"), "text-multilingual-embedding-002": (0.025, "chars")}
VALUE = {"C": 1.0, "P": 0.5, "W": 0.0}


def jl(path: Path) -> list[dict]:
    return [json.loads(x) for x in path.read_text(encoding="utf-8").splitlines() if x.strip()] if path.exists() else []


def pct(xs, q):
    xs = sorted(xs)
    if not xs:
        return None
    k = (len(xs) - 1) * q
    lo = int(k)
    return xs[lo] + (xs[min(lo + 1, len(xs) - 1)] - xs[lo]) * (k - lo)


def main() -> None:
    marks = json.loads((OUT / "marks.json").read_text(encoding="utf-8"))
    mapping = json.loads((OUT / "review" / "_mapping.json").read_text(encoding="utf-8"))
    checks = {(r["label"], r["case"], r["run"]): r for r in jl(OUT / "checks.jsonl")}
    answers = {}
    for p in (OUT / "answers").glob("*/*.json"):
        r = json.loads(p.read_text(encoding="utf-8"))
        answers[(r["label"], r["case"], r["run"])] = r
    reasoning = {}
    for p in (OUT / "answers_reasoning").glob("*/*.json") if (OUT / "answers_reasoning").exists() else []:
        r = json.loads(p.read_text(encoding="utf-8"))
        reasoning[(r["label"], r["case"])] = r
    reasoning_marks = json.loads((OUT / "marks_reasoning.json").read_text(encoding="utf-8")) \
        if (OUT / "marks_reasoning.json").exists() else {}
    # the plain models asked again, thinking off, on the same questions
    controls = {}
    for p in (OUT / "answers_control").glob("*/*.json") if (OUT / "answers_control").exists() else []:
        r = json.loads(p.read_text(encoding="utf-8"))
        controls[(r["label"], r["case"])] = r
    control_marks = json.loads((OUT / "marks_control.json").read_text(encoding="utf-8")) \
        if (OUT / "marks_control.json").exists() else {}

    # unblind: verdicts per (model, case, run)
    verdict = {}
    for cid, per in marks.items():
        for tag, (v, flags, why) in per.items():
            letter, run = tag[0], int(tag[1:] or 0)
            label = mapping[cid][letter]
            verdict[(label, cid, run)] = {"v": v, "flags": flags, "why": why}
    labels = sorted({k[0] for k in answers})

    models = {}
    for lb in labels:
        main = [verdict.get((lb, c["id"], 0)) for c in CASES]
        got = [m for m in main if m]
        cnt = Counter(m["v"] for m in got)
        flags = Counter(f for m in got for f in m["flags"])
        rows = [answers.get((lb, c["id"], 0)) for c in CASES]
        rows = [r for r in rows if r]
        lat = [r["latency_ms"] / 1000 for r in rows if not r.get("error")]
        costs = [r["cost_inr"] for r in rows]
        chk = [checks.get((lb, c["id"], 0)) for c in CASES]
        chk = [x for x in chk if x]
        quotes = [v for x in chk for v in x.get("verses") or [] if v.get("copy")]
        by_cat = {}
        for cat in CATEGORIES:
            xs = [verdict.get((lb, c["id"], 0)) for c in CASES if c["category"] == cat]
            xs = [x for x in xs if x]
            by_cat[cat] = round(sum(VALUE[x["v"]] for x in xs) / len(xs), 3) if xs else None
        # repeats: every hard case answered three times
        rep = []
        for cid in HARD:
            vs = [verdict.get((lb, cid, r)) for r in (0, 1, 2)]
            if all(vs):
                rep.append([x["v"] for x in vs])
        models[lb] = {
            "answered": len(got), "C": cnt.get("C", 0), "P": cnt.get("P", 0), "W": cnt.get("W", 0),
            "score": round(sum(VALUE[m["v"]] for m in got) / 60, 3) if got else None,
            "flags": dict(flags), "serious_answers": sum(1 for m in got if m["flags"]),
            "by_category": by_cat,
            "card_failures": sum(1 for x in chk if not x.get("card_ok")),
            "language_failures": sum(1 for x in chk if x.get("card_ok") and not x.get("language_ok")),
            "quotes_from_block": len(quotes),
            "quotes_exact": sum(1 for v in quotes if v["copy"] == "exact"),
            "quotes_changed": sum(1 for v in quotes if v["copy"] == "changed"),
            "checker_dropped": sum(len((x.get("checker") or {}).get("dropped") or []) for x in chk),
            "app_relabels": sum(1 for x in chk for v in x.get("verses") or [] if v.get("app_relabels")),
            "median_s": round(statistics.median(lat), 2) if lat else None,
            "p90_s": round(pct(lat, 0.9), 2) if lat else None,
            "mean_in": round(statistics.mean(r["prompt_tokens"] for r in rows)) if rows else None,
            "mean_out": round(statistics.mean(r["completion_tokens"] for r in rows)) if rows else None,
            "cost_60": round(sum(costs), 2), "cost_per_answer": round(sum(costs) / len(costs), 4) if costs else None,
            "errors": sum(1 for r in rows if r.get("error")),
            "repeats": {"cases": len(rep), "changed": sum(1 for x in rep if len(set(x)) > 1),
                        "worst_score": round(sum(min(VALUE[v] for v in x) for x in rep) / len(rep), 3) if rep else None,
                        "mean_score": round(sum(VALUE[v] for x in rep for v in x) / (3 * len(rep)), 3) if rep else None},
        }
        tt = [json.loads(p.read_text(encoding="utf-8")) for p in (OUT / "ttft" / lb).glob("*.json")] \
            if (OUT / "ttft" / lb).exists() else []
        first = [t["first_ms"] / 1000 for t in tt if t.get("first_ms")]
        models[lb]["ttft_median_s"] = round(statistics.median(first), 2) if first else None
        models[lb]["ttft_n"] = len(first)
        models[lb]["ttft_total_median_s"] = round(statistics.median([t["total_ms"] / 1000 for t in tt if t.get("first_ms")]), 2) \
            if first else None
        # What the provider actually billed (OpenRouter reports it per call),
        # against the price list the cost above is worked from, and how much of
        # the prompt the provider served from its cache.
        if rows and all(r.get("openrouter_billed_usd") is not None for r in rows if not r.get("error")) \
                and any(r.get("openrouter_billed_usd") for r in rows):
            billed = [(r.get("openrouter_billed_usd") or 0.0) * USD_INR for r in rows]
            models[lb]["billed_60"] = round(sum(billed), 2)
            models[lb]["billed_per_answer"] = round(sum(billed) / len(billed), 4)
            cached = sum(((r.get("openrouter_usage") or {}).get("prompt_tokens_details") or {}).get("cached_tokens", 0)
                         for r in rows)
            models[lb]["cached_share"] = round(cached / max(1, sum(r["prompt_tokens"] for r in rows)), 3)
            models[lb]["providers"] = len({r.get("served_by") for r in rows if r.get("served_by")})

    # costs by stage, from the ledger
    stage_cost = defaultdict(float)
    model_stage = defaultdict(lambda: defaultdict(float))
    embed_q_tokens = []
    for e in jl(OUT / "ledger.jsonl"):
        if "cost_inr" in e:
            c = e["cost_inr"]
        elif e.get("model") in EMBED:
            rate, unit = EMBED[e["model"]]
            c = (e.get("tokens_in", 0) if unit == "tokens" else e.get("chars", 0)) * rate / 1e6 * USD_INR
            if e.get("stage") == "query_embedding" and e["model"] == "gemini-embedding-001":
                embed_q_tokens.append(e.get("tokens_in", 0))
        else:
            c = 0.0
        stage_cost[e.get("stage", "?")] += c
        model_stage[e.get("model", "?")][e.get("stage", "?")] += c
    q_embed_inr = (statistics.mean(embed_q_tokens) if embed_q_tokens else 0) * EMBED["gemini-embedding-001"][0] / 1e6 * USD_INR
    for lb, m in models.items():
        if m["cost_per_answer"] is not None:
            # the bill where the provider reports one, else the price list
            per = m.get("billed_per_answer", m["cost_per_answer"])
            m["per_1000_questions_inr"] = round((per + q_embed_inr) * 1000, 1)
            m["per_1000_list_price_inr"] = round((m["cost_per_answer"] + q_embed_inr) * 1000, 1)

    # thinking-on variants, run on the questions the plain model did not get
    # fully right: did thinking fix them, and at what cost?
    rsum = {}
    for (vlabel, cid), row in reasoning.items():
        base = vlabel.removesuffix("_think")
        mk = reasoning_marks.get(f"{vlabel}|{cid}")
        b = verdict.get((base, cid, 0))
        s = rsum.setdefault(vlabel, {"base": base, "cases": 0, "C": 0, "P": 0, "W": 0, "unmarked": 0, "fixed": 0,
                                     "worse": 0, "cost_inr": 0.0, "billed_inr": 0.0, "lat": [], "was_C": 0})
        s["cases"] += 1
        s["cost_inr"] += row.get("cost_inr") or 0.0
        s["billed_inr"] += (row.get("openrouter_billed_usd") or 0.0) * USD_INR
        if not row.get("error"):
            s["lat"].append(row["latency_ms"] / 1000)
        if mk is None:
            s["unmarked"] += 1
            continue
        s[mk[0]] += 1
        if b and VALUE[mk[0]] > VALUE[b["v"]]:
            s["fixed"] += 1
        if b and VALUE[mk[0]] < VALUE[b["v"]]:
            s["worse"] += 1
        s["gain"] = round(s.get("gain", 0.0) + (VALUE[mk[0]] - VALUE[b["v"]] if b else 0.0), 2)
    for (clabel, cid), row in controls.items():
        s = rsum.get(clabel + "_think")
        if s is None:
            continue
        mk = control_marks.get(f"{clabel}|{cid}")
        b = verdict.get((clabel, cid, 0))
        c = s.setdefault("control", {"cases": 0, "C": 0, "P": 0, "W": 0, "unmarked": 0, "fixed": 0, "worse": 0,
                                      "gain": 0.0, "billed_inr": 0.0, "cost_inr": 0.0})
        c["cases"] += 1
        c["cost_inr"] += row.get("cost_inr") or 0.0
        c["billed_inr"] += (row.get("openrouter_billed_usd") or 0.0) * USD_INR
        if mk is None:
            c["unmarked"] += 1
            continue
        c[mk[0]] += 1
        if b:
            d = VALUE[mk[0]] - VALUE[b["v"]]
            c["fixed"] += d > 0
            c["worse"] += d < 0
            c["gain"] = round(c["gain"] + d, 2)
    for s in rsum.values():
        if "control" in s:
            s["control"]["cost_inr"] = round(s["control"]["cost_inr"], 2)
            s["control"]["billed_inr"] = round(s["control"]["billed_inr"], 2)
        lat = s.pop("lat")
        s["median_s"] = round(statistics.median(lat), 2) if lat else None
        s["cost_inr"], s["billed_inr"] = round(s["cost_inr"], 2), round(s["billed_inr"], 2)

    report = {
        "models": models, "stage_cost_inr": {k: round(v, 2) for k, v in stage_cost.items()},
        "model_stage_cost_inr": {k: {s: round(v, 3) for s, v in d.items()} for k, d in model_stage.items()},
        "total_inr": round(sum(stage_cost.values()), 2), "query_embedding_inr_each": round(q_embed_inr, 5),
        "reasoning": {f"{k[0]}|{k[1]}": {"cost_inr": r.get("cost_inr"), "latency_ms": r.get("latency_ms"),
                                         "mark": reasoning_marks.get(f"{k[0]}|{k[1]}")} for k, r in reasoning.items()},
        "reasoning_summary": rsum,
        "verdicts": {f"{k[0]}|{k[1]}|{k[2]}": v for k, v in verdict.items()},
    }
    (OUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    for lb, m in sorted(models.items(), key=lambda kv: -(kv[1]["score"] or 0)):
        print(f"{lb:17s} score {m['score']} C{m['C']} P{m['P']} W{m['W']} serious {m['serious_answers']} "
              f"median {m['median_s']}s ₹/answer {m['cost_per_answer']} ₹/1000 {m.get('per_1000_questions_inr')}")
    print("stages", report["stage_cost_inr"], "total", report["total_inr"])


if __name__ == "__main__":
    main()

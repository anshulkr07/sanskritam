"""P20-2 — render every authored stroke set for visual verification.

Renders each akṣara's ordered strokes (with the śirorekhā) to a contact sheet
`results/stroke_sheets/strokes.png`. Path syntax errors surface here as
renderer exceptions; wrong letterforms surface to the eye.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

from app.seeds.stroke_data import stroke_catalogue

_REEKHA_Y = 10.0


def _parse_path(d: str):
    """Parse the tiny M/L/C subset used by the stroke data into segments."""
    tokens = re.findall(r"([MLC])\s*((?:[-\d.\s]+))", d)
    pts: list[tuple[float, float]] = []
    curves: list[tuple[tuple[float, float], tuple[float, float], tuple[float, float]]] = []
    cur = None
    for cmd, nums in tokens:
        vals = [float(v) for v in nums.split()]
        if cmd == "M":
            cur = (vals[0], vals[1])
            pts.append(cur)
            for i in range(2, len(vals), 2):
                cur = (vals[i], vals[i + 1])
                pts.append(cur)
        elif cmd == "L":
            for i in range(0, len(vals), 2):
                cur = (vals[i], vals[i + 1])
                pts.append(cur)
        elif cmd == "C":
            for i in range(0, len(vals), 6):
                c1 = (vals[i], vals[i + 1])
                c2 = (vals[i + 2], vals[i + 3])
                p = (vals[i + 4], vals[i + 5])
                curves.append((cur, c1, c2, p))
                cur = p
    return pts, curves


def render_sheet(out_path: str) -> int:
    catalogue = stroke_catalogue()
    letters = sorted(catalogue)
    cols = 11
    rows = (len(letters) + cols - 1) // cols
    fig, axes = plt.subplots(rows, cols, figsize=(cols * 0.9, rows * 1.1))
    for ax in axes.flat:
        ax.set_xlim(0, 100)
        ax.set_ylim(100, 0)
        ax.axis("off")
    colors = ["#0F766E", "#B45309", "#7C3AED", "#BE185D", "#1D4ED8", "#15803D"]
    for i, letter in enumerate(letters):
        ax = axes.flat[i]
        strokes = catalogue[letter]
        # śirorekhā
        ax.plot([5, 95], [_REEKHA_Y, _REEKHA_Y], color="#D6D3D1", lw=1.5, zorder=1)
        for j, s in enumerate(strokes):
            pts, curves = _parse_path(s["d"])
            if pts:
                xs, ys = zip(*pts)
                ax.plot(xs, ys, color=colors[j % len(colors)], lw=2.2, zorder=2)
            for (p0, c1, c2, p1) in curves:
                if p0 is None:
                    continue
                # draw a crude bezier: 24 samples
                ts = [k / 24 for k in range(25)]
                bx = [(1 - t) ** 3 * p0[0] + 3 * (1 - t) ** 2 * t * c1[0]
                      + 3 * (1 - t) * t ** 2 * c2[0] + t ** 3 * p1[0] for t in ts]
                by = [(1 - t) ** 3 * p0[1] + 3 * (1 - t) ** 2 * t * c1[1]
                      + 3 * (1 - t) * t ** 2 * c2[1] + t ** 3 * p1[1] for t in ts]
                ax.plot(bx, by, color=colors[j % len(colors)], lw=2.2, zorder=2)
        ax.text(50, 96, letter, ha="center", va="center", fontsize=13,
                 fontfamily="Nirmala UI")
    # hide trailing empty axes
    for k in range(len(letters), rows * cols):
        axes.flat[k].axis("off")
    fig.tight_layout()
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path, dpi=110)
    plt.close(fig)
    return len(letters)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    n = render_sheet("results/stroke_sheets/strokes.png")
    print(f"rendered {n} akṣaras -> results/stroke_sheets/strokes.png")

"""Import one Parva painting (handover 9.3, runbook 14.4).

Takes the owner's chosen file per key, converts to WebP (1200 px wide hero,
quality 86), uploads through get_storage() to parva-art/<key>.webp, writes
the parva_art row as draft (or approved with --approve).

Usage:
    cd backend && ./.venv/Scripts/python.exe scripts/parva_art_import.py <key> <file> [--approve]
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def main() -> None:
    if len(sys.argv) < 3:
        print("usage: parva_art_import.py <key> <file> [--approve]")
        sys.exit(2)
    key, src = sys.argv[1], Path(sys.argv[2])
    approve = "--approve" in sys.argv
    if not src.is_file():
        print(f"no such file: {src}")
        sys.exit(1)
    try:
        from PIL import Image  # lazy: Pillow only needed here
    except ImportError:
        print("Pillow is not installed; cannot convert. Install pillow to run this import.")
        sys.exit(1)
    img = Image.open(src).convert("RGB")
    w, h = img.size
    new_w = 1200
    new_h = max(1, round(h * new_w / max(1, w)))
    img = img.resize((new_w, new_h))
    import io

    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=86)
    data = buf.getvalue()
    from app.db import SessionLocal, init_db
    from app.models import ParvaArt
    from app.services.storage import get_storage

    init_db()
    url = get_storage().store(data, f"parva-art/{key}.webp", content_type="image/webp")
    db = SessionLocal()
    try:
        row = db.query(ParvaArt).filter(ParvaArt.key == key).first()
        if row is None:
            row = ParvaArt(key=key, url=url, width=new_w, height=new_h, status="approved" if approve else "draft")
            db.add(row)
        else:
            row.url = url
            row.width = new_w
            row.height = new_h
            if approve:
                row.status = "approved"
        db.commit()
        print(f"imported {key}: {url} ({new_w}x{new_h}) status={row.status}")
    finally:
        db.close()


if __name__ == "__main__":
    main()

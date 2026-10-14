"""Install reviewed Home data into this checkout's local SQLite database only.

Never reads production database settings or contacts a content provider.
Keeps a SQLite backup before applying seed updates and versioned pages.
"""
import json, os, sqlite3, sys
from datetime import datetime
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
DATABASE = (ROOT / "app.db").resolve()
if DATABASE.parent != ROOT.resolve(): raise RuntimeError("Database must stay in the local backend checkout.")
os.environ["SHABD_IGNORE_DOTENV"] = "1"
os.environ["DATABASE_URL"] = ""
os.environ["DB_PATH"] = str(DATABASE)
sys.path.insert(0, str(ROOT))
from app.db import SessionLocal
from app.models import ParvaPage
from app.seeds.word_origins import seed_word_origins
from app.seeds.writing_items import seed_writing_items
from app.seeds.home_insights import seed_home_insights
from app.seeds.story_cards import seed_story
from app.services.parva_content import check_draft

def main():
    if not DATABASE.is_file(): raise RuntimeError("Local app.db not found; start the backend to initialise it first.")
    backup_dir = ROOT / "storage/home-backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    backup = backup_dir / f"before-home-{datetime.now().strftime('%Y%m%d-%H%M%S')}.db"
    with sqlite3.connect(str(DATABASE)) as source, sqlite3.connect(str(backup)) as target: source.backup(target)
    with SessionLocal() as db:
        words = seed_word_origins(db)
        seed_home_insights(db)
        seed_writing_items(db)
        seed_story(db)
        pages = 0
        for path in (ROOT / "app/seeds/parva").glob("*.json"):
            if path.name == "passages.json": continue
            document = json.loads(path.read_text(encoding="utf-8"))
            if document.get("status") != "approved": continue
            errors = check_draft(document["body"])
            if errors: raise RuntimeError(f"{path.name}: {errors}")
            latest = db.query(ParvaPage).filter(ParvaPage.slug == document["slug"], ParvaPage.variant == document.get("variant", ""), ParvaPage.lang == document["lang"]).order_by(ParvaPage.version.desc()).first()
            if latest and latest.status == "approved" and latest.body == document["body"]: continue
            db.add(ParvaPage(slug=document["slug"], variant=document.get("variant", ""), lang=document["lang"], version=latest.version + 1 if latest else 1, status="approved", body=document["body"], sources=document.get("sources", []), checked_on="2026-10-14", approved_on="2026-10-14"))
            pages += 1
        db.commit()
    print(f"Local Home content installed: {words['origins']} word origins, 6 reviewed insights, updated writing guides, Introduction, {pages} festival page versions.")
    print(f"Backup: {backup}")

if __name__ == "__main__": main()

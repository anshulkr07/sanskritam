"""Refresh public YouTube metadata, without downloading any video or audio."""
import concurrent.futures
import json
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent


def fetch(video):
    url = "https://www.youtube.com/oembed?" + urlencode({"url": "https://www.youtube.com/watch?v=" + video, "format": "json"})
    try:
        with urlopen(Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=20) as response:
            payload = json.load(response)
        return video, {"title": payload["title"], "channel": payload["author_name"], "publisher_url": payload["author_url"], "status": "metadata available", "checked_on": "2026-10-20"}
    except Exception as error:
        return video, {"status": "metadata unavailable", "error": type(error).__name__, "checked_on": "2026-10-20"}


if __name__ == "__main__":
    catalog = json.loads((HERE / "candidates.json").read_text(encoding="utf-8"))
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        data = dict(pool.map(fetch, sorted({row[1] for row in catalog["candidates"] + catalog.get("previous_candidates", [])})))
    (HERE / "metadata.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"selected_videos": len({r[1] for r in catalog["candidates"]}), "total_including_prior_alternatives": len(data), "metadata_available": sum(v["status"] == "metadata available" for v in data.values()), "unavailable": [k for k, v in data.items() if v["status"] != "metadata available"]}))

"""Index public channel video metadata without downloading media."""
import json
import re
from pathlib import Path
from urllib.request import Request, urlopen

HERE = Path(__file__).resolve().parent
URL = "https://www.youtube.com/c/TheSanskritChannel/videos"


def request(url, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = Request(url, data=data, headers={"User-Agent": "Mozilla/5.0", "Accept-Language": "en-IN,en;q=0.9", "Content-Type": "application/json"})
    with urlopen(req, timeout=35) as response:
        return response.read().decode("utf-8")


def walk(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


def label(value):
    return value.get("simpleText") or "".join(run.get("text", "") for run in value.get("runs", []))


if __name__ == "__main__":
    html = request(URL)
    match = re.search(r"(?:var\s+)?ytInitialData\s*=\s*", html)
    if match is None:
        raise SystemExit("Public channel data was not present in the returned page")
    page = json.JSONDecoder().raw_decode(html[match.end():])[0]
    version = re.search(r'"INNERTUBE_CLIENT_VERSION"\s*:\s*"([^"]+)"', html)
    if version is None:
        raise SystemExit("Public browse client version missing")
    rows, seen_tokens = {}, set()
    for number in range(45):
        for node in walk(page):
            video = node.get("videoRenderer")
            if video:
                rows[video["videoId"]] = {"id": video["videoId"], "title": label(video.get("title", {})), "duration": label(video.get("lengthText", {})), "published": label(video.get("publishedTimeText", {}))}
            video = node.get("lockupViewModel")
            if video and video.get("contentType") == "LOCKUP_CONTENT_TYPE_VIDEO":
                info = video["metadata"]["lockupMetadataViewModel"]
                badges = [n["thumbnailBadgeViewModel"].get("text", "") for n in walk(video.get("contentImage", {})) if "thumbnailBadgeViewModel" in n]
                parts = [part.get("text", {}).get("content", "") for row in info.get("metadata", {}).get("contentMetadataViewModel", {}).get("metadataRows", []) for part in row.get("metadataParts", [])]
                rows[video["contentId"]] = {"id": video["contentId"], "title": info.get("title", {}).get("content", ""), "duration": next((x for x in badges if re.fullmatch(r"[\d:]+", x)), ""), "published": next((x for x in parts if "ago" in x), "")}
        tokens = [sub["continuationCommand"]["token"] for node in walk(page) if "continuationItemRenderer" in node for sub in walk(node["continuationItemRenderer"]) if "continuationCommand" in sub and "token" in sub["continuationCommand"]]
        tokens = [token for token in tokens if token not in seen_tokens]
        print(f"Page {number + 1}: {len(rows)} public video records", flush=True)
        if not tokens:
            break
        token = tokens[0]
        seen_tokens.add(token)
        page = json.loads(request("https://www.youtube.com/youtubei/v1/browse?prettyPrint=false", {"context": {"client": {"clientName": "WEB", "clientVersion": version[1], "hl": "en", "gl": "IN"}}, "continuation": token}))
    payload = {"source": URL, "checked_on": "2026-10-20", "pages": number + 1, "videos": list(rows.values()), "complete": not tokens}
    (HERE / "preferred-channel-catalog.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for row in rows.values():
        if re.search(r"learn|lesson|pronoun|grammar|vowel|consonant|sandhi|samasa|samāsa|metre|meter|chanda|panini|pāṇini|sanskrit sound|verb|reading|speak|syllable|gender|number|case", row["title"], re.I):
            print(json.dumps(row, ensure_ascii=False))

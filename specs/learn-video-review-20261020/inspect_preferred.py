"""Read public title/description and playability metadata; never fetch media."""
import concurrent.futures
import json
import re
import runpy
from pathlib import Path

HERE = Path(__file__).resolve().parent
helpers = runpy.run_path(str(HERE / "research_channel.py"))
request = helpers["request"]
VIDEOS = ["a4rz9NbMq0M", "dq5VdY69RMc", "tB1b9ruKj-Q", "Ke9I2cAKbWU", "J8el0iLkPmM", "qw59h9ln9kA", "s2hReqbgsL0", "6NaNNAjYhrs", "7DgU79MgJaM", "oVZExejYBWc", "HzlO32hjJOc", "c4NcywSuTjs", "LjM5GSSe8mU", "XhaYLon88NM", "DPLIg26NNEY", "RedC_HoF7BU", "odLBIz1VRq4"]


def inspect(video):
    try:
        html = request("https://www.youtube.com/watch?v=" + video)
        match = re.search(r"(?:var\s+)?ytInitialPlayerResponse\s*=\s*", html)
        if not match:
            return video, {"error": "Public player metadata unavailable"}
        body = json.JSONDecoder().raw_decode(html[match.end():])[0]
        detail = body.get("videoDetails", {})
        status = body.get("playabilityStatus", {})
        return video, {"title": detail.get("title"), "channel": detail.get("author"), "channel_id": detail.get("channelId"), "description": detail.get("shortDescription", ""), "duration_seconds": detail.get("lengthSeconds"), "playability": status.get("status"), "reason": status.get("reason"), "embeddable": status.get("playableInEmbed"), "checked_on": "2026-10-20"}
    except Exception as error:
        return video, {"error": str(type(error).__name__)}


if __name__ == "__main__":
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        result = dict(pool.map(inspect, VIDEOS))
    (HERE / "preferred-channel-details.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for video, row in result.items():
        print(video, json.dumps(row, ensure_ascii=False)[:2200])

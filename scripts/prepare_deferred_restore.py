"""Stage deferred sources for a future reviewed release, without editing the app.

Usage: python scripts/prepare_deferred_restore.py voice results/restore-voice
"""
import argparse
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
GROUPS = {
    "voice": ["mobile/src/voiceLab", "mobile/src/screens/VoiceHub.tsx", "mobile/src/screens/VoiceCompanions.tsx", "mobile/src/screens/VoiceSession.tsx"],
    "group": ["mobile/src/community", "mobile/src/screens/Group*.tsx", "mobile/src/screens/Friends.tsx", "mobile/src/screens/RoomLobby.tsx", "mobile/src/games/v2/LiveMatchGame.tsx", "mobile/src/games/v2/useMatchSocket.ts", "mobile/src/games/v2/linkNav.ts"],
    "commerce": ["mobile/src/screens/Membership.tsx", "mobile/src/screens/CommunityEvents.tsx", "mobile/src/services/commerce.ts", "mobile/src/services/storePurchases*", "mobile/src/services/ads*", "mobile/src/services/offlineVault.ts", "mobile/src/components/Commerce*.tsx", "mobile/src/components/NativeSponsor.tsx"],
    "contests": ["mobile/src/screens/Contest*.tsx", "mobile/src/screens/Certificate.tsx", "mobile/src/screens/MasterBoard.tsx", "mobile/src/screens/Leaderboards.tsx"],
}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("feature", choices=GROUPS)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    destination = args.destination.resolve()
    source = ROOT / "deferred"
    if destination.exists():
        parser.error("Use a new destination so existing work cannot be overwritten.")
    if destination.is_relative_to(ROOT / "mobile") or destination.is_relative_to(source):
        parser.error("Stage restoration outside mobile/ and deferred/.")
    destination.mkdir(parents=True)
    for pattern in GROUPS[args.feature]:
        for item in source.glob(pattern):
            target = destination / item.relative_to(source)
            target.parent.mkdir(parents=True, exist_ok=True)
            if item.is_dir():
                shutil.copytree(item, target)
            else:
                shutil.copy2(item, target)
    print(f"Staged {args.feature} in {destination}. Follow deferred/README.md before integrating.")

if __name__ == "__main__":
    main()

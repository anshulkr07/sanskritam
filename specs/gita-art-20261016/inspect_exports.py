"""Verify native exports retain the font and exclude remote painting pixels."""
import argparse,hashlib,json
from pathlib import Path
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--prefix',default='gita-art');parser.add_argument('--directory',help='Shared multi-platform Expo export directory, relative to mobile');args=parser.parse_args()
 art=ROOT/'mobile/src/components/artwork'
 legacy=json.loads((art/'remoteManifest.json').read_text(encoding='utf-8'))
 masters=[json.loads(p.read_text(encoding='utf-8')) for p in (OUT/'deliveries').glob('*.json')]
 # Owner update 2026-10-19 deliberately bundles priority covers/festivals.
 priority={v['sha256'] for key,v in legacy.items() if key.startswith(('covers/','festivals/'))}
 paintings={v['sha256'] for key,v in legacy.items() if not key.startswith(('covers/','festivals/'))}|{v['sha256'] for v in masters}
 variants={Path(urlparse(v['uri']).path).stem for entry in json.loads((art/'verseManifest.json').read_text(encoding='utf-8')).values() for v in entry['variants'].values()}
 font=ROOT/'mobile/node_modules/@expo-google-fonts/tiro-devanagari-sanskrit/400Regular/TiroDevanagariSanskrit_400Regular.ttf'
 font_hash=hashlib.sha256(font.read_bytes()).hexdigest();report={}
 for platform in ['android','ios']:
  base=ROOT/'mobile'/args.directory if args.directory else ROOT/f'mobile/.expo/{args.prefix}-{platform}';meta=json.loads((base/'metadata.json').read_text(encoding='utf-8'))['fileMetadata'][platform]
  paths={base/asset['path'] for asset in meta['assets']};hashes=set();matches=[];size=0;priority_count=0;verse_matches=[]
  for path in paths:
   data=path.read_bytes();digest=hashlib.sha256(data).hexdigest();hashes.add(digest);size+=len(data)
   if digest in paintings or digest[:24] in variants:matches.append(path.name)
   if digest[:24] in variants:verse_matches.append(path.name)
   if digest in priority:priority_count+=1
  assert not matches,'A remote painting was bundled'
  assert font_hash in hashes,'The app Sanskrit font is missing'
  report[platform]={'asset_count':len(paths),'asset_bytes':size,'bundle_bytes':(base/meta['bundle']).stat().st_size,'bundled_remote_paintings':len(matches),'bundled_verse_paintings':len(verse_matches),'bundled_priority_covers_and_festivals':priority_count,'tiro_sanskrit_font_retained':True}
 (OUT/'exports-check.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report))
if __name__=='__main__':main()

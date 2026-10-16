"""Verify native exports retain the font and exclude remote painting pixels."""
import hashlib,json
from pathlib import Path
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent
def main():
 art=ROOT/'mobile/src/components/artwork'
 legacy=json.loads((art/'remoteManifest.json').read_text(encoding='utf-8'))
 masters=[json.loads(p.read_text(encoding='utf-8')) for p in (OUT/'deliveries').glob('*.json')]
 paintings={v['sha256'] for v in legacy.values()}|{v['sha256'] for v in masters}
 variants={Path(urlparse(v['uri']).path).stem for entry in json.loads((art/'verseManifest.json').read_text(encoding='utf-8')).values() for v in entry['variants'].values()}
 font=ROOT/'mobile/node_modules/@expo-google-fonts/tiro-devanagari-sanskrit/400Regular/TiroDevanagariSanskrit_400Regular.ttf'
 font_hash=hashlib.sha256(font.read_bytes()).hexdigest();report={}
 for platform in ['android','ios']:
  base=ROOT/f'mobile/.expo/gita-art-{platform}';meta=json.loads((base/'metadata.json').read_text(encoding='utf-8'))['fileMetadata'][platform]
  paths={base/asset['path'] for asset in meta['assets']};hashes=set();matches=[];size=0
  for path in paths:
   data=path.read_bytes();digest=hashlib.sha256(data).hexdigest();hashes.add(digest);size+=len(data)
   if digest in paintings or digest[:24] in variants:matches.append(path.name)
  assert not matches,'A remote painting was bundled'
  assert font_hash in hashes,'The app Sanskrit font is missing'
  report[platform]={'asset_count':len(paths),'asset_bytes':size,'bundle_bytes':(base/meta['bundle']).stat().st_size,'bundled_remote_paintings':len(matches),'tiro_sanskrit_font_retained':True}
 (OUT/'exports-check.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report))
if __name__=='__main__':main()

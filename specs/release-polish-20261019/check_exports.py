"""Compare actual native export bytes against bundled priority and remote art sources."""
import hashlib,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];MOBILE=ROOT/'mobile';OUT=Path(__file__).resolve().parent
registry=json.loads((MOBILE/'src/components/artwork/remoteManifest.json').read_text(encoding='utf-8'))
priority=[]
for file in ['src/components/book/covers.ts','src/components/artwork/festivals.ts']:
 priority += [MOBILE/'assets'/name for name in re.findall(r'require\("\.\./\.\./\.\./assets/([^\"]+)"\)',(MOBILE/file).read_text(encoding='utf-8'))]
priority=list(dict.fromkeys(priority));report={}
for platform in ['android','ios']:
 export=MOBILE/f'.expo/release-polish-{platform}';metadata=json.loads((export/'metadata.json').read_text(encoding='utf-8'))
 assets=metadata['fileMetadata'][platform]['assets'];hashes={}
 for asset in assets:
  path=export/asset['path'].replace('\\','/');assert path.exists(),path
  hashes[hashlib.sha256(path.read_bytes()).hexdigest()]=asset['path']
 missing=[p.relative_to(MOBILE).as_posix() for p in priority if hashlib.sha256(p.read_bytes()).hexdigest() not in hashes]
 assert not missing,missing
 remote_bundled=[name for name,v in registry.items() if not name.startswith(('covers/','festivals/')) and v['sha256'] in hashes]
 assert not remote_bundled,remote_bundled
 bundle=export/metadata['fileMetadata'][platform]['bundle']
 report[platform]={'export_assets':len(assets),'priority_covers':len([p for p in priority if p.parent.name=='covers']),'priority_festivals':len([p for p in priority if p.parent.name=='festivals']),'priority_bytes':sum(p.stat().st_size for p in priority),'other_remote_paintings_bundled':remote_bundled,'missing_priority':missing,'bundle_sha256':hashlib.sha256(bundle.read_bytes()).hexdigest(),'note':'Asset inventory, not APK/IPA size and not native device testing.'}
(OUT/'export-inventory.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,indent=2))

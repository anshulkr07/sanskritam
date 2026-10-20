"""Check native export inventories exclude every selected remote Learn painting."""
import hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent
manifest=json.loads((ROOT/'mobile/src/story/artwork/manifest.json').read_text(encoding='utf8'));records=[]
for source in [ROOT/'mobile/src/story/artwork/deliveries.json',OUT/'deliveries.json']:records+=json.loads(source.read_text(encoding='utf8'))
hashes=set()
for key,selection in manifest.items():
 row=next(r for r in reversed(records) if r['id']==key and all(r['variants'][v]['uri']==selection[v] for v in ['phone','tablet']))
 hashes.update(v['sha256'] for v in row['variants'].values())
checks=[]
for platform in ['android','ios']:
 folder=ROOT/('mobile/.expo/learn-art-20261020-final-'+platform);meta=folder/'metadata.json';data=json.loads(meta.read_text());index=data['fileMetadata'][platform];assets=[]
 for a in index['assets']:
  f=folder/a['path'];raw=f.read_bytes();sha=hashlib.sha256(raw).hexdigest();assert sha not in hashes,'Remote Learn painting bundled: '+str(f);assets.append({'path':a['path'],'extension':a['ext'],'bytes':len(raw),'sha256':sha})
 bundle=folder/index['bundle'];assert bundle.exists()
 checks.append({'platform':platform,'directory':str(folder),'bundle':index['bundle'],'bundle_sha256':hashlib.sha256(bundle.read_bytes()).hexdigest(),'metadata_sha256':hashlib.sha256(meta.read_bytes()).hexdigest(),'asset_count':len(assets),'remote_learn_paintings_bundled':0,'assets':assets})
audit={'selected_remote_paintings':len(manifest),'selected_remote_variants':len(hashes),'source_manifest_sha256':hashlib.sha256((ROOT/'mobile/src/story/artwork/manifest.json').read_bytes()).hexdigest(),'exports':checks}
(OUT/'export-audit.json').write_text(json.dumps(audit,indent=2)+'\n',encoding='utf8');print([(x['platform'],x['asset_count'],x['remote_learn_paintings_bundled']) for x in checks])

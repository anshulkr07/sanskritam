"""Check both native exports and prove remote paintings were not bundled."""
import hashlib
import json
from pathlib import Path

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]


def main():
    app=ROOT/'mobile/src/story/artwork';manifest=json.loads((app/'manifest.json').read_text('utf-8'))
    records=[]
    for path in [app/'deliveries.json',ROOT/'specs/learn-art-20261020/deliveries.json',HERE/'artwork/deliveries.json']:
        records.extend(json.loads(path.read_text('utf-8')))
    hashes={v['sha256'] for r in records if r['id'] in manifest for name,v in r['variants'].items() if manifest[r['id']].get(name)==v['uri']}
    results={}
    for platform in ['android','ios']:
        folder=ROOT/'mobile/.expo'/('teaching-visual-'+platform)
        metadata=json.loads((folder/'metadata.json').read_text('utf-8'))['fileMetadata'][platform]
        assets=[folder/a['path'].replace('\\','/') for a in metadata['assets']]
        assert all(p.is_file() for p in assets)
        packaged={hashlib.sha256(p.read_bytes()).hexdigest() for p in assets}
        assert not hashes&packaged,'Remote teaching paintings have been bundled'
        bundle=folder/metadata['bundle'];assert bundle.is_file() and bundle.stat().st_size>0
        results[platform]={'bundle':metadata['bundle'],'bundle_bytes':bundle.stat().st_size,'bundle_sha256':hashlib.sha256(bundle.read_bytes()).hexdigest(),
                           'assets':len(assets),'selected_remote_paintings':len(manifest),'remote_painting_derivatives_bundled':0,'passed':True}
    report={'native_exports':results,'limitations':'These are JavaScript/Hermes export checks, not APK installation or physical Android/iOS device testing.'}
    (HERE/'browser/native-exports.json').write_text(json.dumps(report,indent=2)+'\n','utf-8');print(json.dumps(report,indent=2))


if __name__=='__main__':main()

"""Prepare or generate a new song using the approved Ramapathe audio preset."""
import argparse
import json
import os
from pathlib import Path
import httpx
from dotenv import dotenv_values

BACKEND=Path(__file__).resolve().parents[1]
PRESET=BACKEND/'music_presets/ramapathe'

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--lyrics',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--generate',action='store_true',help='Make a paid generation; otherwise only prepare the request.')
    parser.add_argument('--upload-reference',action='store_true',help='Explicitly upload the local reference if its saved provider ID is unavailable.')
    parser.add_argument('--seed',type=int,help='Override the saved successful edit seed.')
    args=parser.parse_args()
    if args.upload_reference and not args.generate:
        parser.error('--upload-reference requires --generate')
    lines=[s.strip() for s in args.lyrics.read_text(encoding='utf-8-sig').splitlines() if s.strip()]
    if len(lines)<3: parser.error('Supply at least three lyric lines, without a title.')
    preset=json.loads((PRESET/'preset.json').read_text(encoding='utf-8'))
    args.output.mkdir(parents=True,exist_ok=True)
    audio=args.output/'song.mp3'
    if args.generate and audio.exists():
        raise SystemExit(f'Existing output preserved: {audio}. Choose another output folder.')
    key=None
    if args.generate:
        values={}
        for p in (BACKEND.parent/'.env',BACKEND/'.env'): values.update(dotenv_values(p))
        key=os.environ.get('ELEVENLABS_API_KEY') or values.get('ELEVENLABS_API_KEY')
        if not key: raise SystemExit('ELEVENLABS_API_KEY is missing from .env.')
    song_id=preset['reference_song_id']
    with httpx.Client(timeout=360) as client:
        if args.upload_reference:
            target=args.output/'reference_upload.json'
            if target.exists():
                song_id=json.loads(target.read_text(encoding='utf-8'))['song_id']
            else:
                with (PRESET/preset['reference_audio']).open('rb') as f:
                    r=client.post('https://api.elevenlabs.io/v1/music/upload',headers={'xi-api-key':key},
                        files={'file':('original_preview.mp3',f,'audio/mpeg')})
                r.raise_for_status()
                target.write_text(json.dumps(r.json(),indent=2),encoding='utf-8')
                song_id=r.json()['song_id']
        chunks=[]
        def section(label,lyrics,kind):
            chunks.append({'text':label+'\n'+'\n'.join(lyrics),'duration_ms':5200*len(lyrics),
                'positive_styles':preset['positive_styles'], 'negative_styles':preset['negative_styles'],
                'context_adherence':preset['context_adherence'],
                'conditioning_ref':{'song_id':song_id,'range':preset['reference_ranges_ms'][kind]},
                'condition_strength':preset['condition_strength']})
        section('[Chorus]',lines[:2],'hook')
        for i in range(2,len(lines)-1,2): section('[Verse]',lines[i:min(i+2,len(lines)-1)],'verse')
        section('[Final Chorus]',lines[-1:],'hook')
        chunks.append({'song_id':song_id,'range':preset['reference_ranges_ms']['outro']})
        if len(chunks)>30: parser.error('Too many lines for the provider chunk limit.')
        body={'model_id':preset['model_id'],'seed':args.seed if args.seed is not None else preset['seed'],
              'composition_plan':{'chunks':chunks},'store_for_inpainting':preset['store_for_inpainting']}
        request=args.output/'request.json'
        request.write_text(json.dumps(body,ensure_ascii=False,indent=2),encoding='utf-8')
        if not args.generate:
            print(f'Prepared {request}; no API call made. Add --generate when ready.'); return
        r=client.post('https://api.elevenlabs.io/v1/music',headers={'xi-api-key':key},json=body,
                      params={'output_format':preset['output_format']})
        if r.status_code!=200:
            (args.output/'error.json').write_text(r.text,encoding='utf-8')
            raise SystemExit(f'Provider rejected generation: HTTP {r.status_code}. See error.json; no automatic retry.')
        if 'audio' not in r.headers.get('content-type',''):
            raise SystemExit('Unexpected response type; audio was not saved.')
        audio.write_bytes(r.content)
        (args.output/'response_metadata.json').write_text(json.dumps({'song_id':r.headers.get('song-id')},indent=2),encoding='utf-8')
        print(f'Saved {audio}. Review Sanskrit pronunciation and style before publishing.')

if __name__=='__main__':main()

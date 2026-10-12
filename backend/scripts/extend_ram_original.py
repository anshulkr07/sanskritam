"""Preserve the selected ElevenLabs preview and repair only its incomplete ending."""
import json
import argparse
from pathlib import Path
import httpx
from render_ram_song_full import BACKEND, credentials

OUT = BACKEND / 'results/ram_original_completed'
SOURCE = BACKEND / 'results/ram_fal_comparison/elevenlabs_preview.mp3'

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--simple-plan',action='store_true')
    args=parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    headers = {'xi-api-key':credentials()}
    with httpx.Client(timeout=360) as client:
        upload_path=OUT/'upload.json'
        if not upload_path.exists():
            with SOURCE.open('rb') as f:
                r=client.post('https://api.elevenlabs.io/v1/music/upload',headers=headers,
                    files={'file':(SOURCE.name,f,'audio/mpeg')},
                    data={'extract_composition_plan':'music_v2_5'})
            if r.status_code != 200:
                raise SystemExit(f'Upload failed {r.status_code}: {r.text[:1200]}')
            upload_path.write_text(json.dumps(r.json(),ensure_ascii=False,indent=2),encoding='utf-8')
        uploaded=json.loads(upload_path.read_text(encoding='utf-8'))
        song_id=uploaded['song_id']
        print('Original preview uploaded for section editing.',flush=True)
        lines=(BACKEND/'results/ram_rap_demo_20261012/lyrics.txt').read_text(encoding='utf-8').strip().splitlines()[2:]
        styles=['same singer, same melody, same vocal timbre and same accompaniment as reference recording',
            'Sanskrit devotional melodic rap, relaxed 92 BPM groove',
            'natural expressive warm adult male singing, connected melodic phrasing',
            'gentle tabla and hip-hop drums, warm bass, acoustic plucked strings and restrained harmonium',
            'sing every supplied Sanskrit word in order, clear final vowels and consonant clusters']
        extracted=uploaded.get('composition_plan') or {}
        for c in extracted.get('chunks',[]):
            for s in c.get('positive_styles',[]):
                if s not in styles and len(styles)<20: styles.append(s)
        neg=['different singer','new arrangement','spoken narration','autotune','extra lyrics','omitted lyrics','English lyrics','Hindi translation']
        if args.simple_plan:
            # Use plain musical descriptors from the accepted upload analysis.
            # The identical audio references still preserve/condition the original.
            styles=['original Sanskrit devotional song','warm male vocals',
                    'acoustic guitar arpeggios','soft shaker','peaceful melodic singing',
                    'natural phrasing','clear Sanskrit diction']
            neg=['spoken narration','distortion','extra lyrics']
        def generate(text,duration,start,end,extra):
            return {'text':text,'duration_ms':duration,'positive_styles':styles+extra,
                'negative_styles':neg,'context_adherence':'high',
                'conditioning_ref':{'song_id':song_id,'range':{'start_ms':start,'end_ms':end}},
                'condition_strength':'xhigh'}
        chunks=[{'song_id':song_id,'range':{'start_ms':0,'end_ms':41780}},
            generate('[Verse]\n'+'\n'.join(lines[6:9]),15600,20300,41780,
                     ['continue the exact verse cadence and melody, one full lyric line per two bars']),
            generate('[Final Chorus]\n'+lines[9],5200,9820,15020,
                     ['repeat the opening hook tune with the supplied closing words']),
            {'song_id':song_id,'range':{'start_ms':52450,'end_ms':55000}}]
        body={'model_id':'music_v2_5','composition_plan':{'chunks':chunks},'seed':20261013,'store_for_inpainting':True}
        (OUT/('request_simple.json' if args.simple_plan else 'request.json')).write_text(json.dumps(body,ensure_ascii=False,indent=2),encoding='utf-8')
        target=OUT/'ram_pathe_original_completed.mp3'
        if target.exists():
            print('Existing edit preserved.'); return
        r=client.post('https://api.elevenlabs.io/v1/music',headers=headers,json=body,
                      params={'output_format':'mp3_44100_128'})
        if r.status_code != 200:
            (OUT/'edit_error.json').write_text(r.text,encoding='utf-8')
            raise SystemExit(f'Edit failed {r.status_code}: {r.text[:1200]}')
        target.write_bytes(r.content)
        (OUT/'response_metadata.json').write_text(json.dumps({'song_id':r.headers.get('song-id')},indent=2),encoding='utf-8')
        print(f'Saved {target}',flush=True)

if __name__=='__main__':main()

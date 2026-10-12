"""Save independent transcription and lyric alignment for caption review."""
import json
import sys
import argparse
import httpx
from render_ram_song_full import BACKEND, OUT, credentials

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    parser=argparse.ArgumentParser()
    parser.add_argument('--audio',type=str)
    args=parser.parse_args()
    audio = __import__('pathlib').Path(args.audio).resolve() if args.audio else OUT / 'ram_pathe_full.mp3'
    output=audio.parent
    lyrics = '\n'.join((BACKEND / 'results/ram_rap_demo_20261012/lyrics.txt').read_text(encoding='utf-8').strip().splitlines()[2:])
    with httpx.Client(timeout=240) as client:
        for name, endpoint, data in [
            ('transcript', 'speech-to-text', {'model_id':'scribe_v2','tag_audio_events':'false','diarize':'false','timestamps_granularity':'word'}),
            ('alignment', 'forced-alignment', {'text':lyrics})]:
            target = output / f'{name}.json'
            if target.exists():
                continue
            with audio.open('rb') as f:
                r = client.post(f'https://api.elevenlabs.io/v1/{endpoint}', headers={'xi-api-key':credentials()}, files={'file':(audio.name,f,'audio/mpeg')},data=data)
            r.raise_for_status()
            target.write_text(json.dumps(r.json(),ensure_ascii=False,indent=2),encoding='utf-8')
            print(f'Saved {name}.')
    print(json.loads((output/'transcript.json').read_text(encoding='utf-8'))['text'])

if __name__ == '__main__':
    main()

"""Generate the complete ten-line song with an explicit Eleven Music plan."""
import json
import os
from pathlib import Path
import httpx
from dotenv import dotenv_values

BACKEND = Path(__file__).resolve().parents[1]
OUT = BACKEND / 'results/ram_song_full'

def credentials():
    values = {}
    for p in (BACKEND.parent / '.env', BACKEND / '.env'):
        values.update(dotenv_values(p))
    return os.environ.get('ELEVENLABS_API_KEY') or values.get('ELEVENLABS_API_KEY')

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    lines = (BACKEND / 'results/ram_rap_demo_20261012/lyrics.txt').read_text(encoding='utf-8').strip().splitlines()[2:]
    assert len(lines) == 10
    base = ['Sanskrit devotional melodic rap', '92 BPM relaxed hip-hop groove',
            'natural expressive adult male singer, warm mid register, earnest and uplifting',
            'gentle tabla and hip-hop drums, warm bass, acoustic plucked strings, restrained harmonium',
            'prominent studio vocals, natural breaths, connected phrasing and dynamic emphasis',
            'sing every supplied Sanskrit word in order with clear final vowels, visarga and consonant clusters',
            'memorable Indian melodic ornaments, subtle vibrato, held vowels']
    negative = ['robotic narration', 'spoken voiceover', 'excessive autotune', 'metallic vocals',
                'choppy edits', 'EDM drops', 'Hindi translation', 'English lyrics', 'extra lyrics', 'skipped lyrics']
    specs = [('[Intro]', [], 3000, ['short instrumental introduction']),
             ('[Chorus]', lines[:2], 13000, ['memorable sung hook, flowing melody']),
             ('[Verse 1]', lines[2:4], 13000, ['melodic rap with connected sung phrasing']),
             ('[Verse 2]', lines[4:6], 13000, ['melodic rap, clear unhurried articulation']),
             ('[Verse 3]', lines[6:8], 13000, ['confident melodic rap, sing both complete lines']),
             ('[Bridge]', lines[8:9], 7000, ['warm uplifting sung melody']),
             ('[Final Chorus]', lines[9:], 7000, ['return to opening hook melody, expressive sustained final words']),
             ('[Outro]', [], 3000, ['short instrumental resolved ending'])]
    chunks = []
    for label, lyrics, duration, style in specs:
        chunks.append({'text': label + ('\n' + '\n'.join(lyrics) if lyrics else ''),
                       'duration_ms': duration, 'positive_styles': base + style,
                       'negative_styles': negative + (['vocals'] if not lyrics else []),
                       'context_adherence': 'high'})
    body = {'model_id': 'music_v2_5', 'seed': 20261012,
            'composition_plan': {'chunks': chunks}, 'store_for_inpainting': True}
    (OUT / 'request.json').write_text(json.dumps(body, ensure_ascii=False, indent=2), encoding='utf-8')
    audio = OUT / 'ram_pathe_full.mp3'
    if audio.exists():
        print('Existing song preserved; no duplicate generation.')
        return
    with httpx.Client(timeout=360) as client:
        r = client.post('https://api.elevenlabs.io/v1/music', headers={'xi-api-key': credentials()},
                        params={'output_format': 'mp3_44100_128'}, json=body)
    if r.status_code != 200:
        print(r.text[:1500])
        raise SystemExit(f'Generation failed: HTTP {r.status_code}')
    audio.write_bytes(r.content)
    metadata = {k: r.headers.get(k) for k in ('song-id', 'request-id', 'content-type', 'character-cost')}
    (OUT / 'response_metadata.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')
    print(f'Saved {audio}; planned duration 72 seconds, all ten lines supplied.')

if __name__ == '__main__':
    main()

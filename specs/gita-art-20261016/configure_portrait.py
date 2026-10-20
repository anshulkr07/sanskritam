"""One-time owner-approved 9:16 override for jobs that have not generated yet.

Run only after all built-in generation workers have drained under generation-hold.
Preserves every generated image's exact existing prompt and original hash.
"""
import hashlib,json
from pathlib import Path
OUT=Path(__file__).resolve().parent
if __name__=='__main__':
 assert (OUT/'generation-hold.json').exists(),'Drain running generation before changing prompt policy'
 path=OUT/'phone-first-jobs.json';overrides=json.loads(path.read_text(encoding='utf-8'));count=0
 for job in json.loads((OUT/'generation-jobs.json').read_text(encoding='utf-8')):
  if (OUT/'deliveries'/f"{job['key']}.json").exists():continue
  old=overrides[job['key']];prompt=old['prompt']
  prompt=prompt.replace('single square 1:1 image, 2048x2048 or the highest actually supported native square resolution','single PORTRAIT 9:16 image, 1080x1920 or the highest actually supported native portrait resolution close to 9:16')
  prompt=prompt.replace('central 60% of width and central 50% of height','central 70% of width and central 70% of height')
  prompt=prompt.replace('complete square painting','complete portrait painting')
  prompt+=' Portrait-format owner update 2026-10-19: create a genuinely tall 9:16 painted composition for phone reading, not a square painting pasted on blank portrait paper. The atmosphere and natural scene should continue organically through the portrait canvas. Keep all important subjects wholly visible, inside quiet margins; no frame-edge clipping. Use one coherent compact narrative group, with detail readable on a phone. This same portrait painting is reused proportionally on tablets and landscape screens; do not create a second image for tablets.'
  assert 'single square' not in prompt.lower() and 'complete square painting' not in prompt.lower()
  overrides[job['key']]={'prompt':prompt,'prompt_sha256':hashlib.sha256(prompt.encode()).hexdigest(),'composition_policy':'phone-portrait-9x16-20261019'};count+=1
 path.write_text(json.dumps(overrides,ensure_ascii=False,indent=2),encoding='utf-8')
 print('Pending portrait jobs:',count)

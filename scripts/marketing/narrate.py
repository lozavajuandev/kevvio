"""Generate local Spanish narration. No remote inference or user data.
Setup/model URLs and licenses are documented in scripts/marketing/README.md.
"""
from pathlib import Path
import json, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
root=Path(__file__).resolve().parents[2]
work=root/'.data/marketing-film'; out=root/'public/marketing'
k=Kokoro(str(work/'kokoro.onnx'),str(work/'voices.bin'))
scenes=json.loads((root/'scripts/marketing/narration.json').read_text())
track=[]; start=0; rate=24000
for i,s in enumerate(scenes):
    samples,rate=k.create(s['text'],voice='ef_dora',speed=1.10,lang='es')
    # A short lead and tail make the camera transition readable without clipping words.
    head=np.zeros(int(.18*rate),dtype=np.float32); tail=np.zeros(int(.35*rate),dtype=np.float32)
    segment=np.concatenate([head,samples,tail]); sf.write(work/f'voice-{i}.wav',segment,rate)
    duration=len(segment)/rate
    s.update(start=round(start,3),end=round(start+duration,3),duration=round(duration,3),speech_start=round(start+.18,3),speech_end=round(start+.18+len(samples)/rate,3))
    start+=duration;track.append(segment)
    print(i,s['chapter'],round(duration,2),flush=True)
sf.write(work/'narration.wav',np.concatenate(track),rate)
(out/'journey-timeline.json').write_text(json.dumps({'duration':round(start,3),'scenes':scenes},ensure_ascii=False,indent=2))
def stamp(seconds):
    ms=round(seconds*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000);return f'{h:02}:{m:02}:{s:02}.{ms:03}'
vtt=['WEBVTT','']
for s in scenes:
    # Split at sentence boundaries; captions stay readable on a phone.
    import re
    phrases=[p.strip() for p in re.findall(r'[^.!?]+[.!?]?',s['text']) if p.strip()]
    chars=sum(len(p) for p in phrases); cursor=s['speech_start']
    for phrase in phrases:
        end=cursor+(s['speech_end']-s['speech_start'])*len(phrase)/chars
        vtt += [f'{stamp(cursor)} --> {stamp(end)}',phrase,'']
        cursor=end
(out/'journey-es.vtt').write_text('\n'.join(vtt))
print('Narration duration',round(start,2),flush=True)

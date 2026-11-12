import re, json, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
K="/tmp/claude-0/-home-user-web/f7107db8-dd15-5997-9308-320b08cacb0e/scratchpad/kokoro/"
k=Kokoro(K+"kokoro-v1.0.int8.onnx",K+"voices-v1.0.bin")
v=k.get_voice_style("am_puck")*.55+k.get_voice_style("am_fenrir")*.25+k.get_voice_style("am_liam")*.2
lines=[l.strip() for l in open("narration.txt") if l.strip()]
SR=24000; lead=0.35; gaps=[.6,.7,.6,.6,.6,.6,.7,.7,.8,1.6]
out=[np.zeros(int(lead*SR))]; t=lead; meta=[]
for i,l in enumerate(lines):
    clean=l.replace("*","")
    a,sr=k.create(clean,voice=v,speed=1.04,lang="en-us")
    # ořez ticha
    nz=np.where(np.abs(a)>0.01)[0]; a=a[max(0,nz[0]-240):nz[-1]+480]
    meta.append({"line":l,"start":round(t,3),"end":round(t+len(a)/SR,3)})
    out.append(a); t+=len(a)/SR
    g=gaps[i]; out.append(np.zeros(int(g*SR))); t+=g
y=np.concatenate(out); sf.write("voice_raw.wav",y,SR)
json.dump(meta,open("lines.json","w"),indent=1); print(round(t,2)); [print(m["start"],m["end"],m["line"]) for m in meta]

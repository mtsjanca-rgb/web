import numpy as np, wave, json, subprocess
SR=48000; D=31.6; N=int(SR*D); rng=np.random.default_rng(21); T=np.arange(N)/SR
def band(x,lo,hi):
    X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X[(f<lo)|(f>hi)]=0; return np.fft.irfft(X,len(x))
def env(n,a=.002,d=.2): t=np.arange(n)/SR; return np.minimum(1,t/a)*np.exp(-t/d)
def add(buf,sig,t,g=1.):
    i=int(t*SR); j=min(N,i+len(sig))
    if j>i: buf[i:j]+=sig[:j-i]*g
def seg(a,b): return ((T>=a)&(T<b)).astype(float)
# ---- hudba: teplý ambient s plucky, 84 BPM, Dmaj9 – Bm11 – Gmaj7 – A6
mus=np.zeros(N); beat=60/84; bar=beat*4
prog=[[146.8,185,220,277.2,329.6],[123.5,146.8,185,220,329.6],[98,146.8,196,246.9,293.7],[110,138.6,164.8,220,277.2]]
for k in range(int(D/bar)+1):
    t0=k*bar; n=int(bar*SR); t=np.arange(n)/SR; ch=prog[k%4]; pad=np.zeros(n)
    for f in ch:
        for det in (-.003,.003): pad+=np.sin(2*np.pi*f*(1+det)*t+np.sin(2*np.pi*.3*t))*.05
    pad*=np.minimum(1,t/1.0)*np.minimum(1,(bar-t)/.8); add(mus,pad,t0)
    # plucky (arpeggio)
    for s in range(8):
        f=ch[(s*2+k)%len(ch)]*2; pn=int(.6*SR); tt=np.arange(pn)/SR
        pl=(np.sin(2*np.pi*f*tt)+.35*np.sin(2*np.pi*2*f*tt))*np.exp(-tt*7)*np.minimum(1,tt/.003)
        add(mus,pl,t0+s*beat/2,.11 if s%2==0 else .07)
    # měkký kick + shaker od 3. taktu
    if k>=1:
        for b in range(4):
            kn=int(.3*SR); tt=np.arange(kn)/SR
            add(mus,np.sin(2*np.pi*np.cumsum(45+60*np.exp(-tt*22))/SR)*env(kn,.002,.13),t0+b*beat,.32)
            sn=int(.08*SR); add(mus,band(rng.standard_normal(sn),5000,11000)*env(sn,.01,.03),t0+b*beat+beat/2,.08)
    # basa
    bn=int(bar*SR); tb=np.arange(bn)/SR; add(mus,np.sin(2*np.pi*ch[0]/2*tb)*np.minimum(1,tb/.04)*np.exp(-tb/1.6)*.22,t0)
mus=band(mus,40,9000); mus/=np.abs(mus).max()
# ---- atmosféra
sfx=np.zeros(N)
wind=band(rng.standard_normal(N),150,1800); wind/=np.abs(wind).max()
sfx+=wind*.10*(1-.2*np.sin(2*np.pi*.15*T))
hum=sum(np.sin(2*np.pi*f*T+np.sin(2*np.pi*.07*T*i))*a for i,(f,a) in enumerate([(62,.5),(124,.25),(187,.12)]))
rum=band(rng.standard_normal(N),40,400); rum/=np.abs(rum).max()
tank=(hum*.6+rum*.5); tg=.05+.10*seg(3.25,12.45)+.14*seg(12.45,25)+.06*seg(25,31.6); sfx+=tank*tg
jet=band(rng.standard_normal(N),300,4500); jet/=np.abs(jet).max(); wh=np.sin(2*np.pi*np.cumsum(2400+30*np.sin(2*np.pi*.5*T))/SR)
jg=.16*seg(0,3.25)+.07*seg(3.25,9.3)+.13*seg(9.3,12.45)+.08*seg(12.45,25)+np.interp(T,[25,25.8,28,31.6],[.1,.22,.12,0])*seg(25,31.6)
sfx+=(jet+wh*.12)*jg
# přechody
for s in (3.25,5.45,9.3,12.45,15.55,18.7,21.7,24.95,28.0):
    n=int(.5*SR); x=band(rng.standard_normal(n),400,4000); x/=np.abs(x).max(); add(sfx,x*np.sin(np.pi*np.linspace(0,1,n))**2,s-.25,.18)
# hydraulika tyče (S6), dvířka (18.9), zasunutí + cvak (20.62)
n=int(1.2*SR); tt=np.arange(n)/SR; add(sfx,np.sin(2*np.pi*np.cumsum(90+40*np.sin(tt*3))/SR)*np.sin(np.pi*tt/1.2)*.2,15.9)
n=int(.4*SR); add(sfx,band(rng.standard_normal(n),800,5000)*env(n,.005,.08),18.9,.35)
n=int(.9*SR); tt=np.arange(n)/SR; add(sfx,band(rng.standard_normal(n),600,3000)*np.sin(np.pi*tt/.9)*.25,19.7)
n=int(1.4*SR); tt=np.arange(n)/SR
clank=sum(np.sin(2*np.pi*f*tt)*np.exp(-tt*d) for f,d in [(180,9),(410,12),(930,16),(1720,22)])*.35+np.sin(2*np.pi*np.cumsum(55+60*np.exp(-tt*20))/SR)*env(n,.001,.15)
add(sfx,clank,20.62,.9)
# palivo: proudění
n=int(3.3*SR); tt=np.arange(n)/SR; flow=band(rng.standard_normal(n),150,1200); flow/=np.abs(flow).max()
flow*=(1+.4*np.sin(2*np.pi*6*tt))*np.minimum(1,tt/.4)*np.minimum(1,(3.3-tt)/.3)
add(sfx,flow,21.75,.28)
# odpojení
add(sfx,clank*.6,25.2,.7)
n=int(2.2*SR); tt=np.arange(n)/SR; x=band(rng.standard_normal(n),300,3500); x/=np.abs(x).max(); add(sfx,x*np.sin(np.pi*tt/2.2)**2,25.7,.35)
# ---- hlas + mix s duckingem
vw=wave.open("voice.wav"); vsr=vw.getframerate(); vc=vw.getnchannels()
v=np.frombuffer(vw.readframes(vw.getnframes()),dtype=np.int16).astype(float)/32768
if vc==2: v=v.reshape(-1,2).mean(1)
voice=np.zeros(N); voice[:min(N,len(v))]=v[:N]
lines=json.load(open("lines.json"))
speak=np.zeros(N)
for L in lines: speak+=seg(L["start"]-.15,L["end"]+.15)
speak=np.clip(speak,0,1); k=int(.25*SR); speak=np.convolve(speak,np.ones(k)/k,mode="same")
mg=.34*(1-.62*speak)
mix=voice*1.0+mus*mg+sfx*(1-.35*speak)
# word SNR (hlas vs hudba během řeči)
m=speak>.9
snr=20*np.log10(np.sqrt(np.mean(voice[m]**2))/np.sqrt(np.mean((mus*mg)[m]**2)))
print("voice/music SNR during speech: %.1f dB"%snr)
fade=np.ones(N); fade[-int(.8*SR):]=np.linspace(1,0,int(.8*SR)); mix*=fade
mix/=np.abs(mix).max()*1.05
pcm=(mix*32767).astype(np.int16)
w=wave.open("mix_raw.wav","wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(np.stack([pcm,pcm],1).tobytes()); w.close()
subprocess.run(["ffmpeg","-v","error","-y","-i","mix_raw.wav","-af","loudnorm=I=-14:TP=-1.5:LRA=11","-ar","48000","mix.wav"],check=True); print("ok")

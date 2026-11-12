import numpy as np, wave
SR=48000; D=10.0; N=int(SR*D); out=np.zeros(N)
rng=np.random.default_rng(7)
def add(sig,t,g=1.0):
    i=int(t*SR); j=min(N,i+len(sig)); out[i:j]+=sig[:j-i]*g
def env(n,a=0.002,dec=0.2):
    t=np.arange(n)/SR; return np.minimum(1,t/a)*np.exp(-t/dec)
def kick(l=0.35):
    n=int(l*SR); t=np.arange(n)/SR; f=45+110*np.exp(-t*28)
    return np.sin(2*np.pi*np.cumsum(f)/SR)*env(n,.001,.12)
def hat():
    n=int(.06*SR); x=rng.standard_normal(n); x=np.diff(x,prepend=0); return x*env(n,.0005,.015)*.35
def boom():
    n=int(.9*SR); t=np.arange(n)/SR; f=38+70*np.exp(-t*10)
    return (np.sin(2*np.pi*np.cumsum(f)/SR)*env(n,.001,.35) + rng.standard_normal(n)*env(n,.001,.03)*.4)
def whoosh(l):
    n=int(l*SR); x=rng.standard_normal(n); t=np.linspace(0,1,n)
    # jednoduchý pohyblivý lowpass
    y=np.zeros(n); a=0.0
    for k in range(n):
        c=0.02+0.25*np.sin(np.pi*t[k]); a+= c*(x[k]-a); y[k]=a
    return y*np.sin(np.pi*t)**1.5*1.8
def pop(f=900):
    n=int(.09*SR); t=np.arange(n)/SR; return np.sin(2*np.pi*(f+800*np.exp(-t*60))*t)*env(n,.001,.03)*.5
def ding():
    n=int(1.2*SR); t=np.arange(n)/SR
    return sum(np.sin(2*np.pi*f*t)*a for f,a in [(1318.5,1),(2637,.35),(1975.5,.25)])*env(n,.002,.35)*.35
def riser(l):
    n=int(l*SR); t=np.arange(n)/SR; f=200+1400*(t/l)**2
    return (np.sin(2*np.pi*np.cumsum(f)/SR)*.25 + rng.standard_normal(n)*.12)*(t/l)**2
def bassnote(f,l):
    n=int(l*SR); t=np.arange(n)/SR
    return np.tanh(2.2*np.sin(2*np.pi*f*t))*env(n,.005,l*.6)*.22
# beat 120 BPM, od 0.0; kick na doby, hat na osminy mezi; ticho 2,3–2,5 před wipe
beat=.5
for k in range(20):
    t=k*beat
    if 2.3<=t<2.5 or 7.3<=t<7.5: continue
    add(kick(),t,.8); add(hat(),t+.25)
# basová linka (Am–F–C–G)
for k,f in enumerate([55,55,43.65,43.65,65.4,65.4,49,49]*3):
    t=k*.5
    if t<10: add(bassnote(f,.45),t)
for t in (0.28,0.68,1.08): add(boom(),t,.55)
add(whoosh(.45),2.28,.7)
for t in (3.3,3.7,4.1): add(pop(700),t,.9)
add(boom(),4.95,.6); add(boom(),7.45,.6)
for k in range(14): add(pop(1500+k*40),5.15+k*.085*(1+k*.05),.25)
add(riser(1.0),6.45,.8)
add(ding(),8.1,1.0); add(pop(1100),8.9,.9)
# měkké dozvuky na konci
fade=np.ones(N); fade[-int(.25*SR):]=np.linspace(1,0.0,int(.25*SR)); out*=fade
out/=np.max(np.abs(out))*1.12
pcm=(out*32767).astype(np.int16); st=np.stack([pcm,pcm],1)
w=wave.open("audio_raw.wav","wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes()); w.close()
print("ok")

import numpy as np, wave
SR=48000; D=31.0; N=int(SR*D); out=np.zeros(N); mus=np.zeros(N); rng=np.random.default_rng(5)
T=np.arange(N)/SR
def add(sig,t,g=1.0,buf=None):
    b=out if buf is None else buf; i=int(t*SR); j=min(N,i+len(sig))
    if j>i: b[i:j]+=sig[:j-i]*g
def band(x,lo,hi):
    X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X[(f<lo)|(f>hi)]=0; return np.fft.irfft(X,len(x))
def env(n,a=.002,d=.2): t=np.arange(n)/SR; return np.minimum(1,t/a)*np.exp(-t/d)
def seg(a,b): return (T>=a)&(T<b)
def ramp(a,b,v0,v1): return np.interp(T,[a,b],[v0,v1])
# --- hudba: Am7 Fmaj7 Cmaj7 G, 90 BPM, 2 doby na akord? 1 takt = 2.667 s
bar=60/90*4
chords=[[220,261.6,329.6,392],[174.6,220,261.6,329.6],[130.8,164.8,196,246.9],[196,246.9,293.7,392]]
for k in range(int(D/bar)+1):
    t0=k*bar; n=int(bar*SR); t=np.arange(n)/SR
    sig=np.zeros(n)
    for f in chords[k%4]:
        for det in (-.004,0,.004):
            ph=2*np.pi*f*(1+det)*t; sig+= (2*(ph/(2*np.pi)%1)-1)*.08
    sig=band(sig,80,1600)*np.minimum(1,t/.6)*np.minimum(1,(bar-t)/.4)
    add(sig,t0,1,mus)
    for b in range(4):
        tk=t0+b*60/90; kn=int(.25*SR); tt=np.arange(kn)/SR
        add(np.sin(2*np.pi*np.cumsum(48+70*np.exp(-tt*25))/SR)*env(kn,.001,.12),tk,.35,mus)
        add(band(rng.standard_normal(int(.05*SR)),5000,12000)*env(int(.05*SR),.0005,.015),tk+30/90,.12,mus)
    bn=int(bar*SR); add(np.sin(2*np.pi*chords[k%4][0]/2*t)*np.minimum(1,t/.05)*np.exp(-t/1.2)*.3,t0,1,mus)
mus/=np.abs(mus).max()
# hudba tišší v S5 a pod hlukem motoru
mg=np.full(N,.32); mg[seg(13.6,19)]=.14; mg[seg(20.2,25.1)]=.22; mg[seg(25.1,31)]=.16
out+=mus*mg
# --- moře/vítr (venku) ---
sea=band(rng.standard_normal(N),60,900); sea/=np.abs(sea).max()
sea*= (0.6+0.4*np.sin(2*np.pi*.18*T))
og=np.full(N,.18); og[seg(20.2,25.1)]=0
out+=sea*og
# --- motor stíhačky ---
roar=band(rng.standard_normal(N),70,2200); roar/=np.abs(roar).max()
whine=np.sin(2*np.pi*np.cumsum(np.full(N,1850)+40*np.sin(2*np.pi*.7*T))/SR)*.08
eng=roar+whine
eg=np.zeros(N)
eg+=np.where(seg(0,4.6), np.interp(T,[0,4.6],[.08,.45]),0)
eg+=np.where(seg(4.6,9.0), .55,0)
eg+=np.where(seg(13.6,20.2), np.interp(T,[13.6,15.9,16.2,18.6,20.2],[.05,.75,.8,.6,.25]),0)
eg+=np.where(seg(25.1,31), np.interp(T,[25.1,25.4,29.8,31],[.3,.9,.9,.2]),0)
out+=eng*eg
# přídavné spalování: praskání
crack=rng.standard_normal(N)*(rng.random(N)<.002)*3; crack=band(crack,100,3000)
out+=np.where(seg(25.1,31),crack*np.interp(T,[25.1,25.4,29.8,31],[.2,.8,.8,.1]),0)
# --- přechody ---
for s in (4.6,9.0,13.6,20.2,25.1):
    n=int(.5*SR); x=band(rng.standard_normal(n),300,4000); x/=np.abs(x).max(); add(x*np.sin(np.pi*np.linspace(0,1,n))**2,s-.25,.3)
# --- dosednutí a chycení ---
TD=16.0; TC=16.19
n=int(.6*SR); tt=np.arange(n)/SR
add(np.sin(2*np.pi*np.cumsum(55+80*np.exp(-tt*18))/SR)*env(n,.001,.2)+band(rng.standard_normal(n),200,3000)*env(n,.001,.04),TD,.9)
# kovové cvaknutí + zvonění lana
n=int(1.6*SR); tt=np.arange(n)/SR
metal=sum(np.sin(2*np.pi*f*tt)*np.exp(-tt*dd) for f,dd in [(420,5),(987,7),(1530,9),(2210,12),(3100,16)])*.3
add(metal+band(rng.standard_normal(n),1500,8000)*env(n,.0005,.03),TC,.8)
# napínání lana: klesající tón
n=int(2.0*SR); tt=np.arange(n)/SR; f=180-90*tt/2
add(np.tanh(3*np.sin(2*np.pi*np.cumsum(f)/SR))*np.minimum(1,tt/.05)*np.exp(-tt/1.2)*.25,TC+.02)
# škrábání háku
n=int(1.8*SR); tt=np.arange(n)/SR; add(band(rng.standard_normal(n),2500,9000)*np.exp(-tt/.8)*.35,TC)
# --- hydraulika ---
n=int(.5*SR); tt=np.arange(n)/SR; add(np.sin(2*np.pi*70*tt)*env(n,.002,.15)+band(rng.standard_normal(n),100,1200)*env(n,.001,.05),20.7,.8)
n=int(2.2*SR); tt=np.arange(n)/SR
add(band(rng.standard_normal(n),900,6000)*np.sin(np.pi*tt/2.2)*.35,20.7)
add(np.sin(2*np.pi*np.cumsum(60+25*tt)/SR)*np.sin(np.pi*tt/2.2)*.35,20.7)
add(np.sin(2*np.pi*55*np.arange(int(.4*SR))/SR)*env(int(.4*SR),.002,.15),22.7,.6)
# rumble v podpalubí
out+=np.where(seg(20.2,25.1),band(rng.standard_normal(N),30,200)*.6,0)
fade=np.ones(N); fade[-int(.6*SR):]=np.linspace(1,0,int(.6*SR)); out*=fade
out/=np.abs(out).max()*1.1
pcm=(out*32767).astype(np.int16)
w=wave.open("audio_raw.wav","wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(np.stack([pcm,pcm],1).tobytes()); w.close(); print("ok")

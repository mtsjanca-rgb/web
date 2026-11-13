import numpy as np, wave
SR=48000; D=49.0; N=int(SR*D); out=np.zeros(N); rng=np.random.default_rng(3)
def add(sig,t,g=1.0):
    i=int(t*SR); j=min(N,i+len(sig))
    if j>i: out[i:j]+=sig[:j-i]*g
def env(n,a=.002,dec=.2):
    t=np.arange(n)/SR; return np.minimum(1,t/a)*np.exp(-t/dec)
def band(x,lo,hi):
    X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X[(f<lo)|(f>hi)]=0; return np.fft.irfft(X,len(x))
def crowd(l, swell=None):
    n=int(l*SR); x=band(rng.standard_normal(n),250,2800); x/=np.abs(x).max()
    m=1+.25*np.sin(np.arange(n)/SR*2*np.pi*.7)
    if swell is not None: m*=swell(np.arange(n)/SR)
    return x*m
def kick():
    n=int(.3*SR); t=np.arange(n)/SR; f=50+120*np.exp(-t*30); return np.sin(2*np.pi*np.cumsum(f)/SR)*env(n,.001,.1)
def snare():
    n=int(.2*SR); return (band(rng.standard_normal(n),900,7000)*.8+np.sin(2*np.pi*190*np.arange(n)/SR)*.4)*env(n,.001,.06)
def hat():
    n=int(.05*SR); return band(rng.standard_normal(n),6000,14000)*env(n,.0005,.012)*.8
def brass(f,l):
    n=int(l*SR); t=np.arange(n)/SR; s=sum(np.sin(2*np.pi*f*k*t)/k**1.1 for k in range(1,9))
    a=np.minimum(1,t/.04)*np.minimum(1,(l-t)/.08); vib=1+.004*np.sin(2*np.pi*5.5*t)
    return np.tanh(1.4*s*vib)*a*.5
def fanfare(t0,notes):
    for (dt,f,l) in notes:
        add(brass(f,l),t0+dt,.55); add(brass(f*1.5,l),t0+dt,.18)
def bang():
    n=int(1.2*SR); t=np.arange(n)/SR
    return rng.standard_normal(n)*env(n,.0005,.05)*1.2 + np.sin(2*np.pi*np.cumsum(60+90*np.exp(-t*20))/SR)*env(n,.001,.25)
def whoosh(l=.45):
    n=int(l*SR); x=band(rng.standard_normal(n),400,5000); tt=np.linspace(0,1,n); return x/np.abs(x).max()*np.sin(np.pi*tt)**2*.7
def flapsnd(t0,l,rate):
    k=t0
    while k<t0+l:
        n=int(.07*SR); add(band(rng.standard_normal(n),300,2500)*env(n,.005,.025)*.5,k); k+=1/rate
def modem(t0,l):
    n=int(l*SR); t=np.arange(n)/SR; seg=(t*14).astype(int); fr=np.where(seg%3==0,1070,np.where(seg%3==1,1270,2100))
    tone=np.sin(2*np.pi*np.cumsum(fr+60*np.sin(2*np.pi*31*t))/SR)
    nz=band(rng.standard_normal(n),1500,4000); nz/=np.abs(nz).max()
    sig=np.where((t>l*.55),nz*.6+tone*.3,tone*.6); sig*=np.minimum(1,t/.02)*np.minimum(1,(l-t)/.05)
    add(sig*.45,t0)
def ding(f=1568):
    n=int(1.0*SR); t=np.arange(n)/SR; return (np.sin(2*np.pi*f*t)+.3*np.sin(2*np.pi*2*f*t))*env(n,.002,.3)*.4
def coo(t0):
    for k,(a,b,l) in enumerate([(330,250,.35),(300,240,.5)]):
        n=int(l*SR); t=np.arange(n)/SR; f=a+(b-a)*t/l
        s=np.sin(2*np.pi*np.cumsum(f)/SR)*(.6+.4*np.sin(2*np.pi*28*t))
        s=np.tanh(2*s)*np.sin(np.pi*t/l)**.6*.5
        add(s,t0+k*.42)
# --- crowd ---
add(crowd(5.9, lambda t: .35+.65*np.exp(-np.maximum(0,t-.5)/2.5)),0.0,.30)
add(crowd(8.0),6.0,.06)
add(crowd(15.9, lambda t: .4+.6*(t/15.9)**2),14.0,.12)
add(crowd(5.0, lambda t: np.exp(-t/2.2)),29.8,.42)
add(crowd(4.0),45.0,.04)
# --- sport bed 140 BPM 6–29.8 ---
b=60/140; t=6.0
bass=[98,98,130.8,146.8]
i=0
while t<29.7:
    g=.45 if t<14 else .7
    add(kick(),t,.7*g); add(hat(),t+b/2,.5*g)
    if i%2==1: add(snare(),t,.5*g)
    f=bass[(i//4)%4]; n=int(b*.9*SR); tt=np.arange(n)/SR
    add(np.tanh(2*np.sin(2*np.pi*f/2*tt))*env(n,.005,.25)*.25*g,t)
    t+=b; i+=1
# --- events ---
add(bang(),0.4,.9)
fanfare(0.55,[(0,523.25,.18),(.2,659.25,.18),(.4,783.99,.18),(.6,1046.5,.7)])
flapsnd(0.45,1.6,9)
for s in (5.75,10.35,13.85,34.85,39.85,44.85): add(whoosh(),s,.55)
add(ding(1318),6.8,.6)
for s in (11.3,12.2): add(ding(988),s,.35)
modem(18.4,2.6)
add(ding(1568),23.3,.4)
add(bang()*.4,29.8,.5)
fanfare(30.0,[(0,392,.15),(.17,523.25,.15),(.34,659.25,.15),(.51,783.99,.15),(.68,1046.5,.15),(.85,1046.5,1.0)])
# slow-mo: dlouhé tóny a zpomalené mávání
n=int(5*SR); tt=np.arange(n)/SR; add(np.sin(2*np.pi*55*tt)*np.sin(np.pi*tt/5)*.25,35.0)
flapsnd(35.2,3.2,1.6)
add(ding(1046),40.6,.35); add(ding(784),41.0,.3)
coo(46.4)
fade=np.ones(N); fade[-int(.4*SR):]=np.linspace(1,0,int(.4*SR)); out*=fade
out/=np.abs(out).max()*1.1
pcm=(out*32767).astype(np.int16)
w=wave.open("audio_raw.wav","wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(np.stack([pcm,pcm],1).tobytes()); w.close(); print("ok")

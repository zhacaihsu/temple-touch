let audioContext,noiseBuffer,bellBufferPromise;
function loadBell(c){
  if(!bellBufferPromise)bellBufferPromise=fetch('./audio/bell.mp3').then(r=>{if(!r.ok)throw Error('bell audio unavailable');return r.arrayBuffer()}).then(a=>c.decodeAudioData(a)).catch(e=>{bellBufferPromise=null;throw e});
  return bellBufferPromise;
}
function playBell(c){
  loadBell(c).then(buffer=>{
    const source=c.createBufferSource(),gain=c.createGain(),limiter=c.createDynamicsCompressor();
    source.buffer=buffer;gain.gain.value=Math.pow(10,volumes.bell/20);
    limiter.threshold.value=-2;limiter.knee.value=3;limiter.ratio.value=12;limiter.attack.value=.003;limiter.release.value=.16;
    source.connect(gain).connect(limiter).connect(c.destination);
    source.onended=()=>{source.disconnect();gain.disconnect();limiter.disconnect()};source.start();
  }).catch(err=>console.warn('金剛鈴音檔載入失敗',err));
}
const volumes={wood:0,drum:0,cymbal:0,bell:0};
try{Object.assign(volumes,JSON.parse(localStorage.getItem('temple-volumes-v2')||'{}'))}catch{}
for(const k of Object.keys(volumes))volumes[k]=Math.max(-10,Math.min(20,Number(volumes[k])||0));
function context(){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;audioContext??=new AC();if(audioContext.state==='suspended')audioContext.resume();return audioContext}
function noise(c){if(noiseBuffer)return noiseBuffer;noiseBuffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const d=noiseBuffer.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return noiseBuffer}
function destination(c,which){const gain=c.createGain();gain.gain.value=Math.pow(10,volumes[which]/20);gain.connect(c.destination);return gain}
function tone(c,dest,freq,end,duration,volume,type='sine',offset=0){const t=c.currentTime+offset,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(end,t+duration*.65);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g).connect(dest);o.start(t);o.stop(t+duration+.02)}
function burst(c,dest,filterFreq,duration,volume,filterType='bandpass',offset=0){const t=c.currentTime+offset,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=noise(c);f.type=filterType;f.frequency.value=filterFreq;f.Q.value=.7;g.gain.setValueAtTime(Math.max(.0002,volume),t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);s.connect(f).connect(g).connect(dest);s.start(t);s.stop(t+duration+.01)}
function play(which){const c=context();if(!c)return;if(which==='bell'){playBell(c);return;}const dest=destination(c,which);
if(which==='wood'){tone(c,dest,680,410,.14,.34);tone(c,dest,1140,650,.065,.12,'triangle');burst(c,dest,1400,.045,.16)}
else if(which==='drum'){tone(c,dest,170,48,.65,.78);tone(c,dest,95,53,.44,.24);burst(c,dest,580,.085,.24,'lowpass')}
else if(which==='cymbal'){burst(c,dest,3800,1.8,.26,'highpass');[520,733,1017,1423,1961].forEach((f,i)=>tone(c,dest,f,f*.98,.6+i*.18,.019,'square'))}
setTimeout(()=>{try{dest.disconnect()}catch{}},3500)}
document.querySelectorAll('[data-volume]').forEach(input=>{const key=input.dataset.volume;input.value=String(volumes[key]??0);const update=()=>{volumes[key]=Number(input.value);document.getElementById('o-'+key).textContent=volumes[key]+' dB';try{localStorage.setItem('temple-volumes-v2',JSON.stringify(volumes))}catch{}};input.addEventListener('input',update);update()});
document.querySelectorAll('.instrument').forEach(b=>{let timer,last=0;function activate(){const now=performance.now();if(now-last<130)return;last=now;play(b.dataset.sound);b.classList.remove('playing');void b.offsetWidth;b.classList.add('playing');clearTimeout(timer);timer=setTimeout(()=>b.classList.remove('playing'),490)}b.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();activate()});b.addEventListener('click',e=>{if(e.detail===0)activate()})});
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));

window.addEventListener("load",()=>{const c=context();if(c)loadBell(c).catch(()=>{})},{once:true});

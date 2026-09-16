import { FilesetResolver, HandLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm';

const video=document.querySelector('#camera'),ink=document.querySelector('#ink'),hud=document.querySelector('#hud');
const ictx=ink.getContext('2d'),hctx=hud.getContext('2d'),status=document.querySelector('#status'),welcome=document.querySelector('#welcome');
const widthInput=document.querySelector('#width'),gestureHint=document.querySelector('#gestureHint'),modeButtons=[...document.querySelectorAll('.mode-btn')];
let landmarker,running=false,mirror=true,lastVideoTime=-1,strokes=[],current=null,smooth=null,lastPoint=null;
let mode='pointer',gestureCandidate=null,gestureSince=0,lastModeChange=0;
const HOLD_MS=480,COOLDOWN_MS=750,ERASER_RADIUS=30;

function resize(){const dpr=Math.min(devicePixelRatio||1,2),r=ink.getBoundingClientRect();for(const c of [ink,hud]){c.width=Math.round(r.width*dpr);c.height=Math.round(r.height*dpr);c.getContext('2d').setTransform(dpr,0,0,dpr,0,0)}redraw()}
addEventListener('resize',resize);
async function initAI(){status.textContent='Carico hand tracking…';const vision=await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');landmarker=await HandLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',delegate:'GPU'},runningMode:'VIDEO',numHands:1,minHandDetectionConfidence:.55,minHandPresenceConfidence:.5,minTrackingConfidence:.5})}
async function start(){try{await initAI();const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720}},audio:false});video.srcObject=stream;await video.play();running=true;welcome.hidden=true;resize();setMode('pointer','ui');requestAnimationFrame(loop)}catch(e){console.error(e);status.textContent='Errore fotocamera / permessi';alert('Impossibile avviare AirBoard. Aprilo via HTTPS e consenti la fotocamera.\n\n'+e.message)}}
document.querySelector('#start').onclick=start;
document.querySelector('#clear').onclick=()=>{strokes=[];current=null;redraw()};
document.querySelector('#undo').onclick=()=>{if(current){current=null;lastPoint=null}else strokes.pop();redraw()};
document.querySelector('#mirror').onclick=()=>{mirror=!mirror;video.style.transform=mirror?'scaleX(-1)':'none'};
document.querySelector('#download').onclick=savePNG;
modeButtons.forEach(b=>b.onclick=()=>setMode(b.dataset.mode,'ui'));
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function mapPoint(p){return{x:(mirror?1-p.x:p.x)*ink.clientWidth,y:p.y*ink.clientHeight}}
function ema(p){if(!smooth)smooth=p;const a=.38;smooth={x:smooth.x+(p.x-smooth.x)*a,y:smooth.y+(p.y-smooth.y)*a};return smooth}
function drawStroke(ctx,s){if(!s?.points?.length)return;ctx.save();ctx.strokeStyle=s.color||'#dff7ff';ctx.lineWidth=s.width||6;ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor='#71d7ff';ctx.shadowBlur=8;ctx.beginPath();const p=s.points;ctx.moveTo(p[0].x,p[0].y);for(let i=1;i<p.length;i++){const m={x:(p[i-1].x+p[i].x)/2,y:(p[i-1].y+p[i].y)/2};ctx.quadraticCurveTo(p[i-1].x,p[i-1].y,m.x,m.y)}ctx.stroke();ctx.restore()}
function redraw(){ictx.clearRect(0,0,ink.clientWidth,ink.clientHeight);for(const s of strokes)drawStroke(ictx,s);if(current)drawStroke(ictx,current)}
function commitStroke(){if(current?.points.length>1)strokes.push(current);current=null;lastPoint=null;redraw()}
function setMode(next,source='gesture'){if(!['pointer','pen','eraser'].includes(next)||next===mode)return;commitStroke();mode=next;lastModeChange=performance.now();gestureCandidate=null;modeButtons.forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));const meta={pointer:['☝️ Puntatore','Muovi senza scrivere'],pen:['✏️ Penna','Indice = scrittura continua'],eraser:['◯ Gomma','Passa sopra i tratti per cancellare']}[mode];status.textContent=meta[0];gestureHint.textContent=source==='gesture'?`${meta[0]} · gesto riconosciuto`: `${meta[0]} · ${meta[1]}`}
function fingerUp(lm,tip,pip){return lm[tip].y<lm[pip].y-.025}
function classifyGesture(lm){const palmScale=Math.max(distance(lm[0],lm[9]),.04);const pinch=distance(lm[8],lm[4])/palmScale<.48;const idx=fingerUp(lm,8,6),mid=fingerUp(lm,12,10),ring=fingerUp(lm,16,14),pinky=fingerUp(lm,20,18);if(pinch)return'pen';if(idx&&mid&&ring&&pinky)return'eraser';if(idx&&!mid&&!ring&&!pinky)return'pointer';return null}
function handleGesture(g,now){if(!g||g===mode||now-lastModeChange<COOLDOWN_MS){gestureCandidate=null;return}if(g!==gestureCandidate){gestureCandidate=g;gestureSince=now;return}const progress=Math.min(1,(now-gestureSince)/HOLD_MS);const names={pointer:'☝️ Puntatore',pen:'🤏 → Penna',eraser:'✋ → Gomma'};gestureHint.textContent=`${names[g]} ${Math.round(progress*100)}%`;if(progress>=1)setMode(g,'gesture')}
function eraseAt(p){let changed=false;const r=ERASER_RADIUS;strokes=strokes.map(s=>{const chunks=[];let chunk=[];for(const q of s.points){if(Math.hypot(q.x-p.x,q.y-p.y)<=r){if(chunk.length>1)chunks.push({...s,points:chunk});chunk=[];changed=true}else chunk.push(q)}if(chunk.length>1)chunks.push({...s,points:chunk});return chunks}).flat();if(changed)redraw()}
function updateHand(lm){const p=ema(mapPoint(lm[8])),now=performance.now(),gesture=classifyGesture(lm);handleGesture(gesture,now);if(mode==='pen'){if(!current)current={points:[],width:+widthInput.value,color:'#eafcff'};if(!lastPoint||Math.hypot(p.x-lastPoint.x,p.y-lastPoint.y)>1.4){current.points.push({...p});lastPoint={...p};redraw()}}else{commitStroke();if(mode==='eraser')eraseAt(p)}drawHUD(p);if(!gestureCandidate){const labels={pointer:'☝️ Puntatore',pen:'✏️ Penna',eraser:'◯ Gomma'};status.textContent=labels[mode]}}
function drawHUD(p){hctx.clearRect(0,0,hud.clientWidth,hud.clientHeight);hctx.save();hctx.beginPath();const radius=mode==='eraser'?ERASER_RADIUS:mode==='pen'?9:7;hctx.arc(p.x,p.y,radius,0,Math.PI*2);if(mode==='eraser'){hctx.fillStyle='#ffffff20';hctx.strokeStyle='#fff';hctx.lineWidth=2;hctx.fill();hctx.stroke()}else{hctx.fillStyle=mode==='pen'?'#fff':'#7ee8ff';hctx.shadowColor='#70dfff';hctx.shadowBlur=16;hctx.fill()}hctx.restore()}
function noHand(){hctx.clearRect(0,0,hud.clientWidth,hud.clientHeight);smooth=null;commitStroke();gestureCandidate=null;status.textContent='Mostra la mano'}
async function loop(){if(!running)return;if(video.readyState>=2&&video.currentTime!==lastVideoTime){lastVideoTime=video.currentTime;const res=landmarker.detectForVideo(video,performance.now());res.landmarks?.length?updateHand(res.landmarks[0]):noHand()}requestAnimationFrame(loop)}
function savePNG(){const out=document.createElement('canvas');out.width=ink.width;out.height=ink.height;const c=out.getContext('2d');c.drawImage(ink,0,0);const a=document.createElement('a');a.download='airboard.png';a.href=out.toDataURL('image/png');a.click()}
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});

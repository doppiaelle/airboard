import { FilesetResolver, HandLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm';

const video = document.querySelector('#camera');
const ink = document.querySelector('#ink');
const hud = document.querySelector('#hud');
const ictx = ink.getContext('2d');
const hctx = hud.getContext('2d');
const status = document.querySelector('#status');
const welcome = document.querySelector('#welcome');
const widthInput = document.querySelector('#width');
let landmarker, running=false, mirror=true, lastVideoTime=-1;
let strokes=[], current=null, smooth=null, lastPoint=null;
let pinchDown=false, pinchFrames=0, releaseFrames=0;

function resize(){
  const dpr=Math.min(devicePixelRatio||1,2), r=ink.getBoundingClientRect();
  for(const c of [ink,hud]){c.width=Math.round(r.width*dpr);c.height=Math.round(r.height*dpr);c.getContext('2d').setTransform(dpr,0,0,dpr,0,0)}
  redraw();
}
addEventListener('resize',resize);

async function initAI(){
  status.textContent='Carico hand tracking…';
  const vision=await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
  landmarker=await HandLandmarker.createFromOptions(vision,{
    baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',delegate:'GPU'},
    runningMode:'VIDEO',numHands:1,minHandDetectionConfidence:.55,minHandPresenceConfidence:.5,minTrackingConfidence:.5
  });
}

async function start(){
  try{
    await initAI();
    const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720}},audio:false});
    video.srcObject=stream; await video.play(); running=true; welcome.hidden=true; resize(); status.textContent='Mostra la mano'; requestAnimationFrame(loop);
  }catch(e){console.error(e);status.textContent='Errore fotocamera / permessi';alert('Impossibile avviare AirBoard. Aprilo via HTTPS e consenti la fotocamera.\n\n'+e.message)}
}

document.querySelector('#start').onclick=start;
document.querySelector('#clear').onclick=()=>{strokes=[];current=null;redraw()};
document.querySelector('#undo').onclick=()=>{strokes.pop();redraw()};
document.querySelector('#mirror').onclick=()=>{mirror=!mirror;video.style.transform=mirror?'scaleX(-1)':'none'};
document.querySelector('#download').onclick=savePNG;

function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function mapPoint(p){
  const w=ink.clientWidth,h=ink.clientHeight;
  return {x:(mirror?1-p.x:p.x)*w,y:p.y*h};
}
function ema(p){if(!smooth)smooth=p; const a=.38;smooth={x:smooth.x+(p.x-smooth.x)*a,y:smooth.y+(p.y-smooth.y)*a};return smooth}
function drawStroke(ctx,s){if(!s?.points?.length)return;ctx.save();ctx.strokeStyle=s.color||'#dff7ff';ctx.lineWidth=s.width||6;ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor='#71d7ff';ctx.shadowBlur=8;ctx.beginPath();const p=s.points;ctx.moveTo(p[0].x,p[0].y);for(let i=1;i<p.length;i++){const m={x:(p[i-1].x+p[i].x)/2,y:(p[i-1].y+p[i].y)/2};ctx.quadraticCurveTo(p[i-1].x,p[i-1].y,m.x,m.y)}ctx.stroke();ctx.restore()}
function redraw(){ictx.clearRect(0,0,ink.clientWidth,ink.clientHeight);for(const s of strokes)drawStroke(ictx,s);if(current)drawStroke(ictx,current)}

function updateHand(lm){
  const index=lm[8], thumb=lm[4], palm=lm[9];
  const raw=mapPoint(index), p=ema(raw);
  const palmScale=Math.max(distance(lm[0],lm[9]),.04);
  const ratio=distance(index,thumb)/palmScale;
  const wantsPinch=ratio<.52;
  if(wantsPinch){pinchFrames++;releaseFrames=0}else{releaseFrames++;pinchFrames=0}
  if(!pinchDown && pinchFrames>=2){pinchDown=true;current={points:[],width:+widthInput.value,color:'#eafcff'};lastPoint=null}
  if(pinchDown && releaseFrames>=2){pinchDown=false;if(current?.points.length>1)strokes.push(current);current=null;lastPoint=null;redraw()}
  if(pinchDown&&current){if(!lastPoint||Math.hypot(p.x-lastPoint.x,p.y-lastPoint.y)>1.4){current.points.push({...p});lastPoint={...p};redraw()}}
  drawHUD(p,pinchDown);status.textContent=pinchDown?'✍️ Scrittura':'☝️ Puntatore';
}
function drawHUD(p,down){hctx.clearRect(0,0,hud.clientWidth,hud.clientHeight);hctx.beginPath();hctx.arc(p.x,p.y,down?10:7,0,Math.PI*2);hctx.fillStyle=down?'#fff':'#7ee8ff';hctx.shadowColor='#70dfff';hctx.shadowBlur=16;hctx.fill();hctx.shadowBlur=0}
function noHand(){hctx.clearRect(0,0,hud.clientWidth,hud.clientHeight);smooth=null;if(pinchDown){pinchDown=false;if(current?.points.length>1)strokes.push(current);current=null;redraw()}status.textContent='Mostra la mano'}

async function loop(){
  if(!running)return;
  if(video.readyState>=2&&video.currentTime!==lastVideoTime){lastVideoTime=video.currentTime;const res=landmarker.detectForVideo(video,performance.now());res.landmarks?.length?updateHand(res.landmarks[0]):noHand()}
  requestAnimationFrame(loop);
}
function savePNG(){
  const out=document.createElement('canvas');out.width=ink.width;out.height=ink.height;const c=out.getContext('2d');c.drawImage(ink,0,0);const a=document.createElement('a');a.download='airboard.png';a.href=out.toDataURL('image/png');a.click();
}
if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});

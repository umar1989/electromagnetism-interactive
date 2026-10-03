(function(){
'use strict';
const $=id=>document.getElementById(id);
const store={
  get(k,d){try{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v)}catch(e){return d}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
};
const TAU=Math.PI*2, rad=d=>d*Math.PI/180, clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const fmt=(x,n=3)=>{if(x===0)return'0';const a=Math.abs(x);return (a>=1e4||a<1e-2)?x.toExponential(n-1).replace('e+','e'):String(+x.toPrecision(n))};
const sci=x=>{if(x===0)return'0';const e=Math.floor(Math.log10(Math.abs(x)));const m=x/Math.pow(10,e);return Math.abs(e)<3?String(+x.toPrecision(3)):(+m.toPrecision(3))+'×10^'+e};

/* ---------- theme ---------- */
function applyTheme(t){if(t)document.documentElement.dataset.theme=t;else delete document.documentElement.dataset.theme}
applyTheme(store.get('theme',null));
$('theme').onclick=()=>{
  const dark=document.documentElement.dataset.theme?document.documentElement.dataset.theme==='dark':matchMedia('(prefers-color-scheme:dark)').matches;
  const t=dark?'light':'dark';applyTheme(t);store.set('theme',t);
};
function C(){
  const s=getComputedStyle(document.documentElement),g=n=>s.getPropertyValue(n).trim();
  return{ink:g('--ink'),muted:g('--muted'),line:g('--line'),blue:g('--blue'),teal:g('--teal'),orange:g('--orange'),red:g('--red'),green:g('--green'),purple:g('--purple'),gold:g('--gold'),card:g('--card')};
}

/* ---------- canvas helpers ---------- */
function cv(id){const c=$(id);return{c,x:c.getContext('2d'),w:c.width,h:c.height}}
function pointer(c,e){const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height}}
function arrow(x,a,b,c2,d,col,lw=3,head=10){
  const ang=Math.atan2(d-b,c2-a);x.strokeStyle=col;x.fillStyle=col;x.lineWidth=lw;x.lineCap='round';
  x.beginPath();x.moveTo(a,b);x.lineTo(c2,d);x.stroke();
  x.beginPath();x.moveTo(c2,d);x.lineTo(c2-head*Math.cos(ang-.4),d-head*Math.sin(ang-.4));x.lineTo(c2-head*Math.cos(ang+.4),d-head*Math.sin(ang+.4));x.closePath();x.fill();
}
function dotSym(x,px,py,r,col,out){
  x.strokeStyle=col;x.fillStyle=col;x.lineWidth=2.5;x.beginPath();x.arc(px,py,r,0,TAU);x.stroke();
  if(out){x.beginPath();x.arc(px,py,r*.28,0,TAU);x.fill()}
  else{const k=r*.62;x.beginPath();x.moveTo(px-k,py-k);x.lineTo(px+k,py+k);x.moveTo(px-k,py+k);x.lineTo(px+k,py-k);x.stroke()}
}
function text(x,s,px,py,col,size=15,align='center',weight='600'){x.fillStyle=col;x.font=weight+' '+size+'px system-ui,sans-serif';x.textAlign=align;x.textBaseline='middle';x.fillText(s,px,py)}

/* simulation loop */
const sims=[];
function addSim(id,draw){const o={el:$(id),draw,vis:true};sims.push(o);
  if('IntersectionObserver'in window)new IntersectionObserver(es=>{o.vis=es[0].isIntersecting},{threshold:0}).observe(o.el)}
let last=performance.now();
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;for(const s of sims)if(s.vis)s.draw(dt,now/1000);requestAnimationFrame(loop)}

/* range binding */
function bind(ids,cb){ids.forEach(([s,v,f])=>{const el=$(s);const upd=()=>{if(v)$(v).textContent=f?f(+el.value):el.value};el.addEventListener('input',()=>{upd();cb&&cb()});upd()})}

/* =========== dot/cross mini game =========== */
(function(){
  const box=$('dotcross');let out=true,right=0,tot=0;
  box.innerHTML='<div id="dcView" style="display:flex;justify-content:center;margin:6px"></div><div class="dctl" style="justify-content:center"><button data-a="out">⊙ Out of page</button><button data-a="in">⊗ Into page</button></div><p class="hint" id="dcMsg" style="text-align:center"></p>';
  function show(){out=Math.random()<.5;$('dcView').innerHTML='<svg width="90" height="90" viewBox="0 0 90 90" role="img" aria-label="Mystery symbol"><circle cx="45" cy="45" r="32" fill="none" stroke="currentColor" stroke-width="4"/>'+(out?'<circle cx="45" cy="45" r="9" fill="currentColor"/>':'<path d="M23 23L67 67M67 23L23 67" stroke="currentColor" stroke-width="4"/>')+'</svg>'}
  box.querySelectorAll('button').forEach(b=>b.onclick=()=>{tot++;const ok=(b.dataset.a==='out')===out;if(ok)right++;$('dcMsg').textContent=(ok?'Correct! ':'Not quite. ')+(out?'A dot means the arrow tip is coming at you (out of the page).':'A cross means you see the tail: it is going into the page.')+'  Score '+right+'/'+tot;show()});
  show();
})();

/* =========== compass explorer =========== */
(function(){
  const {c,x,w,h}=cv('cvCompass');let pol=1,pt={x:w*.5,y:h*.2},traces=[];
  const mx=w/2,my=h/2,d=95;
  const poles=()=>[{x:mx+d,y:my,s:pol},{x:mx-d,y:my,s:-pol}];
  function B(px,py){let bx=0,by=0;for(const p of poles()){const dx=px-p.x,dy=py-p.y,r2=dx*dx+dy*dy+25,r3=Math.pow(r2,1.5);bx+=p.s*dx/r3*1e5;by+=p.s*dy/r3*1e5}return{x:bx,y:by}}
  function trace(px,py,dir){const pts=[[px,py]];let X=px,Y=py;for(let i=0;i<900;i++){const b=B(X,Y),m=Math.hypot(b.x,b.y);if(!m)break;X+=dir*b.x/m*4;Y+=dir*b.y/m*4;if(X<0||X>w||Y<0||Y>h)break;let hit=false;for(const p of poles())if(Math.hypot(X-p.x,Y-p.y)<14)hit=true;pts.push([X,Y]);if(hit)break}return pts}
  function line(pts,col,lw,arrows){const q=C();x.strokeStyle=col;x.lineWidth=lw;x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.stroke();
    if(arrows&&pts.length>40){const i=Math.floor(pts.length/2),a=pts[i-1],b=pts[i+1];arrow(x,a[0],a[1],b[0],b[1],col,lw,9)}}
  function field(){const q=C();const out=[];for(let i=0;i<14;i++){const a=i/14*TAU;const sgn=pol;const p=poles()[0];const sx=p.x+Math.cos(a)*18,sy=p.y+Math.sin(a)*18;const t=trace(sx,sy,pol);out.push(t)}return out}
  let bg=field();
  function redraw(){
    const q=C();x.clearRect(0,0,w,h);
    bg.forEach(t=>line(t,q.teal+'88',1.5,true));
    traces.forEach(t=>line(t,q.orange,3,true));
    // magnet
    x.fillStyle=pol>0?q.blue:q.red;x.fillRect(mx-d-30,my-26,d+30,52);x.fillStyle=pol>0?q.red:q.blue;x.fillRect(mx,my-26,d+30,52);
    text(x,pol>0?'S':'N',mx-d/2-15,my,'#fff',22,'center','800');text(x,pol>0?'N':'S',mx+d/2+15,my,'#fff',22,'center','800');
    // compass
    const b=B(pt.x,pt.y),a=Math.atan2(b.y,b.x);
    x.save();x.translate(pt.x,pt.y);x.fillStyle=q.card;x.strokeStyle=q.ink;x.lineWidth=2;x.beginPath();x.arc(0,0,26,0,TAU);x.fill();x.stroke();x.rotate(a);
    x.fillStyle=q.red;x.beginPath();x.moveTo(24,0);x.lineTo(-3,-7);x.lineTo(-3,7);x.fill();x.fillStyle=q.blue;x.beginPath();x.moveTo(-24,0);x.lineTo(3,-7);x.lineTo(3,7);x.fill();x.restore();
    $('cmpStr').textContent=(Math.hypot(b.x,b.y)>6?'strong':Math.hypot(b.x,b.y)>1.5?'medium':'weak')+' ('+fmt(Math.hypot(b.x,b.y),2)+')';
  }
  let drag=false;
  const mv=e=>{const p=pointer(c,e);pt={x:clamp(p.x,10,w-10),y:clamp(p.y,10,h-10)};redraw()};
  c.addEventListener('pointerdown',e=>{drag=true;c.setPointerCapture(e.pointerId);mv(e)});
  c.addEventListener('pointermove',e=>{if(drag)mv(e)});
  c.addEventListener('pointerup',()=>drag=false);
  $('traceBtn').onclick=()=>{traces.push(trace(pt.x,pt.y,1).reverse().concat(trace(pt.x,pt.y,-1).slice(1)).reverse());redraw()};
  $('clearTrace').onclick=()=>{traces=[];redraw()};
  $('flipMagnet').onclick=()=>{pol*=-1;bg=field();traces=[];redraw()};
  addSim('cvCompass',()=>{}); // theme refresh via redraw on visibility
  new MutationObserver(redraw).observe(document.documentElement,{attributes:true});
  redraw();
})();

/* =========== flux =========== */
(function(){
  const {x,w,h}=cv('cvFlux');
  function draw(){
    const q=C(),th=+$('fthS').value,B=+$('fBS').value,A=+$('fAS').value;
    $('fth').textContent=th+'°';$('fB').textContent=B.toFixed(2);$('fA').textContent=A.toFixed(3);
    const cos=Math.cos(rad(th));$('fcos').textContent=cos.toFixed(3);$('fphi').textContent=(B*A*cos).toPrecision(3)+' Wb';
    x.clearRect(0,0,w,h);
    const n=Math.round(5+B*18),gap=(h-40)/(n-1),cx=w/2,cy=h/2,len=70+A/0.05*110;
    const px=-Math.sin(rad(th))*len,py=Math.cos(rad(th))*len;
    for(let i=0;i<n;i++){const y=20+i*gap;const inside=Math.abs(y-cy)<=Math.abs(py)*1+0.01&&th<89.5;
      arrow(x,40,y,w-40,y,inside?q.teal:q.teal+'66',inside?3:1.5,9)}
    x.strokeStyle=q.orange;x.lineWidth=7;x.lineCap='round';x.beginPath();x.moveTo(cx-px,cy-py);x.lineTo(cx+px,cy+py);x.stroke();
    x.setLineDash([6,5]);arrow(x,cx,cy,cx+Math.cos(rad(th))*90,cy+Math.sin(rad(th))*90,q.purple,2.5,10);x.setLineDash([]);
    text(x,'normal',cx+Math.cos(rad(th))*105+18,cy+Math.sin(rad(th))*105,q.purple,13);
    text(x,'plane (edge view)',cx-px*1.0-70,cy-py*1.0-14,q.orange,13);
    text(x,'B →',60,18,q.teal,15);
    x.strokeStyle=q.ink;x.lineWidth=1.5;x.beginPath();x.arc(cx,cy,34,0,rad(th));x.stroke();text(x,'θ',cx+46,cy+10,q.ink,14);
  }
  ['fthS','fBS','fAS'].forEach(i=>$(i).addEventListener('input',draw));
  new MutationObserver(draw).observe(document.documentElement,{attributes:true});draw();
})();

/* =========== wire field =========== */
(function(){
  const {x,w,h}=cv('cvWire');let out=true;
  function draw(){
    const q=C(),I=+$('wIS').value;$('wI').textContent=I+' A';
    x.clearRect(0,0,w,h);const cx=w/2,cy=h/2,sgn=out?1:-1;
    const nRings=Math.max(2,Math.min(6,Math.round(I/2)+1)),k=sgn; // sgn=1: anticlockwise visually
    for(let i=1;i<=nRings;i++){const r=i*(150/nRings)+10;x.strokeStyle=q.teal;x.globalAlpha=1-i/(nRings+1.5)*.7;x.lineWidth=2.5;x.beginPath();x.arc(cx,cy,r,0,TAU);x.stroke();x.globalAlpha=1;
      const a=rad(40+i*17);const px=cx+r*Math.cos(a),py=cy+r*Math.sin(a);const tx=k*Math.sin(a),ty=-k*Math.cos(a);
      arrow(x,px-tx*2,py-ty*2,px+tx*10,py+ty*10,q.teal,3,10)}
    // compasses
    for(let i=0;i<8;i++){const a=i/8*TAU,r=185;const px=cx+r*Math.cos(a),py=cy+r*Math.sin(a);const ang=Math.atan2(k*-Math.cos(a),k*Math.sin(a));
      x.save();x.translate(px,py);x.fillStyle=q.card;x.strokeStyle=q.ink;x.lineWidth=1.5;x.beginPath();x.arc(0,0,15,0,TAU);x.fill();x.stroke();x.rotate(ang);
      x.fillStyle=q.red;x.beginPath();x.moveTo(13,0);x.lineTo(-1,-5);x.lineTo(-1,5);x.fill();x.fillStyle=q.blue;x.beginPath();x.moveTo(-13,0);x.lineTo(1,-5);x.lineTo(1,5);x.fill();x.restore()}
    x.fillStyle=q.card;x.beginPath();x.arc(cx,cy,24,0,TAU);x.fill();dotSym(x,cx,cy,22,q.red,out);
    $('wireTxt').textContent=out?'Current out of the page ⊙ (thumb towards you): fingers curl ANTICLOCKWISE, so the field is anticlockwise.':'Current into the page ⊗ (thumb away from you): fingers curl CLOCKWISE, so the field is clockwise.';
  }
  $('wireDir').onclick=()=>{out=!out;draw()};$('wIS').addEventListener('input',draw);
  new MutationObserver(draw).observe(document.documentElement,{attributes:true});draw();
})();

/* =========== coil face =========== */
(function(){
  const {x,w,h}=cv('cvCoil');let acw=true;
  function draw(){
    const q=C();x.clearRect(0,0,w,h);const cx=w/2,cy=h/2,R=95;
    x.strokeStyle=q.red;x.lineWidth=7;x.beginPath();x.arc(cx,cy,R,0,TAU);x.stroke();
    for(let i=0;i<4;i++){const a=i/4*TAU+.3;const px=cx+R*Math.cos(a),py=cy+R*Math.sin(a);const dirx=acw?Math.sin(a):-Math.sin(a),diry=acw?-Math.cos(a):Math.cos(a);
      arrow(x,px-dirx*6,py-diry*6,px+dirx*20,py+diry*20,q.orange,4,12)}
    text(x,acw?'N':'S',cx,cy,acw?q.red:q.blue,70,'center','800');
    text(x,'Viewing this face of the coil',w*.18,30,q.muted,14);
    text(x,acw?'Anticlockwise current → this face is NORTH':'Clockwise current → this face is SOUTH',w*.7,cy+130,q.ink,17);
    $('coilTxt').textContent=acw?'Curl your right fingers anticlockwise (as seen): your thumb points towards you, out of this face. Field lines leave here: North.':'Curl your right fingers clockwise: your thumb points away from you. Field lines enter here: South.';
  }
  $('coilDir').onclick=()=>{acw=!acw;draw()};
  new MutationObserver(draw).observe(document.documentElement,{attributes:true});draw();
})();

/* =========== charge in a field =========== */
(function(){
  const {x,w,h}=cv('cvCharge');let a=-Math.PI/2,trail=[];const cx=w/2,cy=h/2,SC=11;
  function params(){const m=+$('cmS').value,v=+$('cvS').value,B=+$('cbS').value,q=+$('cq').value,dir=+$('cdir').value;return{m,v,B,q,dir,r:m*v/B,T:TAU*m/B,s:-q*dir}}
  function readouts(){const p=params();$('cm').textContent=p.m.toFixed(1);$('cv').textContent=p.v;$('cb').textContent=p.B;$('cr').textContent=p.r.toFixed(2)+' units';$('cT').textContent=p.T.toFixed(2)+' s';$('cturn').textContent=p.s>0?'anticlockwise':'clockwise'}
  ['cmS','cvS','cbS','cq','cdir'].forEach(i=>$(i).addEventListener('input',()=>{trail=[];a=-Math.PI/2;readouts()}));
  $('cReset').onclick=()=>{a=-Math.PI/2;trail=[]};$('cTrail').onclick=()=>{trail=[]};readouts();
  addSim('cvCharge',dt=>{
    const q=C(),p=params();if(!reduce)a+=p.s*(TAU/p.T)*dt*1.0;
    x.clearRect(0,0,w,h);
    for(let i=-9;i<=9;i++)for(let j=-5;j<=5;j++){const px=cx+i*48,py=cy+j*48;x.strokeStyle=q.muted;x.globalAlpha=.4;x.lineWidth=1.5;
      if(p.dir<0){x.beginPath();x.moveTo(px-5,py-5);x.lineTo(px+5,py+5);x.moveTo(px-5,py+5);x.lineTo(px+5,py-5);x.stroke()}else{x.beginPath();x.arc(px,py,5,0,TAU);x.stroke();x.fillStyle=q.muted;x.beginPath();x.arc(px,py,1.6,0,TAU);x.fill()}x.globalAlpha=1}
    const R=Math.min(p.r*SC,h/2-12);
    const px=cx+R*Math.cos(a),py=cy-R*Math.sin(a);
    trail.push([px,py]);if(trail.length>700)trail.shift();
    x.strokeStyle=q.teal;x.lineWidth=3;x.beginPath();trail.forEach((t,i)=>i?x.lineTo(t[0],t[1]):x.moveTo(t[0],t[1]));x.stroke();
    x.setLineDash([4,6]);x.strokeStyle=q.muted;x.lineWidth=1.5;x.beginPath();x.arc(cx,cy,R,0,TAU);x.stroke();x.setLineDash([]);
    // velocity (tangent) and force (to centre)
    // tangent for angle a with y flipped: position=(cos a,-sin a); d/da=(-sin a,-cos a)
    const dx=p.s*(-Math.sin(a)),dy=p.s*(-Math.cos(a));
    arrow(x,px,py,px+dx*60,py+dy*60,q.purple,4,12);
    const fx=(cx-px)/R,fy=(cy-py)/R;arrow(x,px,py,px+fx*55,py+fy*55,q.green,4,12);
    x.fillStyle=p.q>0?q.red:q.blue;x.beginPath();x.arc(px,py,10,0,TAU);x.fill();text(x,p.q>0?'+':'−',px,py,'#fff',16,'center','800');
    text(x,'v',px+dx*72,py+dy*72,q.purple,16,'center','800');text(x,'F',px+fx*68,py+fy*68,q.green,16,'center','800');
    text(x,'B '+(p.dir<0?'into page ⊗':'out of page ⊙'),90,20,q.muted,14);
    if(p.r*SC>h/2-12)text(x,'(circle clipped: radius larger than the view)',w/2,h-14,q.orange,13);
  });
})();

/* =========== force direction calculator =========== */
(function(){
  const dirs=[['+x (right →)',[1,0,0]],['−x (left ←)',[-1,0,0]],['+y (up ↑)',[0,1,0]],['−y (down ↓)',[0,-1,0]],['+z (out of page ⊙)',[0,0,1]],['−z (into page ⊗)',[0,0,-1]]];
  const sI=$('wdI'),sB=$('wdB');dirs.forEach((d,i)=>{sI.add(new Option(d[0],i));sB.add(new Option(d[0],i))});sI.value=2;sB.value=5;
  const {x,w,h}=cv('cvForce');
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const name=v=>{const m=dirs.find(d=>d[1].every((k,i)=>k===v[i]));return m?m[0]:'zero (parallel)'};
  function panel(px,label,v,col){const q=C(),cy=h/2+10;text(x,label,px,24,col,17,'center','800');
    x.strokeStyle=q.line;x.lineWidth=1;x.strokeRect(px-110,45,220,235);
    if(v.every(k=>k===0)){text(x,'0',px,cy,col,50,'center','800');return}
    if(v[2]!==0)dotSym(x,px,cy,36,col,v[2]>0);else arrow(x,px-v[0]*70,cy+v[1]*70,px+v[0]*70,cy-v[1]*70,col,6,20)}
  function draw(){
    const q=C(),I=dirs[+sI.value][1],B=dirs[+sB.value][1],F=cross(I,B);x.clearRect(0,0,w,h);
    panel(w*.17,'I (forefinger)',I,q.red);panel(w*.5,'B (middle finger)',B,q.teal);panel(w*.83,'F (thumb)',F,q.green);
    text(x,'×',w*.335,h/2+10,q.ink,34);text(x,'=',w*.665,h/2+10,q.ink,34);
    $('wdF').textContent=name(F);
  }
  sI.onchange=sB.onchange=draw;new MutationObserver(draw).observe(document.documentElement,{attributes:true});draw();
  bind([['fIS','fI'],['fLS','fL'],['fBBS','fBB'],['fTS','fT',v=>v+'°']],()=>{
    const I=+$('fIS').value,L=+$('fLS').value,B=+$('fBBS').value,t=+$('fTS').value,F=I*L*B*Math.sin(rad(t));
    $('fF').textContent=F.toFixed(3)+' N';$('fNote').textContent=t%180===0?'Wire ∥ field: no force.':t===90?'Wire ⟂ field: maximum force ILB.':'';
  });
  $('fIS').dispatchEvent(new Event('input'));
})();

/* =========== motor =========== */
(function(){
  const {x,w,h}=cv('cvMotor');let phi=.5,om=0,hist=[];
  addSim('cvMotor',dt=>{
    const q=C(),comm=$('mComm').checked;
    const steps=4;for(let s=0;s<steps;s++){const d=dt/steps;const c=Math.cos(phi);let tau=comm?Math.abs(c):c;tau*=14;om+=(tau-0.55*om)*d;phi+=om*d}
    const c=Math.cos(phi),cur=comm?(c>=0?1:-1):1;const tau=comm?Math.abs(c):c;
    hist.push(tau);if(hist.length>260)hist.shift();
    x.clearRect(0,0,w,h);const cx=230,cy=h/2,L=120;
    // poles
    x.fillStyle=q.red+'33';x.fillRect(20,cy-110,50,220);x.fillStyle=q.blue+'33';x.fillRect(390,cy-110,50,220);
    text(x,'N',45,cy,q.red,26,'center','800');text(x,'S',415,cy,q.blue,26,'center','800');
    for(let i=0;i<5;i++)arrow(x,85,cy-80+i*40,370,cy-80+i*40,q.teal+'88',1.5,7);
    // coil edge view, plane at angle phi from field direction
    const ax=cx+L*Math.cos(phi),ay=cy-L*Math.sin(phi),bx=cx-L*Math.cos(phi),by=cy+L*Math.sin(phi);
    x.strokeStyle=q.orange;x.lineWidth=6;x.lineCap='round';x.beginPath();x.moveTo(ax,ay);x.lineTo(bx,by);x.stroke();
    x.fillStyle=q.card;[[ax,ay,1],[bx,by,-1]].forEach(([px,py,s])=>dotSym(x,px,py,13,q.red,cur*s>0));
    // force arrows
    [[ax,ay,1],[bx,by,-1]].forEach(([px,py,s])=>{const dir=-s*cur;if(Math.abs(c)>.05)arrow(x,px,py,px,py+dir*40*Math.abs(c),q.green,4,11)});
    text(x,'coil (end view)',cx,h-18,q.muted,13);
    // graph
    const gx=500,gy=40,gw=370,gh=250;x.strokeStyle=q.line;x.lineWidth=1;x.strokeRect(gx,gy,gw,gh);
    x.beginPath();x.moveTo(gx,gy+gh/2);x.lineTo(gx+gw,gy+gh/2);x.stroke();text(x,'torque on the coil',gx+gw/2,gy-14,q.ink,14);text(x,'+',gx+10,gy+14,q.muted,13);text(x,'−',gx+10,gy+gh-14,q.muted,13);
    x.strokeStyle=comm?q.green:q.orange;x.lineWidth=3;x.beginPath();hist.forEach((v,i)=>{const px=gx+i/260*gw,py=gy+gh/2-v*gh*.45;i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke();
    $('mTxt').textContent=comm?'Commutator on: current reverses each half turn, so the torque never changes sign and the coil keeps spinning the same way.':'Commutator off: past the vertical the torque reverses and pulls the coil back. It rocks to and fro and settles. Press “Give it a push” to see it overshoot.';
  });
  $('mKick').onclick=()=>{om+=7};
  $('mComm').onchange=()=>{hist=[]};
})();

/* =========== induction =========== */
(function(){
  const {c,x,w,h}=cv('cvInd');const coilX=600,mw=150;let mxp=200,pol=1,drag=false,prevPhi=0,hist=[],peak=0,face='–',emfS=0,prevD=null,appr=0,dphiS=0;
  const Phi=(xm,B)=>B/Math.pow(1+Math.pow((coilX-xm)/90,2),1.5);
  c.addEventListener('pointerdown',e=>{drag=true;c.setPointerCapture(e.pointerId);mxp=clamp(pointer(c,e).x,mw/2,w-mw/2)});
  c.addEventListener('pointermove',e=>{if(drag)mxp=clamp(pointer(c,e).x,mw/2,w-mw/2)});
  c.addEventListener('pointerup',()=>drag=false);
  $('iFlip').onclick=()=>{pol*=-1};$('iCl').onclick=()=>{mxp=200;peak=0;hist=[]};
  bind([['iNS','iN'],['iBS','iB',v=>v.toFixed(1)]]);
  addSim('cvInd',dt=>{
    const q=C(),N=+$('iNS').value,Bm=+$('iBS').value;
    const phi=pol*Phi(mxp,Bm),dphidt=(phi-prevPhi)/(1/60);prevPhi=phi;
    dphiS+=(dphidt-dphiS)*.5;
    const emf=-N*dphiS*0.02;emfS+=(emf-emfS)*.5;
    hist.push(emfS);if(hist.length>420)hist.shift();peak=Math.max(peak*0.995,Math.abs(emfS));
    const d=coilX-mxp,side=d>0?1:-1;
    const near=side>0?(pol>0?'N':'S'):(pol>0?'S':'N');
    const moving=Math.abs(dphiS)>0.0006;
    const absd=Math.abs(d);let approaching=prevD!==null&&absd<prevD-0.2;if(prevD!==null&&Math.abs(absd-prevD)>0.2)appr=approaching?1:-1;prevD=absd;
    if(!moving)face='– (no change of flux, so no current)';else if(absd<35)face='magnet is inside the coil';else{const f=appr>0?near:(near==='N'?'S':'N');face=f+(appr>0?' (same pole, repels the magnet)':' (opposite pole, attracts the magnet)')}
    $('iDphi').textContent=!moving?'none':dphiS*pol>0?'flux increasing':'flux decreasing';$('iFace').textContent=face;$('iPeak').textContent=peak.toFixed(2);
    x.clearRect(0,0,w,h);
    // coil
    for(let i=0;i<7;i++){const cxp=coilX-30+i*10;x.strokeStyle=q.orange;x.lineWidth=3;x.beginPath();x.ellipse(cxp,150,16,62,0,0,TAU);x.stroke()}
    // wires to galvanometer
    x.strokeStyle=q.ink;x.lineWidth=2;x.beginPath();x.moveTo(coilX-30,90);x.lineTo(coilX-30,40);x.lineTo(780,40);x.lineTo(780,72);x.moveTo(coilX+36,210);x.lineTo(coilX+36,240);x.lineTo(780,240);x.lineTo(780,130);x.stroke();
    // galvanometer
    x.fillStyle=q.card;x.strokeStyle=q.ink;x.lineWidth=2;x.beginPath();x.arc(780,100,48,0,TAU);x.fill();x.stroke();
    for(let i=-4;i<=4;i++){const a=-Math.PI/2+i*.28;x.beginPath();x.moveTo(780+Math.cos(a)*38,100+Math.sin(a)*38);x.lineTo(780+Math.cos(a)*45,100+Math.sin(a)*45);x.stroke()}
    const gd=clamp(emfS/3,-1,1);
    const na=-Math.PI/2+gd*1.15;arrow(x,780,100,780+Math.cos(na)*38,100+Math.sin(na)*38,q.red,3,0);x.fillStyle=q.ink;x.beginPath();x.arc(780,100,4,0,TAU);x.fill();text(x,'G',780,128,q.muted,13);
    // magnet
    const my=150,mh=44;x.fillStyle=pol>0?q.blue:q.red;x.fillRect(mxp-mw/2,my-mh/2,mw/2,mh);x.fillStyle=pol>0?q.red:q.blue;x.fillRect(mxp,my-mh/2,mw/2,mh);
    text(x,pol>0?'S':'N',mxp-mw/4,my,'#fff',22,'center','800');text(x,pol>0?'N':'S',mxp+mw/4,my,'#fff',22,'center','800');
    text(x,'drag me ⇄',mxp,my+mh/2+18,q.muted,13);
    // graph
    const gx=40,gy=270,gw=w-80,gh=110;x.strokeStyle=q.line;x.lineWidth=1;x.strokeRect(gx,gy,gw,gh);x.beginPath();x.moveTo(gx,gy+gh/2);x.lineTo(gx+gw,gy+gh/2);x.stroke();
    text(x,'induced emf',gx+50,gy+12,q.muted,12);
    x.strokeStyle=q.green;x.lineWidth=2.5;x.beginPath();hist.forEach((v,i)=>{const px=gx+i/420*gw,py=gy+gh/2-clamp(v/6,-1,1)*(gh/2-4);i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke();
  });
})();

/* =========== sliding rod =========== */
(function(){
  const {x,w,h}=cv('cvRod');let pos=0;
  bind([['rBS','rB',v=>v.toFixed(1)],['rLS','rL',v=>v.toFixed(1)],['rVS','rV']],()=>{});
  addSim('cvRod',dt=>{
    const q=C(),B=+$('rBS').value,l=+$('rLS').value,v=+$('rVS').value;
    $('rE').textContent=(B*l*v).toFixed(2)+' V';
    pos+=v*dt*14;if(pos>520)pos=0;
    x.clearRect(0,0,w,h);const top=150-l*60,bot=150+l*60,x0=120;
    for(let i=0;i<=12;i++)for(let j=0;j<=5;j++){const px=150+i*55,py=30+j*50;x.strokeStyle=q.muted;x.globalAlpha=.35;x.lineWidth=1.5;x.beginPath();x.moveTo(px-4,py-4);x.lineTo(px+4,py+4);x.moveTo(px-4,py+4);x.lineTo(px+4,py-4);x.stroke();x.globalAlpha=1}
    x.strokeStyle=q.ink;x.lineWidth=4;x.beginPath();x.moveTo(x0,top);x.lineTo(820,top);x.moveTo(x0,bot);x.lineTo(820,bot);x.moveTo(x0,top);x.lineTo(x0,bot);x.stroke();
    x.fillStyle=q.card;x.beginPath();x.arc(x0,150,20,0,TAU);x.fill();x.stroke();text(x,'V',x0,150,q.ink,16,'center','800');
    const rx=x0+60+pos;x.strokeStyle=q.orange;x.lineWidth=8;x.beginPath();x.moveTo(rx,top);x.lineTo(rx,bot);x.stroke();
    if(v>0)arrow(x,rx+12,150,rx+12+Math.min(80,v*7),150,q.purple,4,12);
    text(x,'B into page ⊗',w-90,18,q.muted,13);text(x,'l = '+l.toFixed(1)+' m',rx+50,top-12,q.orange,13);
  });
})();

/* =========== generator =========== */
(function(){
  const {x,w,h}=cv('cvGen');let t=0;
  bind([['gSS','gS',v=>v.toFixed(1)],['gNS','gN']]);
  addSim('cvGen',dt=>{
    const q=C(),f=+$('gSS').value,N=+$('gNS').value,dc=$('gRings').value==='dc';
    if(!reduce)t+=dt;const ph=TAU*f*t;
    const emfAt=p=>{const e=0.1*N*TAU*f*Math.sin(p);return dc?Math.abs(e):e};
    const e=emfAt(ph),flux=0.1*N*Math.cos(ph);
    const cp=Math.abs(Math.cos(ph)),sp=Math.abs(Math.sin(ph));
    $('gPlane').textContent=cp>.97?'vertical (⟂ B)':sp>.97?'horizontal (∥ B)':'tilted';
    $('gFlux').textContent=flux.toFixed(3)+' Wb';$('gEmf').textContent=e.toFixed(2)+' V';
    x.clearRect(0,0,w,h);const cx=170,cy=h/2,L=100;
    x.fillStyle=q.red+'33';x.fillRect(20,cy-120,40,240);x.fillStyle=q.blue+'33';x.fillRect(280,cy-120,40,240);text(x,'N',40,cy,q.red,22,'center','800');text(x,'S',300,cy,q.blue,22,'center','800');
    for(let i=0;i<5;i++)arrow(x,70,cy-80+i*40,270,cy-80+i*40,q.teal+'88',1.5,7);
    const px=-Math.sin(ph)*L,py=Math.cos(ph)*L;
    x.strokeStyle=q.orange;x.lineWidth=7;x.lineCap='round';x.beginPath();x.moveTo(cx-px,cy-py);x.lineTo(cx+px,cy+py);x.stroke();
    const cur=Math.sign(e)||1;x.fillStyle=q.card;dotSym(x,cx+px,cy+py,12,q.red,cur>0);dotSym(x,cx-px,cy-py,12,q.red,cur<0);
    text(x,'A',cx+px+(px>=0?20:-20),cy+py,q.ink,13);text(x,'B',cx-px+(px>=0?-20:20),cy-py,q.ink,13);
    text(x,'coil (end view)',cx,h-16,q.muted,13);
    const gx=380,gy=30,gw=480,gh=290,span=2;x.strokeStyle=q.line;x.lineWidth=1;x.strokeRect(gx,gy,gw,gh);
    x.beginPath();x.moveTo(gx,dc?gy+gh-20:gy+gh/2);x.lineTo(gx+gw,dc?gy+gh-20:gy+gh/2);x.stroke();
    const zero=dc?gy+gh-20:gy+gh/2,k=(dc?gh-50:gh/2-20)/(0.1*10*TAU*3);
    x.strokeStyle=q.green;x.lineWidth=3;x.beginPath();
    for(let i=0;i<=300;i++){const tt=t-span+i/300*span,p=TAU*f*tt,v=emfAt(p);const X=gx+i/300*gw,Y=zero-v*k*1.0;i?x.lineTo(X,clamp(Y,gy+2,gy+gh-2)):x.moveTo(X,clamp(Y,gy+2,gy+gh-2))}x.stroke();
    x.fillStyle=q.red;x.beginPath();x.arc(gx+gw,clamp(zero-e*k,gy+2,gy+gh-2),6,0,TAU);x.fill();
    text(x,dc?'emf (DC: split rings, direction in load never changes)':'emf (AC: alternates, full slip rings)',gx+gw/2,gy+14,q.muted,13);
    text(x,'time →',gx+gw-30,zero-10,q.muted,12);
  });
})();

/* =========== derivations =========== */
const DERIVS={
  'deriv-flux':{title:'Derivation 1: Φ = BA cosθ',steps:[
    ['B=\\dfrac{\\Phi}{A_\\perp}','B is always defined with the area perpendicular to the field.'],
    ['A_\\perp=A\\cos\\theta','θ is the angle between B and the normal; only this part of the plane faces the field.'],
    ['B=\\dfrac{\\Phi}{A\\cos\\theta}','Substitute step 2 into step 1.'],
    ['\\Phi=BA\\cos\\theta','Multiply both sides by A cosθ.']],
    note:'Special cases: θ = 0° (plane ⟂ field) gives Φ = BA, the maximum. θ = 90° (plane ∥ field) gives Φ = 0.'},
  'deriv-circ':{title:'Derivation 2: circular path, r = mv/Bq and T = 2πm/Bq',steps:[
    ['F=qvB','v ⟂ B, so sin 90° = 1.'],
    ['F\\perp v','The force never changes the speed, only the direction, so the motion is uniform circular motion.'],
    ['\\dfrac{mv^2}{r}=qvB','The magnetic force supplies the centripetal force.'],
    ['r=\\dfrac{mv}{Bq}','Multiply by r, cancel one v, divide by qB.'],
    ['T=\\dfrac{2\\pi r}{v}','Time = circumference ÷ speed.'],
    ['T=\\dfrac{2\\pi}{v}\\cdot\\dfrac{mv}{Bq}=\\dfrac{2\\pi m}{Bq}','Substitute r; v cancels.']],
    note:'T does not depend on speed: a faster particle moves in a bigger circle in the same time. (Check this in the simulation above.)'},
  'deriv-wire':{title:'Derivation 3: force on a current-carrying wire, F = ILB',steps:[
    ['F_0=qvB','Force on one charge moving with drift velocity v ⟂ B.'],
    ['F=QvB\\;\\cdots(1)','Add up for the total charge Q inside the field.'],
    ['t=\\dfrac{L}{v}\\Rightarrow v=\\dfrac{L}{t}\\;\\cdots(2)','Time for the charge to cross the length L.'],
    ['F=\\dfrac{QLB}{t}=\\dfrac{Q}{t}LB\\;\\cdots(3)','Put (2) in (1).'],
    ['I=\\dfrac{Q}{t}','Definition of current.'],
    ['F=ILB\\;\\cdots(4)','Put step 5 in (3).'],
    ['F=ILB\\sin\\theta\\;\\cdots(5)','θ is the angle between the current and the field.']],
    note:'Wire ∥ B: F = 0. Wire ⟂ B: F = ILB (maximum).'},
  'deriv-emf':{title:'Derivation 4: Faraday\'s law and ε = Blv (cross-wire set-up)',steps:[
    ['F=BIl\\;\\cdots(8)','Field\'s force on current I in length l (eq. 4); it opposes our push.'],
    ['W=Fs=BIls\\;\\cdots(9)','Our work against it over distance s.'],
    ['\\Delta\\Phi=B(ls)\\;\\cdots(10)','The loop area changes by ls; B ⟂ area so Φ = BA.'],
    ['W=I\\,\\Delta\\Phi','Compare (9) and (10): Bls = ΔΦ.'],
    ['\\dfrac{W}{\\Delta t}=\\dfrac{I\\,\\Delta\\Phi}{\\Delta t}\\;\\cdots(11)','Divide by Δt (work per second = power).'],
    ['P=\\varepsilon I\\;\\cdots(12)','Electric power = emf × current.'],
    ['\\varepsilon=\\dfrac{\\Delta\\Phi}{\\Delta t}','Compare (11) and (12): Faraday\'s law.'],
    ['P=Fv=BIlv\\;\\cdots(14)','Also power = force × velocity, with v = s/Δt.'],
    ['\\varepsilon I=BIlv','(12) and (14) are the same power.'],
    ['\\varepsilon=Blv','Cancel I on both sides.']],
    note:'Energy idea throughout: the work we do against the magnetic force becomes electrical energy.'},
  'deriv-lev':{title:'Why does the ring float?',plain:true,steps:[
    ['AC in the coil','The current keeps changing size and direction.'],
    ['Flux through the ring changes','The ring\'s area is fixed, but the field through it keeps changing.'],
    ['Induced current in the ring','Faraday\'s law.'],
    ['Ring opposes the change','Lenz\'s law: the ring\'s lower face is like the coil\'s upper face (S above S).'],
    ['Repulsion = weight','The upward force balances the weight W: the ring floats.']]}
};
Object.entries(DERIVS).forEach(([id,d])=>{
  const host=$(id);if(!host)return;let shown=0;
  host.innerHTML='<div class="box def" style="margin-top:14px"><b class="t">'+d.title+'</b><span class="hint">Each step shows the working and the reason. Click “Next step” to reveal them one at a time.</span></div><div class="steps"></div><div class="dctl"><button class="primary" data-a="next">Next step</button><button data-a="all">Show all</button><button data-a="reset">Reset</button><span class="hint" data-c></span></div>'+(d.note?'<div class="box answer" data-note hidden><b class="t">Note</b>'+d.note+'</div>':'');
  const st=host.querySelector('.steps'),cnt=host.querySelector('[data-c]'),note=host.querySelector('[data-note]');
  function render(){st.innerHTML=d.steps.slice(0,shown).map((s,i)=>'<div class="step"><div class="n">'+(i+1)+'</div><div><div>'+(d.plain?'<b>'+s[0]+'</b>':'$\\displaystyle '+s[0]+'$')+'</div><div class="why">'+s[1]+'</div></div></div>').join('');
    cnt.textContent=shown+' / '+d.steps.length;if(note)note.hidden=shown<d.steps.length;if(window.renderMathInElement)mathify(st)}
  host.querySelector('[data-a=next]').onclick=()=>{shown=Math.min(d.steps.length,shown+1);render()};
  host.querySelector('[data-a=all]').onclick=()=>{shown=d.steps.length;render()};
  host.querySelector('[data-a=reset]').onclick=()=>{shown=0;render()};
  render();
});
function mathify(el){if(window.renderMathInElement)renderMathInElement(el,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false})}

/* =========== formula sheet =========== */
const FORMULAS=[
  ['Magnetic flux density','$B=\\dfrac{\\Phi}{A}$; tesla (T) = Wb/m² = N/(A m)'],
  ['Magnetic flux','$\\Phi=BA\\cos\\theta$; weber (Wb)'],
  ['Force on a moving charge','$F=qvB\\sin\\theta$ ($=qvB$ when $v\\perp B$)'],
  ['Charge in a uniform field','$r=\\dfrac{mv}{Bq}$; $T=\\dfrac{2\\pi m}{Bq}$'],
  ['Force on a current','$F=ILB\\sin\\theta$ ($=ILB$ when $I\\perp B$)'],
  ['Faraday\'s law','$\\varepsilon=\\dfrac{\\Delta\\Phi}{\\Delta t}$; $N$ turns: $\\varepsilon=N\\dfrac{\\Delta\\Phi_0}{\\Delta t}$'],
  ['Motional emf','$\\varepsilon=Blv$']
];
(function(){
  const t=$('formulas');FORMULAS.forEach(f=>{const r=t.insertRow();r.insertCell().innerHTML='<b>'+f[0]+'</b>';const c=r.insertCell();c.innerHTML='<span class="fm">'+f[1]+'</span> <button style="padding:2px 8px;font-size:.8rem;margin-left:8px">Hide</button>';
    const b=c.querySelector('button'),s=c.querySelector('.fm');b.onclick=()=>{const hid=s.style.visibility==='hidden';s.style.visibility=hid?'visible':'hidden';b.textContent=hid?'Hide':'Show'}})
})();

/* =========== practice =========== */
const MCQ=[
  {q:'Which device converts electrical energy into mechanical energy?',o:['Motor','Battery','Generator','Switch'],a:0,e:'A motor uses the force on a current-carrying coil in a field.'},
  {q:'Which device converts mechanical energy into electrical energy?',o:['Motor','Battery','Generator','Switch'],a:2,e:'A generator spins a coil to change the flux and induce an emf.'},
  {q:'Force on a wire placed perpendicular to a uniform field B (current I, length L)?',o:['0','ILB','2ILB','ILB/2'],a:1,e:'sin 90° = 1, so F = ILB.'},
  {q:'One tesla equals…',o:['N/C','N/(A m)','A/m','N/(A s)'],a:1,e:'B = F/(IL), so the unit is N/(A m).'},
  {q:'The SI unit of magnetic flux is…',o:['dyne','oersted','gauss','weber'],a:3,e:'Weber (Wb). Tesla is the unit of flux density.'},
  {q:'No force acts on a current-carrying conductor kept…',o:['parallel to the field','perpendicular to the field','in the field','away from the field'],a:0,e:'θ = 0°, so sin θ = 0 and F = 0.'},
  {q:'What is the shape of the magnetic field lines around a long straight current-carrying wire?',o:['Straight lines along the wire','Concentric circles around the wire','Parabolas','Spirals'],a:1,e:'They are closed concentric circles in a plane perpendicular to the wire.'},
  {q:'Two N poles are brought close. They…',o:['attract','repel','do nothing','exchange poles'],a:1,e:'Like poles repel.'},
  {q:'A charge moves parallel to a magnetic field. The force on it is…',o:['maximum','qvB/2','zero','infinite'],a:2,e:'sin 0° = 0.'},
  {q:'Which law gives the direction of the induced current?',o:['Faraday\'s law','Lenz\'s law','Ohm\'s law','Coulomb\'s law'],a:1,e:'Lenz: it opposes the change in flux. This follows from conservation of energy.'},
  {q:'Which part reverses the current in a DC motor every half turn?',o:['Slip rings','Brushes','Split rings (commutator)','Armature'],a:2,e:'Split rings swap brush contacts every half turn.'},
  {q:'A bar magnet is held at rest inside a coil. The galvanometer shows…',o:['maximum deflection','deflection one way','deflection the other way','no deflection'],a:3,e:'No change of flux, so no emf.'},
  {q:'If B doubles for a charged particle moving in a circle (same m, v, q), the radius…',o:['doubles','halves','stays the same','becomes 4×'],a:1,e:'r = mv/Bq, so r ∝ 1/B.'},
  {q:'The flux through a plane held parallel to the field is…',o:['BA','BA/2','zero','infinite'],a:2,e:'θ = 90° between B and the normal, so cos θ = 0.'},
  {q:'The emf produced across a rod of length l moving at speed v ⟂ B is…',o:['Bl/v','Blv','Bv/l','lv/B'],a:1,e:'ε = Blv.'},
  {q:'Which rings does an AC generator use?',o:['Split rings','Full slip rings','No rings','Magnetic rings'],a:1,e:'Full slip rings keep the AC; split rings would give DC.'},
  {q:'An electron is moving to the right in a field pointing into the page. Compared with a proton, the force on it is…',o:['in the same direction','in the opposite direction','zero','twice as large'],a:1,e:'Find the direction for +q, then reverse it for the electron.'},
  {q:'An induction stove heats a metal pan because…',o:['the pan is a magnet','the coil conducts heat','current is induced in the pan and heats it','the field is DC'],a:2,e:'The AC field induces currents in the pan; resistance turns them into heat.'}
];
const FLASH=[
  ['Who showed a current affects a compass?','Oersted'],['SI unit of magnetic flux?','weber (Wb)'],['SI unit of flux density?','tesla (T) = Wb/m²'],
  ['Shape of field lines of a straight wire?','Concentric circles'],['Flux through a plane parallel to B?','Zero'],['Force on a charge moving along B?','Zero'],
  ['Long wire wound in a close-packed helix that acts like a bar magnet?','Solenoid'],['Energy change in a motor?','Electrical → mechanical'],['Part that reverses current in a motor?','Split rings (commutator)'],
  ['Law that gives the direction of induced current?','Lenz\'s law'],['Lenz\'s law follows from…?','Conservation of energy'],['Formula for motional emf?','ε = Blv'],
  ['Stove based on induction?','Induction stove'],['Rings used in an AC generator?','Full slip rings'],['Faraday\'s law in words?','Induced emf = rate of change of magnetic flux']
];
const CONCEPT=[
  ['Field lines of a wire are anticlockwise as seen from above. What is the direction of the current?','Thumb rule: anticlockwise field means the current is out of the page, towards the reader.'],
  ['A N pole moves towards a coil. What happens to the flux, and what is the near face of the coil?','The flux through the coil increases; a current is induced so that the near face becomes N (Lenz: it repels the magnet).'],
  ['An anticlockwise current is seen in a coil face. Which pole is that face?','North pole: anticlockwise current gives a field pointing towards the viewer.'],
  ['Why is a TV picture distorted near a magnet?','The picture is made by a moving electron beam. The magnet\'s field exerts F = qvB sinθ on the electrons and deflects them.'],
  ['A coil and a magnet move in the same direction at the same speed. What is the induced current?','Zero. There is no relative motion, so the flux through the coil does not change.'],
  ['Name four applications of Faraday\'s law.','Generators, metal detectors, tape-recorder heads, induction stoves, ATM card readers, transformers.'],
  ['Why is it harder to push a magnet into a closed coil than into an open one?','In a closed coil an induced current flows and repels the magnet; our extra work becomes electrical energy. In an open coil no current flows, so there is no opposing force.'],
  ['Why is a solenoid used for an electromagnet?','Its field inside is strong and nearly uniform like a bar magnet\'s, and it can be switched on and off with the current.'],
  ['Are magnetic field lines closed? Explain.','Yes. For a straight wire they are circles. For a solenoid or bar magnet, the lines outside (N → S) continue inside (S → N) to form closed loops.'],
  ['Why does the commutator make the motor turn the same way continuously?','It reverses the current in the coil every half turn, so the torque keeps the same sense instead of reversing.'],
  ['Why does the ring float above an AC coil, but only jump with DC?','AC keeps the flux changing, so an induced current keeps the ring repelled. With DC the flux changes only when switching on or off.'],
  ['Show that the time period of a charge in a uniform field does not depend on its speed.','qvB = mv²/r gives r = mv/Bq; T = 2πr/v = 2πm/Bq. v cancels.']
];
const prog=store.get('prog',{mcq:{},sec:{}});
let attempts=store.get('att',{n:0,ok:0});
function scoreUI(){$('score').textContent='Score: '+attempts.ok+' / '+attempts.n;
  const secs=Object.values(prog.sec).filter(Boolean).length,mc=Object.values(prog.mcq).filter(Boolean).length;
  const pct=Math.round((secs/4*50)+(mc/MCQ.length*50));$('progress').style.width=pct+'%';$('progressText').textContent=pct+'% complete · '+secs+'/4 sections · '+mc+'/'+MCQ.length+' questions right'}
function saveAll(){store.set('prog',prog);store.set('att',attempts);scoreUI()}
document.querySelectorAll('[data-track]').forEach(cb=>{cb.checked=!!prog.sec[cb.dataset.track];cb.onchange=()=>{prog.sec[cb.dataset.track]=cb.checked;saveAll()}});

(function(){ // MCQ
  const host=$('tab-mcq');host.innerHTML=MCQ.map((m,i)=>'<div class="q" data-i="'+i+'"><p>'+(i+1)+'. '+m.q+'</p><div class="opts">'+m.o.map((o,j)=>'<button data-j="'+j+'">'+String.fromCharCode(97+j)+') '+o+'</button>').join('')+'</div><div class="fb" aria-live="polite"></div></div>').join('')+'<button id="mcqReset">Reset answers</button>';
  host.querySelectorAll('.q').forEach(q=>{const i=+q.dataset.i,m=MCQ[i];q.querySelectorAll('button').forEach(b=>b.onclick=()=>{
    if(q.dataset.done)return;const j=+b.dataset.j;const ok=j===m.a;
    if(ok){q.dataset.done=1;b.classList.add('right');attempts.n++;attempts.ok++;prog.mcq[i]=true;q.querySelector('.fb').textContent='✅ Correct. '+m.e}
    else{b.classList.add('wrong');b.disabled=true;attempts.n++;q.querySelector('.fb').textContent='❌ Not quite, try again.'}
    saveAll()})});
  $('mcqReset').onclick=()=>{prog.mcq={};attempts={n:0,ok:0};saveAll();host.querySelectorAll('.q').forEach(q=>{delete q.dataset.done;q.querySelector('.fb').textContent='';q.querySelectorAll('button').forEach(b=>{b.className='';b.disabled=false})})};
})();

(function(){ // flashcards
  const host=$('tab-flash');let i=0,flip=false,order=FLASH.map((_,k)=>k);
  host.innerHTML='<div class="flash"><div class="face" id="fcFace" tabindex="0" role="button" aria-label="Flip card"></div></div><p class="hint" style="text-align:center">Tap the card to flip. <span id="fcN"></span></p><div class="dctl" style="justify-content:center"><button id="fcPrev">← Previous</button><button id="fcShuf">Shuffle</button><button id="fcNext" class="primary">Next →</button></div>';
  const face=$('fcFace');
  function show(){const f=FLASH[order[i]];face.className='face'+(flip?' back':'');face.textContent=flip?f[1]:f[0];$('fcN').textContent=(i+1)+' / '+FLASH.length}
  face.onclick=()=>{flip=!flip;show()};face.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();flip=!flip;show()}};
  $('fcNext').onclick=()=>{i=(i+1)%FLASH.length;flip=false;show()};$('fcPrev').onclick=()=>{i=(i+FLASH.length-1)%FLASH.length;flip=false;show()};
  $('fcShuf').onclick=()=>{for(let k=order.length-1;k>0;k--){const j=Math.floor(Math.random()*(k+1));[order[k],order[j]]=[order[j],order[k]]}i=0;flip=false;show()};show();
})();

/* numericals */
const rnd=(a,b,st=1)=>{const n=Math.round((b-a)/st);return +(a+Math.floor(Math.random()*(n+1))*st).toFixed(6)};
const pick=a=>a[Math.floor(Math.random()*a.length)];
const NUMS=[
  ()=>{const A=pick([0.2,0.3,0.5,0.8]),B=pick([0.2,0.4,0.5,1.5]);const F=+(B*A).toFixed(4);return{q:`A flux of $${F}$ Wb passes normally through an area of $${A}$ m². Find the flux density $B$.`,a:B,u:'T',s:`$B=\\Phi/A=${F}/${A}=${B}$ T`}},
  ()=>{const B=pick([0.2,0.4,0.5,0.8]),A=pick([0.2,0.5,1.0]),t=pick([0,60]);const a=+(B*A*Math.cos(rad(t))).toPrecision(4);return{q:`$B=${B}$ T, area $${A}$ m², and the normal to the plane makes $${t}^\\circ$ with $B$. Find the flux $\\Phi$.`,a,u:'Wb',s:`$\\Phi=BA\\cos\\theta=${B}\\times${A}\\times\\cos${t}^\\circ=${a}$ Wb`}},
  ()=>{const I=rnd(2,10),L=pick([0.5,1,2,0.2]),B=pick([0.2,0.5,1]);const a=+(I*L*B).toPrecision(4);return{q:`A wire of length $${L}$ m carries $${I}$ A perpendicular to a field of $${B}$ T. Find the force.`,a,u:'N',s:`$F=ILB=${I}\\times${L}\\times${B}=${a}$ N`}},
  ()=>{const F=pick([4,8,6,12]),I=pick([10,20,40,5]),Lc=pick([10,20,25,50]);const L=Lc/100,a=+(F/(I*L)).toPrecision(4);return{q:`A conductor of length $${Lc}$ cm carrying $${I}$ A, perpendicular to a uniform field, feels a force of $${F}$ N. Find $B$. (Convert cm to m!)`,a,u:'T',s:`$L=${L}$ m; $B=F/(IL)=${F}/(${I}\\times${L})=${a}$ T`}},
  ()=>{const v=pick([2,5,10]),B=pick([0.2,0.5,1.0]);const a=+(1.6e-19*v*1e6*B).toPrecision(3);return{q:`A proton ($q=1.6\\times10^{-19}$ C) moves at $${v}\\times10^{6}$ m/s perpendicular to $B=${B}$ T. Find the force. (Answer in scientific notation, e.g. 1.6e-13)`,a,u:'N',s:`$F=qvB=1.6\\times10^{-19}\\times${v}\\times10^6\\times${B}=${sci(a).replace('×10^','\\times10^{')+(sci(a).includes('^')?'}':'')}$ N`}},
  ()=>{const l=pick([0.5,1,2]),v=pick([2,4,10]),B=pick([0.25,0.5,0.8]);const a=+(B*l*v).toPrecision(4);return{q:`A rod of length $${l}$ m moves at $${v}$ m/s perpendicular to a field of $${B}$ T. Find the emf across it.`,a,u:'V',s:`$\\varepsilon=Blv=${B}\\times${l}\\times${v}=${a}$ V`}},
  ()=>{const N=pick([50,100,200,400]),dp=pick([0.001,0.002,0.005]),dt=pick([0.1,0.2,0.5]);const a=+(N*dp/dt).toPrecision(4);return{q:`A coil of $${N}$ turns has flux per turn changing by $${dp}$ Wb in $${dt}$ s. Find the induced emf.`,a,u:'V',s:`$\\varepsilon=N\\Delta\\Phi_0/\\Delta t=${N}\\times${dp}/${dt}=${a}$ V`}},
  ()=>{const F=pick([6,12,9]),I=pick([3,2,6]),B=pick([0.5,1,1.5]);const a=+(F/(I*B)).toPrecision(4);return{q:`$F=ILB$. A force of $${F}$ N acts on a wire carrying $${I}$ A in a $${B}$ T field (wire ⟂ field). Find its length $L$.`,a,u:'m',s:`$L=F/(IB)=${F}/(${I}\\times${B})=${a}$ m`}},
  ()=>{const m=pick([1,2,4]),v=pick([1,2,5]),B=pick([1,2,4]),q=pick([1,2]);const a=+(m*v/(B*q)).toPrecision(4);return{q:`A particle of mass $${m}$ kg and charge $${q}$ C moves at $${v}$ m/s perpendicular to $B=${B}$ T. Find the radius of its circular path.`,a,u:'m',s:`$r=mv/(Bq)=(${m}\\times${v})/(${B}\\times${q})=${a}$ m`}}
];
function parseNum(s){s=String(s).trim().replace(/\s/g,'').replace(/[×x*]10\^?\(?(-?\d+)\)?/i,'e$1').replace(/,/g,'');return Number(s)}
(function(){
  const host=$('tab-num');host.innerHTML='<p class="hint">Fresh numbers every time. Answers within 2% are accepted. Use e-notation for tiny numbers (1.6e-13).</p><div id="numBox"></div><div class="dctl"><button id="numNew" class="primary">New question</button></div>';
  let cur,solved=false;
  function next(){cur=pick(NUMS)();solved=false;$('numBox').innerHTML='<div class="q numq"><p>'+cur.q+'</p><div class="row"><input id="numIn" type="text" inputmode="decimal" placeholder="Your answer" aria-label="Your answer"> <b>'+cur.u+'</b><button id="numCk" class="primary">Check</button><button id="numSol">Show solution</button></div><div class="fb" id="numFb" aria-live="polite"></div></div>';
    mathify($('numBox'));
    const check=()=>{if(solved)return;const v=parseNum($('numIn').value);if(!isFinite(v)||$('numIn').value.trim()===''){$('numFb').textContent='Type a number first.';return}
      attempts.n++;if(Math.abs(v-cur.a)<=Math.abs(cur.a)*0.02){attempts.ok++;solved=true;$('numFb').innerHTML='✅ Correct! '+cur.s}else{$('numFb').textContent='❌ Not quite. Check units (cm→m) and the formula, then try again.'}saveAll();mathify($('numFb'))};
    $('numCk').onclick=check;$('numIn').onkeydown=e=>{if(e.key==='Enter')check()};$('numSol').onclick=()=>{$('numFb').innerHTML='Solution: '+cur.s+' ('+fmt(cur.a,4)+' '+cur.u+')';mathify($('numFb'))}}
  $('numNew').onclick=next;next();
})();

(function(){
  const host=$('tab-concept');host.innerHTML=CONCEPT.map((c,i)=>'<details><summary>'+(i+1)+'. '+c[0]+'</summary><div class="inner"><div class="box answer">'+c[1]+'</div></div></details>').join('');
})();

document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.tabs button').forEach(o=>o.setAttribute('aria-selected',o===b));
  ['mcq','flash','num','concept'].forEach(t=>$('tab-'+t).hidden=t!==b.dataset.tab);
});

/* nav highlight */
(function(){const links=[...document.querySelectorAll('nav.top a')];const secs=links.map(a=>document.querySelector(a.getAttribute('href')));
  if(!('IntersectionObserver'in window))return;
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){links.forEach(l=>l.classList.toggle('active',l.getAttribute('href')==='#'+e.target.id))}}),{rootMargin:'-40% 0px -55% 0px'});
  secs.forEach(s=>s&&io.observe(s))})();

scoreUI();
function init(){mathify(document.body)}
if(window.renderMathInElement)init();else window.addEventListener('load',init);
requestAnimationFrame(loop);
})();

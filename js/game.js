import { CONFIG } from './config.js';
export const STATES = Object.freeze({ MENU:'MENU', PLAYING:'PLAYING', GAME_OVER:'GAME_OVER', RANKING:'RANKING' });
const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
export class Game {
  constructor(canvas, assets, onUpdate, onEnd) {
    Object.assign(this,{canvas,assets,onUpdate,onEnd,state:STATES.MENU,balls:[],effects:[],drag:null,width:1,height:1,scale:1,scaleFrom:1,growthAt:0,bounce:0});
    this.ctx = canvas.getContext('2d');
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && this.state === STATES.PLAYING) this.tick(performance.now()); });
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    this.input?.cancel(); this.width=rect.width; this.height=rect.height;
    const dpr=Math.min(devicePixelRatio||1,2); this.canvas.width=Math.round(this.width*dpr); this.canvas.height=Math.round(this.height*dpr); this.ctx.setTransform(dpr,0,0,dpr,0,0);
    this.balls.forEach(ball => Object.assign(ball,this.spawnPoint(),{returning:null})); this.draw(performance.now());
  }
  start(name) {
    cancelAnimationFrame(this.frame); clearTimeout(this.endTimer); this.input?.cancel();
    Object.assign(this,{name,state:STATES.PLAYING,score:0,collected:0,scale:CONFIG.bob.initialScale,scaleFrom:CONFIG.bob.initialScale,growthAt:0,bounce:0,balls:[],effects:[],drag:null,remaining:CONFIG.duration});
    this.resize(); for(let i=0;i<CONFIG.maxBalls;i++) this.balls.push(this.newBall());
    this.lastFrame=performance.now();this.deadline=this.lastFrame+CONFIG.duration*1000; this.onUpdate(this); this.frame=requestAnimationFrame(t=>this.loop(t));
    this.endTimer=setTimeout(()=>this.finish(),CONFIG.duration*1000);
  }
  visualScale(now) { const t=clamp((now-this.growthAt)/350,0,1); return this.scaleFrom+(this.scale-this.scaleFrom)*(1-(1-t)**3); }
  bobRect(now=performance.now(), maximum=false) {
    const base=Math.min(200,this.width*.43,this.height*.31);
    const factor=maximum ? CONFIG.bob.maxScale*1.05 : this.visualScale(now)*(1+Math.sin(clamp((now-this.bounce)/350,0,1)*Math.PI)*.045);
    const ratio=this.assets.bob ? this.assets.bob.width/this.assets.bob.height : 1;
    const w=base*factor*Math.min(1,ratio),h=base*factor*Math.min(1,1/ratio); return {x:(this.width-w)/2,y:this.height-h-15,w,h};
  }
  hitbox(now) { const r=this.bobRect(now),h=CONFIG.bob.hitbox; return {x:r.x+r.w*h.x,y:r.y+r.h*h.y,w:r.w*h.width,h:r.h*h.height}; }
  spawnPoint(fromSky=false) {
    const radius=CONFIG.ballRadius, top=fromSky ? radius+5 : 70, bottom=fromSky ? top+8 : Math.max(top,this.bobRect(0,true).y-radius-12);
    let best={x:radius+5,y:top},bestDistance=-1;
    for(let i=0;i<100;i++) {
      const p={x:radius+5+Math.random()*Math.max(1,this.width-2*radius-10),y:top+Math.random()*(bottom-top)};
      const distance=this.balls.reduce((min,b)=>Math.min(min,Math.hypot(p.x-b.x,p.y-b.y)),Infinity);
      if(distance>bestDistance){best=p;bestDistance=distance;} if(distance>radius*2+14) return p;
    } return best;
  }
  newBall(fromSky=false){
    let ticket=Math.random()*CONFIG.items.reduce((sum,item)=>sum+item.weight,0);
    const item=CONFIG.items.find(item=>(ticket-=item.weight)<0) || CONFIG.items.at(-1);
    const fall = item.fall ?? CONFIG.fall;
    return {...this.spawnPoint(fromSky),item,radius:CONFIG.ballRadius,rotation:(Math.random()-.5)*.3,speed:fall.minSpeed+Math.random()*(fall.maxSpeed-fall.minSpeed),phase:Math.random()*6};
  }
  updateFalling(seconds) {
    for(const ball of this.balls) {
      if(ball===this.drag || ball.returning) continue;
      ball.y+=ball.speed*seconds;
      // Falling alone never awards points; only a deliberate drop feeds Bob.
      if(ball.y-ball.radius>this.height) Object.assign(ball,this.newBall(true));
    }
  }
  tick(now) { if(this.state!==STATES.PLAYING)return false; this.remaining=Math.max(0,Math.ceil((this.deadline-now)/1000)); if(now>=this.deadline){this.finish();return false;} return true; }
  pick(p, pointerType = 'mouse') {
    if(!this.tick(performance.now()) || this.drag)return false;
    const padding = pointerType === 'touch' ? 15 : 8;
    const ball=[...this.balls].reverse().filter(b=>Math.hypot(b.x-p.x,b.y-p.y)<=b.radius+padding).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
    if(!ball)return false;
    ball.returning=null; ball.origin={x:ball.x,y:ball.y}; this.drag=ball; return true;
  }
  move(p){if(this.drag && this.tick(performance.now())){this.drag.x=clamp(p.x,0,this.width);this.drag.y=clamp(p.y,0,this.height);}}
  drop(cancelled=false) {
    const ball=this.drag;if(!ball)return;this.drag=null;
    if(this.state!==STATES.PLAYING)return;
    if(!this.tick(performance.now()))return;
    const h=this.hitbox();
    if(!cancelled && ball.x>=h.x && ball.x<=h.x+h.w && ball.y>=h.y && ball.y<=h.y+h.h){
      this.score+=ball.item.points;this.collected++;this.scaleFrom=this.visualScale(performance.now());this.growthAt=performance.now();
      this.scale=Math.min(CONFIG.bob.maxScale,CONFIG.bob.initialScale*[...CONFIG.bob.levels].reverse().find(([n])=>this.collected>=n)[1]);
      this.bounce=performance.now();this.effects.push({x:ball.x,y:ball.y,start:this.bounce,points:ball.item.points});
      this.balls.splice(this.balls.indexOf(ball),1);this.balls.push(this.newBall(true));this.onUpdate(this);
    } else ball.returning={from:{x:ball.x,y:ball.y},to:ball.origin,start:performance.now()};
  }
  finish() {
    if(this.state!==STATES.PLAYING)return;
    this.state=STATES.GAME_OVER;this.remaining=0;this.input?.cancel();this.drag=null;cancelAnimationFrame(this.frame);clearTimeout(this.endTimer);this.onUpdate(this);this.onEnd({name:this.name,score:this.score,collected:this.collected});
  }
  loop(now){if(!this.tick(now))return;this.updateFalling(Math.min((now-this.lastFrame)/1000,.05));this.lastFrame=now;this.onUpdate(this);this.draw(now);this.frame=requestAnimationFrame(t=>this.loop(t));}
  draw(now) {
    const c=this.ctx,w=this.width,h=this.height;c.clearRect(0,0,w,h);c.fillStyle='#14294d';c.fillRect(0,0,w,h);
    if(this.assets.background){const im=this.assets.background,s=Math.max(w/im.width,h/im.height);c.drawImage(im,(w-im.width*s)/2,(h-im.height*s)/2,im.width*s,im.height*s);}
    const r=this.bobRect(now);
    c.fillStyle='#07142f44';c.beginPath();c.ellipse(w/2,h-15,r.w*.39,10,0,0,Math.PI*2);c.fill();
    if(this.assets.bob)c.drawImage(this.assets.bob,r.x,r.y,r.w,r.h);else{c.fillStyle='#247edb';c.fillRect(r.x,r.y,r.w,r.h);}
    const renderBall=ball=>{
      if(ball.returning){const a=ball.returning,t=clamp((now-a.start)/CONFIG.returnDuration,0,1),ease=1-(1-t)**3;ball.x=a.from.x+(a.to.x-a.from.x)*ease;ball.y=a.from.y+(a.to.y-a.from.y)*ease;if(t===1)ball.returning=null;}
      c.save();c.translate(ball.x,ball.y);c.rotate(ball.rotation);const size=ball.radius*(ball===this.drag?1.2:1);c.shadowColor='#07142f50';c.shadowBlur=ball===this.drag?16:4;c.shadowOffsetY=ball===this.drag?9:4;
      const im=this.assets[ball.item.asset];
      if(im){const s=size*2/Math.max(im.width,im.height);c.drawImage(im,-im.width*s/2,-im.height*s/2,im.width*s,im.height*s);}else{c.fillStyle='#fff';c.beginPath();c.arc(0,0,size,0,Math.PI*2);c.fill();}c.restore();
    };
    this.balls.filter(b=>b!==this.drag).forEach(renderBall);if(this.drag)renderBall(this.drag);
    this.effects=this.effects.filter(e=>now-e.start<700);this.effects.forEach(e=>{const t=(now-e.start)/700;c.save();c.globalAlpha=1-t;c.fillStyle='#ffffff';c.shadowColor='#10244b';c.shadowBlur=5;c.font='bold 26px Arial';c.textAlign='center';c.fillText(`+${e.points}`,e.x,e.y-25-t*55);c.restore();});
  }
}

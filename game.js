(() => {
  "use strict";
  const W = 320, H = 180, FLOOR = 145;
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const overlay = document.getElementById("overlay");
  const title = document.getElementById("overlay-title");
  const hint = document.getElementById("overlay-hint");
  const jumpBtn = document.getElementById("jump-btn");
  const dashBtn = document.getElementById("dash-btn");
  const STEP = 1000 / 60;
  let player, obstacles, particles, distance, state, frame, speed, dashTimer, dashReady, last, acc;
  const course = [
    [210,0,0],[300,0,3],[390,0,1],[485,0,0],[555,0,0],
    [650,0,2],[745,0,3],[820,0,0],[910,0,1],[1005,0,3],
    [1090,0,2],[1190,0,0],[1270,0,3],[1360,0,1],[1460,0,3],
    [1545,0,2],[1650,0,0],[1740,0,1],[1840,0,3],[1940,0,2],
    [2050,0,0],[2140,0,1],[2240,0,0],[2340,0,2],[2450,0,0]
  ];
  function reset() {
    player = {x:68,y:FLOOR-14,vy:0,w:13,h:14,grounded:true,rot:0};
    obstacles = course.map(([x,,type])=>({x,type,passed:false}));
    particles=[]; distance=0; frame=0; speed=1.65; dashTimer=0; dashReady=true;
    state="ready"; scoreEl.textContent="0";
    title.textContent="PIXEL DASH"; hint.textContent="Тапни, чтобы начать и прыгать";
    overlay.classList.remove("is-hidden");
  }
  function start() { if(state==="ready"){state="playing";overlay.classList.add("is-hidden");} }
  function jump() {
    if(state==="gameover"){reset();start();return;}
    start();
    if(state!=="playing")return;
    if(player.grounded){player.vy=-4.15;player.grounded=false;}
  }
  function dash() {
    if(state==="gameover"){reset();start();return;}
    start();
    if(state!=="playing"||!dashReady)return;
    dashTimer=13;dashReady=false;player.vy=Math.min(player.vy,-0.35);
    for(let i=0;i<7;i++)particles.push({x:player.x,y:player.y+8,vx:-Math.random()*2-1,life:12});
  }
  function update() {
    frame++;
    if(state!=="playing")return;
    const moveSpeed=speed+(dashTimer>0?2.2:0);\n    distance+=moveSpeed; speed=Math.min(2.45,1.65+distance/9000);
    if(dashTimer>0){dashTimer--;player.vy+=0.025;} else player.vy+=0.19;
    player.y+=player.vy;
    const overGap=obstacles.some(o=>o.type===3&&player.x+player.w>o.x&&player.x<o.x+o.width);
    if(player.y+player.h>=FLOOR&&!overGap){player.y=FLOOR-player.h;player.vy=0;player.grounded=true;dashReady=true;}
    else player.grounded=false;
    if(player.grounded)player.rot=0;else player.rot+=0.09;
    for(const o of obstacles)o.x-=moveSpeed;
    obstacles=obstacles.filter(o=>o.x>-40);
    const far=obstacles[obstacles.length-1]?.x||0;
    if(far< W+420) {
      const x=Math.max(W+80,far+85+Math.random()*45);
      const type=Math.random()<0.28?2:(Math.random()<0.48?1:0);
      obstacles.push({x,type,passed:false});
    }
    for(const p of particles){p.x+=p.vx;p.life--;}
    particles=particles.filter(p=>p.life>0);
    const px=player.x+2, py=player.y+2, pw=player.w-4, ph=player.h-4;
    for(const o of obstacles){
      const ow=o.type===3?(o.width||42):o.type===2?23:15, oh=o.type===2?22:o.type===1?27:0;
      if(!oh)continue;
      const ox=o.x, oy=FLOOR-oh;
      if(px<ox+ow&&px+pw>ox&&py<oy+oh&&py+ph>oy){gameOver();break;}
    }
    if(player.y>H+20)gameOver();
    scoreEl.textContent=String(Math.floor(distance/10));
  }
  function gameOver(){
    state="gameover";title.textContent="CRASH!";
    hint.textContent="Дистанция: "+Math.floor(distance/10)+" — тапни, чтобы снова";
    overlay.classList.remove("is-hidden");
  }
  function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
  function background(){
    rect(0,0,W,H,"#17243d");
    for(let i=0;i<24;i++){
      const x=(i*47-frame*0.22%(W+47)+W+47)%(W+47);
      rect(x,25+(i%4)*23,2,2,"#52617d");
    }
    rect(0,FLOOR+3,W,H-FLOOR-3,"#111a2c");
    rect(0,FLOOR+3,W,2,"#7ce0c3");
    for(let x=-(frame*speed%16);x<W;x+=16)rect(x,FLOOR+12,8,2,"#293957");
  }
  function drawPlatforms(){
    let start=0;
    for(const o of obstacles){
      const x=Math.round(o.x);
      if(x>start)rect(start,FLOOR,x-start,5,"#4bba91");
      if(o.type===1){rect(x,FLOOR-13,15,13,"#f3b84b");rect(x+3,FLOOR-10,4,3,"#ffe39a");}
      if(o.type===2){rect(x,FLOOR-22,23,22,"#e87968");rect(x+4,FLOOR-18,5,5,"#ffb18d");}
      start=x+(o.type===2?23:o.type===1?15:0);
    }
    if(start<W)rect(start,FLOOR,W-start,5,"#4bba91");
    rect(0,FLOOR+5,W,2,"#263957");
  }
  function drawCat(){
    const x=Math.round(player.x),y=Math.round(player.y);
    ctx.save();ctx.translate(x+7,y+7);ctx.rotate(player.rot);
    rect(-6,-5,4,5,"#f3c66a");rect(2,-5,4,5,"#f3c66a");
    rect(-7,-2,14,10,"#f3c66a");rect(-4,5,9,3,"#f3c66a");
    rect(-4,0,2,2,"#26334c");rect(3,0,2,2,"#26334c");
    rect(-1,3,2,1,"#d97872");
    ctx.restore();
    if(dashTimer>0){rect(x-8,y+5,7,2,"#7ce0c3");rect(x-13,y+9,8,2,"#7ce0c3");}
  }
  function draw(){
    background();drawPlatforms();
    for(const p of particles)rect(p.x,p.y,2,2,"#7ce0c3");
    drawCat();
    if(state==="playing"&&!dashReady){rect(8,9,34,3,"#34425f");rect(8,9,34*(1-dashTimer/13),3,"#7ce0c3");}
  }
  function loop(t){
    if(!last)last=t;acc+=Math.min(t-last,100);last=t;
    while(acc>=STEP){update();acc-=STEP;}
    draw();requestAnimationFrame(loop);
  }
  canvas.addEventListener("pointerdown",jump);
  jumpBtn.addEventListener("pointerdown",e=>{e.preventDefault();jump();});
  dashBtn.addEventListener("pointerdown",e=>{e.preventDefault();dash();});
  window.addEventListener("keydown",e=>{
    if(["Space","ArrowUp","KeyW"].includes(e.code)){e.preventDefault();if(!e.repeat)jump();}
    if(["ShiftLeft","ShiftRight","ArrowLeft","KeyX"].includes(e.code)){e.preventDefault();if(!e.repeat)dash();}
  });
  reset();requestAnimationFrame(loop);
})();
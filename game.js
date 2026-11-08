(() => {
  "use strict";
  const W=320,H=180,FLOOR=145,STEP=1000/60;
  const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
  const scoreEl=document.getElementById("score"),overlay=document.getElementById("overlay");
  const title=document.getElementById("overlay-title"),hint=document.getElementById("overlay-hint");
  const jumpBtn=document.getElementById("jump-btn"),dashBtn=document.getElementById("dash-btn");
  let player,obstacles,particles,distance,state,frame,speed,dashTimer,dashReady,last=0,acc=0;
  const initial=[
    [210,0],[300,3],[390,1],[485,0],[555,0],[650,2],[745,3],[820,0],
    [910,1],[1005,3],[1090,2],[1190,0],[1270,3],[1360,1],[1460,3],
    [1545,2],[1650,0],[1740,1],[1840,3],[1940,2],[2050,0],[2140,1],
    [2240,0],[2340,2],[2450,0]
  ];
  function reset(){
    player={x:68,y:FLOOR-14,vy:0,w:13,h:14,grounded:true,rot:0};
    obstacles=initial.map(([x,type])=>({x,type,width:type===3?48:0}));
    particles=[];distance=0;frame=0;speed=1.65;dashTimer=0;dashReady=true;
    last=0;acc=0;state="ready";scoreEl.textContent="0";
    title.textContent="PIXEL DASH";hint.textContent="НАЖМИ JUMP ИЛИ НА ИГРОВОЕ ПОЛЕ";
    overlay.classList.remove("is-hidden");
  }
  function start(){
    if(state==="ready"){state="playing";overlay.classList.add("is-hidden");}
  }
  function jump(){
    if(state==="gameover"){reset();}
    start();
    if(player.grounded){player.vy=-4.3;player.grounded=false;}
  }
  function dash(){
    if(state==="gameover")reset();
    start();
    if(state!=="playing"||!dashReady)return;
    dashTimer=15;dashReady=false;player.vy=Math.min(player.vy,-0.55);
    for(let i=0;i<8;i++)particles.push({x:player.x,y:player.y+8,vx:-1-Math.random()*2,life:14});
  }
  function update(){
    frame++;if(state!=="playing")return;
    const moveSpeed=speed+(dashTimer>0?2.4:0);
    distance+=moveSpeed;speed=Math.min(2.45,1.65+distance/9000);
    if(dashTimer>0){dashTimer--;player.vy+=0.035;}else player.vy+=0.2;
    player.y+=player.vy;
    const overGap=obstacles.some(o=>o.type===3&&player.x+player.w>o.x&&player.x<o.x+o.width);
    if(player.y+player.h>=FLOOR&&!overGap){
      player.y=FLOOR-player.h;player.vy=0;player.grounded=true;dashReady=true;
    }else player.grounded=false;
    player.rot=player.grounded?0:player.rot+0.1;
    for(const o of obstacles)o.x-=moveSpeed;
    obstacles=obstacles.filter(o=>o.x+(o.width||24)>-30);
    const far=obstacles.length?obstacles[obstacles.length-1].x:0;
    if(far<W+400){
      const x=Math.max(W+90,far+95+Math.random()*40),r=Math.random();
      const type=r<0.2?3:r<0.47?2:r<0.78?1:0;
      obstacles.push({x,type,width:type===3?42+Math.random()*12:0});
    }
    particles.forEach(p=>{p.x+=p.vx;p.life--;});particles=particles.filter(p=>p.life>0);
    const px=player.x+2,py=player.y+2,pw=player.w-4,ph=player.h-4;
    for(const o of obstacles){
      if(o.type===3)continue;
      const ow=o.type===2?23:o.type===1?15:0,oh=o.type===2?22:o.type===1?13:0;
      if(oh&&px<o.x+ow&&px+pw>o.x&&py<FLOOR&&py+ph>FLOOR-oh){gameOver();break;}
    }
    if(player.y>H+18)gameOver();
    scoreEl.textContent=String(Math.floor(distance/10));
  }
  function gameOver(){
    state="gameover";title.textContent="CRASH!";hint.textContent="СЧЁТ: "+Math.floor(distance/10)+" · НАЖМИ JUMP, ЧТОБЫ ЕЩЁ РАЗ";
    overlay.classList.remove("is-hidden");
  }
  function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),h);}
  function background(){
    rect(0,0,W,H,"#17243d");
    for(let i=0;i<24;i++){const x=(i*47-frame*.22%(W+47)+W+47)%(W+47);rect(x,25+(i%4)*23,2,2,"#52617d");}
    rect(0,FLOOR+5,W,H-FLOOR-5,"#111a2c");
    for(let x=-(frame*speed%16);x<W;x+=16)rect(x,FLOOR+13,8,2,"#293957");
  }
  function drawPlatforms(){
    const gaps=obstacles.filter(o=>o.type===3).map(o=>[Math.round(o.x),Math.round(o.x+o.width)]);
    let cursor=0;
    for(const [a,b] of gaps){if(a>cursor)rect(cursor,FLOOR,a-cursor,5,"#4bba91");cursor=Math.max(cursor,b);}
    if(cursor<W)rect(cursor,FLOOR,W-cursor,5,"#4bba91");
    for(const o of obstacles){
      const x=Math.round(o.x);
      if(o.type===1){rect(x,FLOOR-13,15,13,"#f3b84b");rect(x+3,FLOOR-10,4,3,"#ffe39a");}
      if(o.type===2){rect(x,FLOOR-22,23,22,"#e87968");rect(x+4,FLOOR-18,5,5,"#ffb18d");}
      if(o.type===3){rect(x,FLOOR+1,o.width,3,"#e87968");}
    }
    rect(0,FLOOR+5,W,2,"#263957");
  }
  function drawCat(){
    const x=Math.round(player.x),y=Math.round(player.y);
    ctx.save();ctx.translate(x+7,y+7);ctx.rotate(player.rot);
    rect(-6,-5,4,5,"#f3c66a");rect(2,-5,4,5,"#f3c66a");
    rect(-7,-2,14,10,"#f3c66a");rect(-4,5,9,3,"#f3c66a");
    rect(-4,0,2,2,"#26334c");rect(3,0,2,2,"#26334c");rect(-1,3,2,1,"#d97872");
    ctx.restore();
    if(dashTimer>0){rect(x-8,y+5,7,2,"#7ce0c3");rect(x-14,y+9,9,2,"#7ce0c3");}
  }
  function draw(){
    background();drawPlatforms();particles.forEach(p=>rect(p.x,p.y,2,2,"#7ce0c3"));drawCat();
    if(state==="playing"&&!dashReady){rect(8,9,34,3,"#34425f");rect(8,9,34*(1-dashTimer/15),3,"#7ce0c3");}
  }
  function loop(t){
    if(!last)last=t;acc+=Math.min(t-last,100);last=t;
    while(acc>=STEP){update();acc-=STEP;}
    draw();requestAnimationFrame(loop);
  }
  canvas.addEventListener("pointerdown",e=>{if(e.pointerType!=="mouse")e.preventDefault();jump();});
  overlay.addEventListener("pointerdown",e=>{e.preventDefault();jump();});
  jumpBtn.addEventListener("pointerdown",e=>{e.preventDefault();jump();});
  dashBtn.addEventListener("pointerdown",e=>{e.preventDefault();dash();});
  window.addEventListener("keydown",e=>{
    if(["Space","ArrowUp","KeyW"].includes(e.code)){e.preventDefault();if(!e.repeat)jump();}
    if(["ShiftLeft","ShiftRight","ArrowLeft","KeyX"].includes(e.code)){e.preventDefault();if(!e.repeat)dash();}
  });
  reset();requestAnimationFrame(loop);
})();
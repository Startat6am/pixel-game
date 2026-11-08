(() => {
  "use strict";
  const W=320,H=180,FLOOR=145,STEP=1000/60;
  const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
  const scoreEl=document.getElementById("score"),overlay=document.getElementById("overlay");
  const title=document.getElementById("overlay-title"),hint=document.getElementById("overlay-hint");
  const jumpBtn=document.getElementById("jump-btn"),dashBtn=document.getElementById("dash-btn");
  const playBtn=document.getElementById("play-mode"),trainingBtn=document.getElementById("training-mode");
  const demoBtn=document.getElementById("coyote-demo-btn"),demoBackBtn=document.getElementById("demo-back-btn");
  const modeChoices=document.getElementById("mode-choices"),demoContent=document.getElementById("demo-content"),demoExitBtn=document.getElementById("demo-exit-btn");
  const metricsEl=document.getElementById("jump-metrics");
  let player,obstacles,particles,distance,state,frame,speed,dashTimer,dashReady,last=0,acc=0;
  let jumpHeld=false,mode="game",jumpStats=null,lastStats=null,jumpAge=0,jumpPower=4.7,coyoteTimer=0,demoRunning=false,demoJumped=false,demoAge=0;
  const COYOTE_FRAMES=7;
  const initial=[
    [210,0],[300,3],[390,1],[485,0],[555,0],[650,2],[745,3],[820,0],
    [910,1],[1005,3],[1090,2],[1190,0],[1270,3],[1360,1],[1460,3],
    [1545,2],[1650,0],[1740,1],[1840,3],[1940,2],[2050,0],[2140,1],
    [2240,0],[2340,2],[2450,0]
  ];
  function reset(nextMode=mode){
    mode=nextMode;demoRunning=false;demoJumped=false;demoAge=0;dashBtn.hidden=false;dashBtn.style.display="flex";
    player={x:68,y:FLOOR-14,vy:0,w:13,h:14,grounded:true,rot:0};
    obstacles=mode==="game"?initial.map(([x,type])=>({x,type,width:type===3?48:0})):[];
    particles=[];distance=0;frame=0;speed=1.65;dashTimer=0;dashReady=true;jumpHeld=false;jumpStats=null;lastStats=null;jumpAge=0;jumpPower=4.7;coyoteTimer=0;
    last=0;acc=0;state="ready";scoreEl.textContent="0";
    title.textContent="PIXEL DASH";hint.textContent="ВЫБЕРИ РЕЖИМ ИГРЫ";
    overlay.classList.remove("is-hidden");updateMetrics();
  }
  function start(){
    if(state==="ready"){state="playing";overlay.classList.add("is-hidden");}
  }
  function chooseMode(nextMode){demoContent.classList.add("is-hidden");modeChoices.classList.remove("is-hidden");reset(nextMode);start();}
  function showCoyoteDemo(){
    demoExitBtn.classList.remove("is-hidden");demoContent.classList.add("is-hidden");modeChoices.classList.add("is-hidden");
    reset("game");demoRunning=true;demoJumped=false;demoAge=0;
    state="playing";overlay.classList.add("is-hidden");
    title.textContent="COYOTE JUMP";hint.textContent="КОТИК ПЕРЕПРЫГИВАЕТ ПЕРВУЮ ЯМУ";
  }
  function finishCoyoteDemo(){
    if(!demoRunning)return;
    demoExitBtn.classList.add("is-hidden");
    demoRunning=false;state="demofinished";
    title.textContent="COYOTE JUMP";hint.textContent="ГОТОВО! КОТИК ПРЫГНУЛ ПОСЛЕ КРАЯ ПЛАТФОРМЫ";
    demoContent.classList.remove("is-hidden");modeChoices.classList.add("is-hidden");
    overlay.classList.remove("is-hidden");
    const lead=demoContent.querySelector(".demo-lead");
    if(lead)lead.textContent="ПРЫЖОК ПОСЛЕ КРАЯ — COYOTE TIME";
  }
  function hideCoyoteDemo(){
    demoRunning=false;demoExitBtn.classList.add("is-hidden");demoContent.classList.add("is-hidden");modeChoices.classList.remove("is-hidden");
    title.textContent="PIXEL DASH";hint.textContent="ВЫБЕРИ РЕЖИМ ИГРЫ";
  }
  function jump(){
    if(state==="gameover"){reset(mode);start();}
    start();
    if((player.grounded||coyoteTimer>0)&&state==="playing"){
      const coyoteJump=!player.grounded&&coyoteTimer>0;
      if(coyoteJump){
        // A compact ground-impact puff: dust kicks sideways from both feet.
        for(let i=0;i<10;i++){
          const side=i%2===0?-1:1;
          particles.push({
            x:player.x+6+(Math.random()-.5)*5,
            y:FLOOR-2-Math.random()*2,
            vx:side*(0.65+Math.random()*1.45),
            vy:-0.25-Math.random()*0.85,
            life:8+Math.floor(Math.random()*6),
            dust:true,
            size:2+Math.floor(Math.random()*3)
          });
        }
      }
      coyoteTimer=0;player.vy=-4.7;player.grounded=false;player.jumpCut=false;jumpAge=0;jumpPower=4.7;
      jumpStats={startY:player.y,peak:0,startDistance:distance};lastStats=null;updateMetrics();
    }
  }
  function releaseJump(){
    jumpHeld=false;
    if(player&&!player.grounded&&player.vy<0&&!player.jumpCut){player.vy=Math.max(player.vy,-1.9);player.jumpCut=true;}
  }
  function updateMetrics(){
    if(mode!=="training"){metricsEl.classList.add("is-hidden");return;}
    metricsEl.classList.remove("is-hidden");
    const stats=jumpStats||lastStats,shownSpeed=speed+(dashTimer>0?2.4:0);
    if(!stats){metricsEl.textContent="ВЫСОТА — px   ·   ДЛИНА — px\nСКОРОСТЬ "+shownSpeed.toFixed(2)+" px/кадр";return;}
    metricsEl.textContent="ВЫСОТА "+Math.round(stats.peak)+" px   ·   ДЛИНА "+Math.round(stats.length??(distance-stats.startDistance))+" px\nСКОРОСТЬ "+shownSpeed.toFixed(2)+" px/кадр";
  }
  function dash(){
    if(state==="gameover")reset(mode);
    start();
    if(state!=="playing"||!dashReady)return;
    const airborne=!player.grounded;
    const comboWindow=24;
    const combo=airborne&&jumpAge<=comboWindow?1-jumpAge/comboWindow:0;
    jumpHeld=false;player.jumpCut=true;
    dashTimer=15;dashReady=false;
    if(combo>0){
      const angleFactor=Math.min(1,jumpPower/4.7);
      const boost=(0.15+0.25*angleFactor)*combo;
      player.vy=Math.min(player.vy-boost,-1.2);
    }else{
      player.vy=Math.min(player.vy,-0.55);
    }
    updateMetrics();
    for(let i=0;i<8;i++)particles.push({x:player.x,y:player.y+8,vx:-1-Math.random()*2,life:14});
  }
  function update(){
    frame++;if(state!=="playing")return;
    if(!player.grounded){jumpAge++;if(coyoteTimer>0)coyoteTimer--;}else{jumpAge=0;coyoteTimer=COYOTE_FRAMES;}
    if(demoRunning&&!demoJumped&&!player.grounded&&coyoteTimer>0&&coyoteTimer<=5){
      demoJumped=true;
      jump();
    }
    const moveSpeed=speed+(dashTimer>0?2.4:0);
    distance+=moveSpeed;
    if(dashTimer>0){dashTimer--;player.vy+=0.035;}else player.vy+=0.24;
    player.y+=player.vy;
    if(mode==="training")updateMetrics();
    if(jumpStats){jumpStats.peak=Math.max(jumpStats.peak,jumpStats.startY-player.y);updateMetrics();}
    const overGap=mode==="game"&&obstacles.some(o=>o.type===3&&player.x+player.w>o.x&&player.x<o.x+o.width);
    if(player.y+player.h>=FLOOR&&!overGap){
      player.y=FLOOR-player.h;player.vy=0;player.grounded=true;dashReady=true;coyoteTimer=COYOTE_FRAMES;
      if(jumpStats){lastStats={peak:jumpStats.peak,length:distance-jumpStats.startDistance};jumpStats=null;updateMetrics();}if(demoRunning&&demoJumped){demoAge++;if(demoAge>2)finishCoyoteDemo();}
    }else player.grounded=false;
    player.rot=player.grounded?0:player.rot+0.1;
    if(mode==="game")for(const o of obstacles)o.x-=moveSpeed;
    if(mode==="game")obstacles=obstacles.filter(o=>o.x+(o.width||24)>-30);
    const far=obstacles.length?obstacles[obstacles.length-1].x:0;
    if(mode==="game"&&far<W+400){
      const x=Math.max(W+90,far+95+Math.random()*40),r=Math.random();
      const type=r<0.2?3:r<0.47?2:r<0.78?1:0;
      obstacles.push({x,type,width:type===3?42+Math.random()*12:0});
    }
    particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy||0;if(p.dust){p.vx*=0.88;p.vy+=0.07;}p.life--;});particles=particles.filter(p=>p.life>0);
    const px=player.x+2,py=player.y+2,pw=player.w-4,ph=player.h-4;
    if(mode==="game")for(const o of obstacles){
      if(o.type===3)continue;
      const ow=o.type===2?23:o.type===1?15:0,oh=o.type===2?22:o.type===1?13:0;
      if(oh&&px<o.x+ow&&px+pw>o.x&&py<FLOOR&&py+ph>FLOOR-oh){gameOver();break;}
    }
    if(mode==="game"&&player.y>H+18)gameOver();
    scoreEl.textContent=String(Math.floor(distance/10));
  }
  function gameOver(){
    if(demoRunning){finishCoyoteDemo();return;}
    state="gameover";title.textContent="CRASH!";hint.textContent="СЧЁТ: "+Math.floor(distance/10)+" · ВЫБЕРИ РЕЖИМ ДЛЯ НОВОГО ЗАБЕГА";
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
    if(mode==="training"){rect(0,FLOOR,W,5,"#4bba91");rect(0,FLOOR+5,W,2,"#263957");return;}
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
    background();drawPlatforms();
    particles.forEach(p=>{
      if(p.dust){
        const alpha=Math.max(0.18,p.life/14);
        ctx.globalAlpha=alpha;
        rect(p.x,p.y,p.size,2,"#c5d2c8");
        if(p.size>3)rect(p.x+1,p.y+2,2,1,"#829d91");
        ctx.globalAlpha=1;
      }else rect(p.x,p.y,2,2,"#7ce0c3");
    });
    drawCat();
    if(state==="playing"&&!dashReady&&mode==="game"){rect(8,9,34,3,"#34425f");rect(8,9,34*(1-dashTimer/15),3,"#7ce0c3");}
  }
  function loop(t){
    if(!last)last=t;acc+=Math.min(t-last,100);last=t;
    while(acc>=STEP){update();acc-=STEP;}
    draw();requestAnimationFrame(loop);
  }
  canvas.addEventListener("pointerdown",e=>{if(state==="playing"){e.preventDefault();jumpHeld=true;jump();}});
  jumpBtn.addEventListener("pointerdown",e=>{e.preventDefault();jumpHeld=true;jump();});
  window.addEventListener("pointerup",releaseJump);
  window.addEventListener("pointercancel",releaseJump);
  window.addEventListener("blur",releaseJump);
  dashBtn.addEventListener("pointerdown",e=>{e.preventDefault();dash();});
  window.addEventListener("keydown",e=>{
    if(["Space","ArrowUp","KeyW"].includes(e.code)){e.preventDefault();if(!e.repeat){jumpHeld=true;jump();}}
    if(["ShiftLeft","ShiftRight","ArrowLeft","KeyX"].includes(e.code)){e.preventDefault();if(!e.repeat)dash();}
  });
  window.addEventListener("keyup",e=>{if(["Space","ArrowUp","KeyW"].includes(e.code))releaseJump();});
  demoBtn.addEventListener("click",showCoyoteDemo);
  demoBackBtn.addEventListener("click",hideCoyoteDemo);
  demoExitBtn.addEventListener("click",()=>{demoRunning=false;demoExitBtn.classList.add("is-hidden");demoContent.classList.add("is-hidden");modeChoices.classList.remove("is-hidden");title.textContent="PIXEL DASH";hint.textContent="ВЫБЕРИ РЕЖИМ ИГРЫ";overlay.classList.remove("is-hidden");state="ready";});
  playBtn.addEventListener("click",()=>chooseMode("game"));
  trainingBtn.addEventListener("click",()=>chooseMode("training"));
  reset("game");requestAnimationFrame(loop);
})();
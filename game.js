(() => {
  "use strict";
  const W=320,H=180,FLOOR=145,STEP=1000/60;
  const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
  const scoreEl=document.getElementById("score"),overlay=document.getElementById("overlay");
  const title=document.getElementById("overlay-title"),hint=document.getElementById("overlay-hint");
  const jumpBtn=document.getElementById("jump-btn"),dashBtn=document.getElementById("dash-btn");
  const playBtn=document.getElementById("play-mode"),trainingBtn=document.getElementById("training-mode");
  const characterToggle=document.getElementById("character-toggle"),characterChoices=document.getElementById("character-choices");
  const menuScreen=document.getElementById("menu-screen"),characterScreen=document.getElementById("character-screen");
  const backMenu=document.getElementById("back-menu");
  const characterButtons=[...document.querySelectorAll("[data-character]")];
  let selectedCharacter="classic";
    const metricsEl=document.getElementById("jump-metrics");
  let player,obstacles,platforms,candies,particles,distance,state,frame,speed,dashTimer,dashReady,dashCharges,last=0,acc=0;
  let jumpHeld=false,jumpHoldFrames=0,mode="game",jumpStats=null,lastStats=null,jumpAge=0,jumpPower=4.7,coyoteTimer=0;
  let candyCount=0,specialUnlocked=false,specialFlash=0,specialLabelTimer=0,shieldCharges=0;
  const COYOTE_FRAMES=7;
  const initialPlatforms=[[235,126,76],[329,114,76],[423,124,76],[517,112,76],[611,126,76],[705,114,76],[799,124,76]];
  const initial=[
    [210,0],[300,3],[390,1],[485,0],[555,0],[650,2],[745,3],[820,0],
    [910,1],[1005,3],[1090,2],[1190,0],[1270,3],[1360,1],[1460,3],
    [1545,2],[1650,0],[1740,1],[1840,3],[1940,2],[2050,0],[2140,1],
    [2240,0],[2340,2],[2450,0]
  ];
  function reset(nextMode=mode){
    mode=nextMode;showMenu();dashBtn.hidden=false;dashBtn.style.display="flex";
    player={x:68,y:FLOOR-14,vy:0,w:13,h:14,grounded:true,rot:0,extraJumpAvailable:false,shieldTimer:0};
    obstacles=mode==="game"?initial.map(([x,type])=>({x,type,width:type===3?48:0})):[];
    platforms=mode==="game"?initialPlatforms.map(([x,y,width])=>({x,y,width,height:6})):[];
    candies=platforms.map((p,i)=>({x:p.x+p.width/2,y:p.y-10,phase:i*1.7}));
    particles=[];distance=0;frame=0;speed=1.65;dashTimer=0;dashCharges=1;dashReady=true;candyCount=0;specialUnlocked=false;specialFlash=0;specialLabelTimer=0;shieldCharges=0;jumpHeld=false;jumpHoldFrames=0;jumpStats=null;lastStats=null;jumpAge=0;jumpPower=4.7;coyoteTimer=0;
    last=0;acc=0;state="ready";scoreEl.textContent="0";
    title.textContent="PIXEL DASH";hint.textContent="ВЫБЕРИ РЕЖИМ ИГРЫ";
    overlay.classList.remove("is-hidden");updateMetrics();
  }
  function start(){
    if(state==="ready"){state="playing";overlay.classList.add("is-hidden");}
  }
  function chooseMode(nextMode){reset(nextMode);start();}
  function showMenu(){
    menuScreen.classList.remove("is-hidden");
    characterScreen.classList.add("is-hidden");
  }
  function showCharacters(){
    menuScreen.classList.add("is-hidden");
    characterScreen.classList.remove("is-hidden");
  }
  function chooseCharacter(name){
    selectedCharacter=name;
    characterButtons.forEach(button=>button.classList.toggle("is-selected",button.dataset.character===name));
  }
  function jump(){
    if(state==="gameover"){reset(mode);start();}
    start();
    if(state==="playing"&&!player.grounded&&selectedCharacter==="violet"&&specialUnlocked&&player.extraJumpAvailable){
      player.vy=-4.5;player.jumpCut=false;player.extraJumpAvailable=false;player.rot=0;
      jumpHeld=true;jumpHoldFrames=0;jumpAge=0;jumpPower=4.5;
      jumpStats={startY:player.y,peak:0,startDistance:distance};lastStats=null;
      for(let i=0;i<9;i++)particles.push({x:player.x+6,y:player.y+10,vx:(Math.random()-.5)*2,vy:-Math.random()*1.5,life:18,special:true});
      return;
    }
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
      coyoteTimer=0;player.vy=-4.7;player.grounded=false;player.jumpCut=false;jumpHoldFrames=0;jumpAge=0;jumpPower=4.7;
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
    if(state!=="playing"||dashCharges<=0)return;
    const airborne=!player.grounded;
    const comboWindow=24;
    const combo=airborne&&jumpAge<=comboWindow?1-jumpAge/comboWindow:0;
    jumpHeld=false;player.jumpCut=true;
    dashTimer=15;dashCharges--;dashReady=dashCharges>0;
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
    const previousBottom=player.y+player.h;
    if(specialFlash>0)specialFlash--;if(specialLabelTimer>0)specialLabelTimer--;if(player.shieldTimer>0)player.shieldTimer--;
    const moveSpeed=speed+(dashTimer>0?2.4:0);
    distance+=moveSpeed;
    if(dashTimer>0){dashTimer--;player.vy+=0.035;}else if(jumpHeld&&!player.jumpCut&&player.vy<0&&jumpHoldFrames<12){player.vy+=0.17;jumpHoldFrames++;}else player.vy+=0.24;
    player.y+=player.vy;
    if(mode==="training")updateMetrics();
    if(jumpStats){jumpStats.peak=Math.max(jumpStats.peak,jumpStats.startY-player.y);updateMetrics();}
    const overGap=mode==="game"&&obstacles.some(o=>o.type===3&&player.x+player.w>o.x&&player.x<o.x+o.width);
    let landed=false;
    if(mode==="game"&&player.vy>=0){
      for(const p of platforms){
        const overlaps=player.x+player.w>p.x&&player.x<p.x+p.width;
        if(overlaps&&previousBottom<=p.y&&player.y+player.h>=p.y){
          player.y=p.y-player.h;player.vy=0;landed=true;break;
        }
      }
    }
    if(landed|| (player.y+player.h>=FLOOR&&!overGap)){
      if(!landed)player.y=FLOOR-player.h;
      player.vy=0;player.grounded=true;dashCharges=selectedCharacter==="classic"&&specialUnlocked?2:1;dashReady=true;
      if(selectedCharacter==="violet"&&specialUnlocked)player.extraJumpAvailable=true;
      coyoteTimer=COYOTE_FRAMES;
      if(jumpStats){lastStats={peak:jumpStats.peak,length:distance-jumpStats.startDistance};jumpStats=null;updateMetrics();}
    }else player.grounded=false;
    player.rot=player.grounded?0:player.rot+0.1;
    if(mode==="game"){
      for(const o of obstacles)o.x-=moveSpeed;
      for(const p of platforms)p.x-=moveSpeed;
      for(const c of candies)c.x-=moveSpeed;
      obstacles=obstacles.filter(o=>o.x+(o.width||24)>-30);
      platforms=platforms.filter(p=>p.x+p.width>-10);
      candies=candies.filter(c=>c.x>-10);
      const far=obstacles.length?obstacles[obstacles.length-1].x:0;
      if(far<W+400){
        const x=Math.max(W+90,far+95+Math.random()*40),r=Math.random();
        const type=r<0.2?3:r<0.47?2:r<0.78?1:0;
        obstacles.push({x,type,width:type===3?42+Math.random()*12:0});
      }
      const lastPlatform=platforms.length?platforms[platforms.length-1]:null;
      const platformEdge=lastPlatform?lastPlatform.x+lastPlatform.width:0;
      if(platformEdge<W+420){
        const x=Math.max(W+100,platformEdge+18+Math.random()*18);
        const prevY=lastPlatform?lastPlatform.y:126;
        const step=[-10,0,10][Math.floor(Math.random()*3)];
        const y=Math.max(106,Math.min(130,prevY+step));
        const p={x,y,width:68+Math.random()*14,height:6};
        platforms.push(p);
        candies.push({x:p.x+p.width/2,y:p.y-10,phase:Math.random()*6});
      }
    }
    for(const c of candies){
      const bob=Math.sin(frame*.12+c.phase)*2;
      if(Math.abs((player.x+player.w/2)-c.x)<10&&Math.abs((player.y+player.h/2)-(c.y+bob))<13){
        const cx=c.x,cy=c.y;c.x=-100;candyCount++;
        for(let i=0;i<7;i++)particles.push({x:cx,y:cy,vx:(Math.random()-.5)*2,vy:-Math.random()*1.8,life:14,special:true});
        if(candyCount%10===0){
          specialUnlocked=true;specialFlash=90;specialLabelTimer=90;
          if(selectedCharacter==="classic")dashCharges=Math.max(dashCharges,2);
          if(selectedCharacter==="mint")shieldCharges++;
          if(selectedCharacter==="violet"&&player.grounded)player.extraJumpAvailable=true;
          for(let i=0;i<24;i++)particles.push({x:player.x+6,y:player.y+7,vx:(Math.random()-.5)*3,vy:(Math.random()-.5)*3,life:28,special:true});
        }
      }
    }
    particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy||0;if(p.dust){p.vx*=0.88;p.vy+=0.07;}p.life--;});particles=particles.filter(p=>p.life>0);
    const px=player.x+2,py=player.y+2,pw=player.w-4,ph=player.h-4;
    if(mode==="game")for(const o of obstacles){
      if(o.type===3)continue;
      const ow=o.type===2?23:o.type===1?15:0,oh=o.type===2?22:o.type===1?13:0;
      if(oh&&px<o.x+ow&&px+pw>o.x&&py<FLOOR&&py+ph>FLOOR-oh){
        if(selectedCharacter==="mint"&&shieldCharges>0){
          shieldCharges--;player.shieldTimer=70;
          for(let i=0;i<16;i++)particles.push({x:player.x+6,y:player.y+7,vx:(Math.random()-.5)*3,vy:(Math.random()-.5)*3,life:22,special:true});
        }else{gameOver();break;}
      }
    }
    if(mode==="game"&&player.y>H+18)gameOver();
    scoreEl.textContent=String(Math.floor(distance/10));
  }
  function gameOver(){
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
    // Elevated ledges at different heights; the bright top edge marks a landing surface.
    for(const p of platforms){
      const x=Math.round(p.x),y=Math.round(p.y);
      rect(x,y,p.width,p.height,"#385b68");
      rect(x,y,p.width,2,"#7ce0c3");
      rect(x+5,y+p.height,Math.max(0,p.width-10),2,"#203b50");
      for(let bx=x+8;bx<x+p.width-4;bx+=14)rect(bx,y+3,3,2,"#547b82");
    }
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
    const palettes={
      classic:{body:"#f3c66a",muzzle:"#ffe0a0",eyes:"#26334c",nose:"#d97872",accent:"#fff0bc"},
      mint:{body:"#7ce0c3",muzzle:"#c4ffeb",eyes:"#203d4b",nose:"#ef8eaa",accent:"#e5fff6"},
      violet:{body:"#101116",muzzle:"#292c35",eyes:"#ffffff",nose:"#aeb3c0",accent:"#444956"}
    };
    const fur=palettes[selectedCharacter]||palettes.classic;
    if(selectedCharacter==="violet"){
      // Сумрак: низкий приземистый силуэт, широкая квадратная морда и острые уши.
      rect(-8,-10,3,7,fur.body);rect(-7,-10,2,3,"#343844");
      rect(5,-10,3,7,fur.body);rect(5,-10,2,3,"#343844");
      rect(-8,-4,16,10,fur.body);rect(-7,6,14,2,fur.body);
      rect(-6,1,12,4,fur.muzzle);
      rect(-5,-2,3,3,fur.eyes);rect(3,-2,3,3,fur.eyes);
      rect(-1,3,2,1,fur.nose);rect(-6,-6,2,1,fur.accent);
      rect(-7,7,5,2,fur.body);rect(2,7,5,2,fur.body);
    }else if(selectedCharacter==="mint"){
      // Мята: мягкая округлая мордочка, одно ушко чуть наклонено и пушистая чёлка.
      rect(-7,-8,4,8,fur.body);rect(-6,-10,2,3,fur.body);
      rect(3,-7,4,7,fur.body);rect(5,-9,2,3,fur.body);
      rect(-6,-3,12,3,fur.body);rect(-7,0,14,6,fur.body);
      rect(-5,6,10,2,fur.body);rect(-4,3,8,3,fur.muzzle);
      rect(-4,-1,2,2,fur.eyes);rect(3,-1,2,2,fur.eyes);
      rect(-1,3,2,1,fur.nose);rect(-2,-5,4,2,fur.accent);
      rect(-8,2,2,3,fur.body);rect(6,2,2,3,fur.body);
    }else{
      rect(-6,-5,4,5,fur.body);rect(2,-5,4,5,fur.body);
      rect(-7,-2,14,10,fur.body);rect(-4,5,9,3,fur.muzzle);
      rect(-4,0,2,2,fur.eyes);rect(3,0,2,2,fur.eyes);rect(-1,3,2,1,fur.nose);
      rect(-5,-4,2,2,fur.accent);
    }
    ctx.restore();
    if(dashTimer>0){rect(x-8,y+5,7,2,"#7ce0c3");rect(x-14,y+9,9,2,"#7ce0c3");}
  }
  function drawCandy(){
    for(const c of candies){
      const x=Math.round(c.x),y=Math.round(c.y+Math.sin(frame*.12+c.phase)*2);
      rect(x-3,y-3,6,7,"#ff8eb5");rect(x-5,y-1,2,3,"#ffd2e1");rect(x+3,y-1,2,3,"#ffd2e1");
      rect(x-1,y-2,2,5,"#ffe58a");rect(x-2,y-4,4,2,"#fff0b5");
    }
  }
  function draw(){
    background();drawPlatforms();drawCandy();
    particles.forEach(p=>{
      if(p.dust){
        const alpha=Math.max(0.18,p.life/14);
        ctx.globalAlpha=alpha;
        rect(p.x,p.y,p.size,2,"#c5d2c8");
        if(p.size>3)rect(p.x+1,p.y+2,2,1,"#829d91");
        ctx.globalAlpha=1;
      }else rect(p.x,p.y,p.special?3:2,p.special?3:2,p.special?"#ffe58a":"#7ce0c3");
    });
    drawCat();
    if(player.shieldTimer>0){ctx.globalAlpha=.65;ctx.strokeStyle="#7ce0c3";ctx.lineWidth=2;ctx.beginPath();ctx.arc(player.x+6,player.y+7,13+Math.sin(frame*.3)*2,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
    if(specialFlash>0){ctx.globalAlpha=specialFlash/90;ctx.strokeStyle=selectedCharacter==="mint"?"#7ce0c3":selectedCharacter==="violet"?"#c5c8ff":"#ffe58a";ctx.lineWidth=2;ctx.beginPath();ctx.arc(player.x+6,player.y+7,12+(90-specialFlash)*.22,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
    if(specialLabelTimer>0){ctx.fillStyle="#fff0b5";ctx.font="bold 9px Courier New";ctx.textAlign="center";ctx.fillText(selectedCharacter==="classic"?"DOUBLE DASH":selectedCharacter==="mint"?"MINT SHIELD":"DOUBLE JUMP",160,23);}
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
  playBtn.addEventListener("click",()=>chooseMode("game"));
  trainingBtn.addEventListener("click",()=>chooseMode("training"));
  characterToggle.addEventListener("click",showCharacters);
  backMenu.addEventListener("click",showMenu);
  characterButtons.forEach(button=>button.addEventListener("click",()=>chooseCharacter(button.dataset.character)));
  reset("game");requestAnimationFrame(loop);
})();
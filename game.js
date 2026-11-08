(() => {
  "use strict";
  const WIDTH = 320, HEIGHT = 180;
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreElement = document.getElementById("score");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayHint = document.getElementById("overlay-hint");

  const CONFIG = {
    gravity: 0.14, flapPower: -2.8, scrollSpeed: 1.45,
    pipeWidth: 22, gapHeight: 62, spawnDistance: 145, groundHeight: 9
  };

  let player, pipes, score, frame, state;
  let lastTime = 0, accumulator = 0;
  const STEP = 1000 / 60;

  function reset() {
    player = { x: 68, y: 82, vy: 0, width: 16, height: 13 };
    pipes = [];
    score = 0;
    frame = 0;
    state = "ready";
    scoreElement.textContent = "0";
    overlayTitle.textContent = "Полетели?";
    overlayHint.textContent = "Кликни, тапни или нажми пробел";
    overlay.classList.remove("is-hidden");
    spawnPipe(WIDTH + 35);
  }

  function spawnPipe(x) {
    const margin = 24;
    const maxGapY = HEIGHT - CONFIG.groundHeight - CONFIG.gapHeight - margin;
    const gapY = margin + Math.random() * (maxGapY - margin);
    pipes.push({ x, gapY, passed: false });
  }

  function flap() {
    if (state === "gameover") {
      reset();
      state = "playing";
      overlay.classList.add("is-hidden");
    } else if (state === "ready") {
      state = "playing";
      overlay.classList.add("is-hidden");
    }
    if (state === "playing") player.vy = CONFIG.flapPower;
  }

  function update() {
    if (state !== "playing") return;
    frame++;
    player.vy += CONFIG.gravity;
    player.y += player.vy;

    for (const pipe of pipes) {
      pipe.x -= CONFIG.scrollSpeed;
      if (!pipe.passed && pipe.x + CONFIG.pipeWidth < player.x) {
        pipe.passed = true;
        score++;
        scoreElement.textContent = String(score);
      }
    }

    pipes = pipes.filter(pipe => pipe.x + CONFIG.pipeWidth + 5 > 0);
    const lastPipe = pipes[pipes.length - 1];
    if (!lastPipe || lastPipe.x < WIDTH - CONFIG.spawnDistance) spawnPipe(WIDTH + 8);
    checkCollisions();
  }

  function checkCollisions() {
    const hitbox = {
      x: player.x + 2, y: player.y + 2,
      width: player.width - 4, height: player.height - 4
    };
    if (hitbox.y < 0 || hitbox.y + hitbox.height > HEIGHT - CONFIG.groundHeight) {
      gameOver();
      return;
    }
    for (const pipe of pipes) {
      const overlapsX = hitbox.x < pipe.x + CONFIG.pipeWidth &&
        hitbox.x + hitbox.width > pipe.x;
      if (!overlapsX) continue;
      const gapBottom = pipe.gapY + CONFIG.gapHeight;
      if (hitbox.y < pipe.gapY || hitbox.y + hitbox.height > gapBottom) {
        gameOver();
        return;
      }
    }
  }

  function gameOver() {
    state = "gameover";
    overlayTitle.textContent = "Игра окончена";
    overlayHint.textContent = "Счёт: " + score + " — нажми, чтобы попробовать ещё раз";
    overlay.classList.remove("is-hidden");
  }

  function drawCloud(x, y) {
    x = Math.round(x);
    ctx.fillRect(x, y + 4, 22, 6);
    ctx.fillRect(x + 5, y, 11, 5);
    ctx.fillRect(x + 15, y + 2, 8, 6);
  }

  function drawBackground() {
    ctx.fillStyle = "#78c9e8";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#bceafa";
    const cloudOffset = (frame * 0.25) % (WIDTH + 55);
    drawCloud(WIDTH - cloudOffset, 28);
    drawCloud((WIDTH + 105 - cloudOffset + WIDTH + 55) % (WIDTH + 55) - 30, 62);
    drawCloud((WIDTH + 230 - cloudOffset + WIDTH + 55) % (WIDTH + 55) - 30, 112);

    ctx.fillStyle = "#69b6d0";
    for (let i = 0; i < 9; i++) {
      const x = (i * 43 - frame * 0.45 + WIDTH * 2) % WIDTH;
      const h = 12 + (i % 3) * 7;
      ctx.fillRect(x, HEIGHT - CONFIG.groundHeight - h, 13, h);
    }
  }

  function drawPipe(x, y, width, height, isTop) {
    if (height <= 0) return;
    const capHeight = 6;
    const bodyY = isTop ? y : y + capHeight;
    const bodyHeight = Math.max(0, height - capHeight);
    ctx.fillStyle = "#398c48";
    ctx.fillRect(x + 3, bodyY, width - 6, bodyHeight);
    ctx.fillStyle = "#55bd5d";
    ctx.fillRect(x + 5, bodyY, 4, bodyHeight);
    ctx.fillStyle = "#28713c";
    ctx.fillRect(x + width - 7, bodyY, 4, bodyHeight);

    const capY = isTop ? y + height - capHeight : y;
    ctx.fillStyle = "#398c48";
    ctx.fillRect(x, capY, width, capHeight);
    ctx.fillStyle = "#72d66b";
    ctx.fillRect(x + 2, capY + 1, 4, capHeight - 2);
    ctx.fillStyle = "#28713c";
    ctx.fillRect(x + width - 4, capY + 1, 2, capHeight - 2);
  }

  function drawPipes() {
    for (const pipe of pipes) {
      const x = Math.round(pipe.x);
      const gapBottom = pipe.gapY + CONFIG.gapHeight;
      drawPipe(x, 0, CONFIG.pipeWidth, pipe.gapY, true);
      drawPipe(x, gapBottom, CONFIG.pipeWidth,
        HEIGHT - CONFIG.groundHeight - gapBottom, false);
    }
  }

  function drawCat() {
    const x = Math.round(player.x), y = Math.round(player.y);
    // Абстрактная кошка из пиксельных прямоугольников — временный процедурный спрайт.
    ctx.fillStyle = "#26334c";
    ctx.fillRect(x + 2, y + 1, 3, 4);
    ctx.fillRect(x + 10, y + 1, 3, 4);
    ctx.fillRect(x + 1, y + 4, 13, 7);
    ctx.fillRect(x + 4, y + 9, 8, 3);
    ctx.fillRect(x - 2, y + 7, 4, 2);
    ctx.fillStyle = "#f2b7a5";
    ctx.fillRect(x + 3, y + 2, 1, 2);
    ctx.fillRect(x + 11, y + 2, 1, 2);
    ctx.fillStyle = "#f4e8d5";
    ctx.fillRect(x + 3, y + 5, 9, 4);
    ctx.fillStyle = "#27334a";
    ctx.fillRect(x + 5, y + 5, 1, 2);
    ctx.fillRect(x + 10, y + 5, 1, 2);
    ctx.fillRect(x + 8, y + 8, 2, 1);
    ctx.fillStyle = "#d98f83";
    ctx.fillRect(x + 7, y + 7, 2, 1);
  }

  function drawGround() {
    const groundY = HEIGHT - CONFIG.groundHeight;
    ctx.fillStyle = "#d9bd70";
    ctx.fillRect(0, groundY, WIDTH, CONFIG.groundHeight);
    ctx.fillStyle = "#9b8049";
    ctx.fillRect(0, groundY, WIDTH, 2);
    ctx.fillStyle = "#f0d88d";
    const offset = (frame * CONFIG.scrollSpeed) % 12;
    for (let x = -offset; x < WIDTH; x += 12) ctx.fillRect(x, groundY + 4, 6, 2);
  }

  function draw() {
    drawBackground();
    drawPipes();
    drawGround();
    drawCat();
  }

  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    accumulator += Math.min(timestamp - lastTime, 100);
    lastTime = timestamp;
    while (accumulator >= STEP) {
      update();
      accumulator -= STEP;
    }
    draw();
    requestAnimationFrame(loop);
  }

  function handleInput(event) {
    if (event.type === "keydown") {
      if (!["Space", "ArrowUp", "KeyW"].includes(event.code)) return;
      event.preventDefault();
      if (event.repeat) return;
    }
    flap();
  }

  canvas.addEventListener("pointerdown", handleInput);
  overlay.addEventListener("pointerdown", handleInput);
  window.addEventListener("keydown", handleInput);
  reset();
  requestAnimationFrame(loop);
})();

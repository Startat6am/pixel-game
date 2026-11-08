(() => {
  "use strict";

  // Внутреннее разрешение маленькое, CSS увеличивает его без сглаживания.
  const WIDTH = 320;
  const HEIGHT = 180;
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreElement = document.getElementById("score");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayHint = document.getElementById("overlay-hint");

  const CONFIG = {
    gravity: 0.12,
    flapPower: -2.65,
    scrollSpeed: 1.35,
    obstacleWidth: 19,
    gapHeight: 66,
    spawnDistance: 145
  };

  let player;
  let obstacles;
  let score;
  let frame;
  let state; // "ready", "playing" или "gameover"
  let lastTime = 0;
  let accumulator = 0;
  const STEP = 1000 / 60;

  function reset() {
    player = { x: 70, y: 88, vy: 0, width: 13, height: 10 };
    obstacles = [];
    score = 0;
    frame = 0;
    state = "ready";
    scoreElement.textContent = "0";
    overlayTitle.textContent = "Готов к полёту?";
    overlayHint.textContent = "Кликни, нажми пробел или тапни, чтобы начать";
    overlay.classList.remove("is-hidden");
    // Первый проём появляется справа от персонажа.
    spawnObstacle(WIDTH + 30);
  }

  function spawnObstacle(x) {
    const margin = 27;
    const gapY = margin + Math.random() * (HEIGHT - CONFIG.gapHeight - margin * 2);
    obstacles.push({
      x,
      gapY,
      gapHeight: CONFIG.gapHeight,
      passed: false
    });
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

    // Простая физика: гравитация меняет скорость, скорость — высоту.
    player.vy += CONFIG.gravity;
    player.y += player.vy;

    // Скроллим ленту препятствий справа налево.
    for (const obstacle of obstacles) {
      obstacle.x -= CONFIG.scrollSpeed;

      if (!obstacle.passed && obstacle.x + CONFIG.obstacleWidth < player.x) {
        obstacle.passed = true;
        score++;
        scoreElement.textContent = String(score);
      }
    }

    // Удаляем ушедшие за экран блоки и добавляем следующий проём.
    obstacles = obstacles.filter(o => o.x + CONFIG.obstacleWidth > -2);
    const last = obstacles[obstacles.length - 1];
    if (!last || last.x < WIDTH - CONFIG.spawnDistance) {
      spawnObstacle(WIDTH + 8);
    }

    checkCollisions();
  }

  function checkCollisions() {
    const hitbox = {
      x: player.x + 2,
      y: player.y + 1,
      width: player.width - 4,
      height: player.height - 2
    };

    if (hitbox.y < 0 || hitbox.y + hitbox.height > HEIGHT) {
      gameOver();
      return;
    }

    for (const obstacle of obstacles) {
      const overlapsX =
        hitbox.x < obstacle.x + CONFIG.obstacleWidth &&
        hitbox.x + hitbox.width > obstacle.x;
      if (!overlapsX) continue;

      const gapTop = obstacle.gapY;
      const gapBottom = gapTop + obstacle.gapHeight;
      if (hitbox.y < gapTop || hitbox.y + hitbox.height > gapBottom) {
        gameOver();
        return;
      }
    }
  }

  function gameOver() {
    state = "gameover";
    overlayTitle.textContent = "Башня не прощает ошибок";
    overlayHint.textContent = "Счёт: " + score + " — кликни или нажми пробел, чтобы заново";
    overlay.classList.remove("is-hidden");
  }

  function drawBackground() {
    ctx.fillStyle = "#111a31";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Звёзды и линии стены подчёркивают движение вдоль башни.
    ctx.fillStyle = "#536184";
    for (let i = 0; i < 24; i++) {
      const x = (i * 47 - frame * 0.35 + WIDTH * 3) % WIDTH;
      const y = (i * 29 + 13) % HEIGHT;
      ctx.fillRect(x, y, 1, 1);
    }

    ctx.fillStyle = "#1d2945";
    const offset = (frame * CONFIG.scrollSpeed) % 32;
    for (let x = -offset; x < WIDTH; x += 32) {
      ctx.fillRect(x, 0, 1, HEIGHT);
    }
  }

  function drawObstacles() {
    for (const obstacle of obstacles) {
      const x = Math.round(obstacle.x);
      const topHeight = obstacle.gapY;
      const bottomY = obstacle.gapY + obstacle.gapHeight;

      // Верхний и нижний блоки — условные выступы башни.
      ctx.fillStyle = "#526b82";
      ctx.fillRect(x, 0, CONFIG.obstacleWidth, topHeight);
      ctx.fillRect(x, bottomY, CONFIG.obstacleWidth, HEIGHT - bottomY);

      ctx.fillStyle = "#8da6b5";
      ctx.fillRect(x, 0, 3, topHeight);
      ctx.fillRect(x, bottomY, 3, HEIGHT - bottomY);
      ctx.fillStyle = "#34495f";
      ctx.fillRect(x + CONFIG.obstacleWidth - 3, 0, 3, topHeight);
      ctx.fillRect(x + CONFIG.obstacleWidth - 3, bottomY, 3, HEIGHT - bottomY);
    }
  }

  function drawPlayer() {
    const x = Math.round(player.x);
    const y = Math.round(player.y);

    // Временный герой-заглушка. Позже его можно заменить спрайтом Nyan Cat.
    ctx.fillStyle = "#f5c96b";
    ctx.fillRect(x, y + 2, player.width, player.height - 2);
    ctx.fillStyle = "#fff0b0";
    ctx.fillRect(x + 2, y, 8, 3);
    ctx.fillStyle = "#25304a";
    ctx.fillRect(x + 9, y + 3, 2, 2);
    ctx.fillStyle = "#e88d70";
    ctx.fillRect(x - 3, y + 5, 3, 3);
  }

  function draw() {
    drawBackground();
    drawObstacles();
    drawPlayer();

    // Тонкая линия горизонта помогает считывать границы игрового поля.
    ctx.fillStyle = "#71809d";
    ctx.fillRect(0, 0, WIDTH, 1);
    ctx.fillRect(0, HEIGHT - 1, WIDTH, 1);
  }

  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    // Ограничиваем большой delta после переключения вкладки.
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
      if (event.code !== "Space" && event.code !== "ArrowUp" && event.code !== "KeyW") return;
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

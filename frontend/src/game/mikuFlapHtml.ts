// Self-contained Flappy-Bird-style game starring Hatsune Miku.
// Vanilla JS + Canvas inside a single HTML string, embedded in a WebView (mobile)
// or an <iframe srcDoc> (web). No external dependencies.

export const gameHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover" />
<title>Miku Flap</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  html, body {
    width: 100%; height: 100%;
    background: #0a0a14;
    overflow: hidden;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  }
  #wrap {
    position: fixed; inset: 0;
    display: flex; align-items: center; justify-content: center;
    background: radial-gradient(circle at 50% 30%, #2a1b4a 0%, #0a0a14 70%);
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    image-rendering: pixelated;
    image-rendering: -moz-crisp-edges;
    image-rendering: crisp-edges;
    touch-action: none;
  }
  #hint {
    position: absolute;
    left: 50%;
    bottom: 18px;
    transform: translateX(-50%);
    color: rgba(255,255,255,0.55);
    font-size: 12px;
    letter-spacing: 1px;
    pointer-events: none;
    text-transform: uppercase;
  }
</style>
</head>
<body>
<div id="wrap">
  <canvas id="game" data-testid="game-canvas"></canvas>
  <div id="hint" data-testid="hint">Tap or press Space to flap</div>
</div>
<script>
(function () {
  "use strict";

  // ===== Canvas setup =====
  var canvas = document.getElementById("game");
  var hint = document.getElementById("hint");
  var ctx = canvas.getContext("2d");

  // Virtual game resolution (logical pixels). We render at this size then scale.
  var VW = 360;
  var VH = 640;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth;
    var h = window.innerHeight;
    // Fit the virtual canvas into screen using "contain" + letterbox.
    var scale = Math.min(w / VW, h / VH);
    var cssW = Math.floor(VW * scale);
    var cssH = Math.floor(VH * scale);
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.width = Math.floor(VW * dpr);
    canvas.height = Math.floor(VH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  // ===== Audio (procedural, no assets) =====
  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  var audio = null;
  // C major pentatonic-ish so any sequence is consonant
  var noteHz = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51];
  var noteIdx = 0;
  function ensureAudio() {
    if (!audio && AudioCtx) {
      try { audio = new AudioCtx(); } catch (e) { audio = null; }
    }
    if (audio && audio.state === "suspended") {
      audio.resume().catch(function () {});
    }
  }
  function playFlap() {
    if (!audio) return;
    var t = audio.currentTime;
    var f = noteHz[noteIdx % noteHz.length];
    noteIdx++;
    var osc = audio.createOscillator();
    var gain = audio.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(f, t);
    osc.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.08);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  }
  function playScore() {
    if (!audio) return;
    var t = audio.currentTime;
    [880, 1318.51].forEach(function (f, i) {
      var osc = audio.createOscillator();
      var gain = audio.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, t + i * 0.07);
      gain.gain.setValueAtTime(0.0001, t + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.15, t + i * 0.07 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.07 + 0.18);
      osc.connect(gain).connect(audio.destination);
      osc.start(t + i * 0.07);
      osc.stop(t + i * 0.07 + 0.2);
    });
  }
  function playHit() {
    if (!audio) return;
    var t = audio.currentTime;
    var osc = audio.createOscillator();
    var gain = audio.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.4);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  // ===== Game state =====
  var STATE_READY = 0, STATE_PLAY = 1, STATE_OVER = 2;
  var state = STATE_READY;

  var GRAVITY = 1500;       // px / s^2
  var FLAP_VY = -430;       // px / s
  var PIPE_SPEED = 150;     // px / s
  var PIPE_GAP = 165;       // vertical gap
  var PIPE_INTERVAL = 1.55; // seconds between spawns
  var PIPE_WIDTH = 56;
  var GROUND_H = 90;

  var miku = {
    x: 110, y: VH * 0.42,
    vy: 0,
    r: 18,
    angle: 0,
    flapAnim: 0,
  };
  var pipes = []; // { x, gapY, passed }
  var particles = []; // confetti / sparkles
  var spawnTimer = 0;
  var groundOffset = 0;
  var cloudOffset = 0;
  var lightPhase = 0;

  var score = 0;
  var best = 0;
  try {
    var raw = localStorage.getItem("miku_flap_best");
    if (raw) best = parseInt(raw, 10) || 0;
  } catch (e) {}

  function resetGame() {
    miku.x = 110;
    miku.y = VH * 0.42;
    miku.vy = 0;
    miku.angle = 0;
    miku.flapAnim = 0;
    pipes.length = 0;
    particles.length = 0;
    spawnTimer = 0.6;
    score = 0;
    noteIdx = 0;
    state = STATE_READY;
    hint.style.display = "block";
  }

  function startGame() {
    state = STATE_PLAY;
    hint.style.display = "none";
    flap();
  }

  function gameOver() {
    state = STATE_OVER;
    playHit();
    // Big confetti shower
    for (var i = 0; i < 40; i++) {
      particles.push({
        x: miku.x, y: miku.y,
        vx: (Math.random() - 0.5) * 280,
        vy: (Math.random() - 1) * 320,
        life: 1 + Math.random() * 0.8,
        max: 1.8,
        color: ["#39c5bb", "#ff6f9c", "#fff4a3", "#ffffff", "#8be9fd"][Math.floor(Math.random() * 5)],
        size: 2 + Math.random() * 3,
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 8,
      });
    }
    if (score > best) {
      best = score;
      try { localStorage.setItem("miku_flap_best", String(best)); } catch (e) {}
    }
  }

  function flap() {
    if (state === STATE_OVER) return;
    miku.vy = FLAP_VY;
    miku.flapAnim = 1;
    playFlap();
    // tiny sparkle puff
    for (var i = 0; i < 6; i++) {
      particles.push({
        x: miku.x - 8, y: miku.y + 4,
        vx: -60 - Math.random() * 80,
        vy: (Math.random() - 0.5) * 60,
        life: 0.5 + Math.random() * 0.3,
        max: 0.8,
        color: "#bff9ff",
        size: 1.5 + Math.random() * 1.5,
        rot: 0, spin: 0,
      });
    }
  }

  // ===== Input =====
  function handlePress(e) {
    if (e && e.cancelable) e.preventDefault();
    ensureAudio();
    if (state === STATE_READY) {
      startGame();
    } else if (state === STATE_PLAY) {
      flap();
    } else if (state === STATE_OVER) {
      // Try-again button hit-test (in screen coords -> virtual coords)
      if (e && e.clientX != null) {
        var rect = canvas.getBoundingClientRect();
        var sx = (e.clientX - rect.left) * (VW / rect.width);
        var sy = (e.clientY - rect.top) * (VH / rect.height);
        if (tryAgainBtn.contains(sx, sy)) {
          resetGame();
          return;
        }
      }
      resetGame();
    }
  }

  canvas.addEventListener("pointerdown", handlePress, { passive: false });
  canvas.addEventListener("touchstart", function (e) { handlePress(e.touches && e.touches[0] ? e.touches[0] : null); }, { passive: false });
  window.addEventListener("keydown", function (e) {
    if (e.code === "Space" || e.key === " " || e.code === "ArrowUp") {
      handlePress(e);
    }
  });

  // ===== Try Again button (drawn on canvas) =====
  var tryAgainBtn = {
    x: VW / 2 - 90, y: VH / 2 + 70, w: 180, h: 52,
    contains: function (px, py) {
      return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h;
    },
  };

  // ===== Pipe spawning (leeks) =====
  function spawnPipe() {
    var minGapTop = 80;
    var maxGapTop = VH - GROUND_H - PIPE_GAP - 60;
    var gapY = minGapTop + Math.random() * (maxGapTop - minGapTop);
    pipes.push({ x: VW + 20, gapY: gapY, passed: false });
  }

  // ===== Update =====
  function update(dt) {
    cloudOffset = (cloudOffset + dt * 14) % VW;
    lightPhase += dt;

    if (state === STATE_READY) {
      // gentle hover
      miku.y = VH * 0.42 + Math.sin(performance.now() / 350) * 6;
      miku.angle = Math.sin(performance.now() / 350) * 0.08;
    }

    if (state === STATE_PLAY) {
      groundOffset = (groundOffset + PIPE_SPEED * dt) % 24;

      miku.vy += GRAVITY * dt;
      miku.y += miku.vy * dt;
      miku.angle = Math.max(-0.45, Math.min(1.2, miku.vy / 600));
      miku.flapAnim = Math.max(0, miku.flapAnim - dt * 4);

      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnPipe();
        spawnTimer = PIPE_INTERVAL;
      }

      for (var i = pipes.length - 1; i >= 0; i--) {
        var p = pipes[i];
        p.x -= PIPE_SPEED * dt;

        // Scoring
        if (!p.passed && p.x + PIPE_WIDTH < miku.x) {
          p.passed = true;
          score++;
          playScore();
          for (var s = 0; s < 8; s++) {
            particles.push({
              x: miku.x + 10, y: miku.y,
              vx: 40 + Math.random() * 60,
              vy: (Math.random() - 0.5) * 120,
              life: 0.6 + Math.random() * 0.3,
              max: 0.9,
              color: ["#39c5bb", "#fff4a3", "#ffffff"][Math.floor(Math.random() * 3)],
              size: 2 + Math.random() * 2,
              rot: 0, spin: 0,
            });
          }
        }

        // Collision check (AABB vs circle approximation)
        if (collidePipe(p)) {
          gameOver();
        }

        if (p.x + PIPE_WIDTH < -10) pipes.splice(i, 1);
      }

      // Ground / ceiling collision
      if (miku.y + miku.r >= VH - GROUND_H) {
        miku.y = VH - GROUND_H - miku.r;
        gameOver();
      }
      if (miku.y - miku.r < 0) {
        miku.y = miku.r;
        miku.vy = 0;
      }
    }

    if (state === STATE_OVER) {
      // Miku falls
      miku.vy += GRAVITY * dt;
      miku.y += miku.vy * dt;
      miku.angle = Math.min(miku.angle + dt * 3, Math.PI / 2);
      if (miku.y + miku.r > VH - GROUND_H) {
        miku.y = VH - GROUND_H - miku.r;
        miku.vy = 0;
      }
    }

    // particles update
    for (var j = particles.length - 1; j >= 0; j--) {
      var pt = particles[j];
      pt.vy += 380 * dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.rot += pt.spin * dt;
      pt.life -= dt;
      if (pt.life <= 0) particles.splice(j, 1);
    }
  }

  function collidePipe(p) {
    var topRect = { x: p.x, y: 0, w: PIPE_WIDTH, h: p.gapY };
    var botRect = { x: p.x, y: p.gapY + PIPE_GAP, w: PIPE_WIDTH, h: VH - GROUND_H - (p.gapY + PIPE_GAP) };
    return circleRect(miku.x, miku.y, miku.r * 0.78, topRect) ||
           circleRect(miku.x, miku.y, miku.r * 0.78, botRect);
  }
  function circleRect(cx, cy, cr, r) {
    var nx = Math.max(r.x, Math.min(cx, r.x + r.w));
    var ny = Math.max(r.y, Math.min(cy, r.y + r.h));
    var dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy < cr * cr;
  }

  // ===== Drawing =====
  function draw() {
    // Sky gradient (pastel) — refreshed each frame so concert lights blend on top
    var sky = ctx.createLinearGradient(0, 0, 0, VH);
    sky.addColorStop(0, "#ffd1e4");   // pink
    sky.addColorStop(0.45, "#c7b5ff"); // lavender
    sky.addColorStop(1, "#a8e8ff");    // teal-sky
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VW, VH);

    drawStageLights();
    drawClouds();
    drawStage();
    drawPipes();
    drawGround();
    drawMiku();
    drawParticles();
    drawHud();

    if (state === STATE_READY) drawReady();
    if (state === STATE_OVER) drawGameOver();
  }

  function drawStageLights() {
    // Two sweeping spotlights from top
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    var beams = [
      { cx: VW * 0.3, hue: "rgba(57,197,187,", offset: 0 },
      { cx: VW * 0.7, hue: "rgba(255,111,156,", offset: Math.PI },
    ];
    for (var i = 0; i < beams.length; i++) {
      var b = beams[i];
      var sway = Math.sin(lightPhase * 0.8 + b.offset) * 60;
      var x = b.cx + sway;
      var grad = ctx.createLinearGradient(x, 0, x + sway * 0.4, VH - GROUND_H);
      grad.addColorStop(0, b.hue + "0.55)");
      grad.addColorStop(1, b.hue + "0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x - 8, 0);
      ctx.lineTo(x + 8, 0);
      ctx.lineTo(x + 80 + sway * 0.5, VH - GROUND_H);
      ctx.lineTo(x - 80 + sway * 0.5, VH - GROUND_H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawClouds() {
    ctx.save();
    ctx.globalAlpha = 0.85;
    for (var i = 0; i < 3; i++) {
      var cx = ((i * 160) - cloudOffset + VW) % (VW + 120) - 60;
      var cy = 70 + i * 50;
      drawCloud(cx, cy, 1 + i * 0.15);
    }
    ctx.restore();
  }
  function drawCloud(x, y, s) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(x, y, 14 * s, 0, Math.PI * 2);
    ctx.arc(x + 14 * s, y - 6 * s, 16 * s, 0, Math.PI * 2);
    ctx.arc(x + 30 * s, y, 14 * s, 0, Math.PI * 2);
    ctx.arc(x + 18 * s, y + 6 * s, 12 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawStage() {
    // distant concert stage silhouette
    ctx.save();
    var y = VH - GROUND_H - 70;
    // truss
    ctx.fillStyle = "rgba(20,15,40,0.55)";
    ctx.fillRect(0, y, VW, 8);
    // speakers
    ctx.fillStyle = "rgba(20,15,40,0.55)";
    ctx.fillRect(8, y, 22, 70);
    ctx.fillRect(VW - 30, y, 22, 70);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(12, y + 6, 14, 14);
    ctx.fillRect(12, y + 28, 14, 14);
    ctx.fillRect(12, y + 50, 14, 14);
    ctx.fillRect(VW - 26, y + 6, 14, 14);
    ctx.fillRect(VW - 26, y + 28, 14, 14);
    ctx.fillRect(VW - 26, y + 50, 14, 14);
    // pulsing stage lights along the truss
    for (var i = 0; i < 6; i++) {
      var lx = 40 + i * (VW - 80) / 5;
      var pulse = 0.5 + 0.5 * Math.sin(lightPhase * 3 + i);
      ctx.fillStyle = "rgba(57,197,187," + (0.25 + pulse * 0.45) + ")";
      ctx.beginPath();
      ctx.arc(lx, y - 4, 4 + pulse * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ===== Leek (negi) pipes =====
  function drawPipes() {
    for (var i = 0; i < pipes.length; i++) {
      var p = pipes[i];
      drawLeek(p.x, p.gapY, true);   // top leek (pointing down)
      drawLeek(p.x, p.gapY + PIPE_GAP, false); // bottom leek (pointing up)
    }
  }
  function drawLeek(x, gapEdgeY, isTop) {
    var w = PIPE_WIDTH;
    var groundTop = VH - GROUND_H;
    ctx.save();
    if (isTop) {
      // top leek: white bulb at the bottom (gap side), green leaves above
      var topY = 0;
      var bottomY = gapEdgeY;
      // green leaves portion (top 65%)
      var leafEnd = bottomY - 70;
      // leaves background
      var leafGrad = ctx.createLinearGradient(x, 0, x + w, 0);
      leafGrad.addColorStop(0, "#3aa84a");
      leafGrad.addColorStop(0.5, "#7ed957");
      leafGrad.addColorStop(1, "#3aa84a");
      ctx.fillStyle = leafGrad;
      ctx.fillRect(x + 4, topY, w - 8, leafEnd - topY);
      // leaf stripes
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.lineWidth = 1;
      for (var s = topY + 8; s < leafEnd; s += 10) {
        ctx.beginPath();
        ctx.moveTo(x + 8, s);
        ctx.lineTo(x + w - 8, s);
        ctx.stroke();
      }
      // jagged top (leaf tips) - draw a small cap
      ctx.fillStyle = "#2e8a3c";
      ctx.beginPath();
      ctx.moveTo(x + 4, topY);
      var tips = 5;
      for (var t = 0; t <= tips; t++) {
        var tx = x + 4 + ((w - 8) * t) / tips;
        var ty = topY + (t % 2 === 0 ? 0 : -8);
        ctx.lineTo(tx, ty);
      }
      ctx.lineTo(x + w - 4, topY);
      ctx.closePath();
      // (cap is decorative above 0; clipped by canvas)
      // white bulb section
      var bulbGrad = ctx.createLinearGradient(x, leafEnd, x, bottomY);
      bulbGrad.addColorStop(0, "#dff6c8");
      bulbGrad.addColorStop(0.5, "#ffffff");
      bulbGrad.addColorStop(1, "#eef9d8");
      ctx.fillStyle = bulbGrad;
      ctx.fillRect(x, leafEnd, w, bottomY - leafEnd);
      // bulb roots/tip at gap side
      ctx.fillStyle = "#fff8e0";
      ctx.beginPath();
      ctx.moveTo(x, bottomY - 10);
      ctx.quadraticCurveTo(x + w / 2, bottomY + 8, x + w, bottomY - 10);
      ctx.lineTo(x + w, bottomY);
      ctx.lineTo(x, bottomY);
      ctx.closePath();
      ctx.fill();
      // outline
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.5, leafEnd + 0.5, w - 1, bottomY - leafEnd - 1);
      ctx.strokeRect(x + 4.5, topY + 0.5, w - 9, leafEnd - topY - 1);
    } else {
      // bottom leek: white bulb at the top (gap side), green leaves below to ground
      var topY2 = gapEdgeY;
      var bottomY2 = groundTop;
      var bulbEnd = topY2 + 70;
      // bulb
      var bulbGrad2 = ctx.createLinearGradient(x, topY2, x, bulbEnd);
      bulbGrad2.addColorStop(0, "#eef9d8");
      bulbGrad2.addColorStop(0.5, "#ffffff");
      bulbGrad2.addColorStop(1, "#dff6c8");
      ctx.fillStyle = bulbGrad2;
      ctx.fillRect(x, topY2, w, bulbEnd - topY2);
      // roots at top
      ctx.fillStyle = "#fff8e0";
      ctx.beginPath();
      ctx.moveTo(x, topY2 + 10);
      ctx.quadraticCurveTo(x + w / 2, topY2 - 8, x + w, topY2 + 10);
      ctx.lineTo(x + w, topY2);
      ctx.lineTo(x, topY2);
      ctx.closePath();
      ctx.fill();
      // green leaves
      var leafGrad2 = ctx.createLinearGradient(x, 0, x + w, 0);
      leafGrad2.addColorStop(0, "#3aa84a");
      leafGrad2.addColorStop(0.5, "#7ed957");
      leafGrad2.addColorStop(1, "#3aa84a");
      ctx.fillStyle = leafGrad2;
      ctx.fillRect(x + 4, bulbEnd, w - 8, bottomY2 - bulbEnd);
      // leaf stripes
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.lineWidth = 1;
      for (var s2 = bulbEnd + 10; s2 < bottomY2; s2 += 10) {
        ctx.beginPath();
        ctx.moveTo(x + 8, s2);
        ctx.lineTo(x + w - 8, s2);
        ctx.stroke();
      }
      // outline
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.5, topY2 + 0.5, w - 1, bulbEnd - topY2 - 1);
      ctx.strokeRect(x + 4.5, bulbEnd + 0.5, w - 9, bottomY2 - bulbEnd - 1);
    }
    ctx.restore();
  }

  function drawGround() {
    var gy = VH - GROUND_H;
    // grass strip
    ctx.fillStyle = "#7ed957";
    ctx.fillRect(0, gy, VW, 14);
    ctx.fillStyle = "#5fb43d";
    ctx.fillRect(0, gy + 14, VW, 6);
    // dirt
    var dirt = ctx.createLinearGradient(0, gy + 20, 0, VH);
    dirt.addColorStop(0, "#caa472");
    dirt.addColorStop(1, "#8a6a3b");
    ctx.fillStyle = dirt;
    ctx.fillRect(0, gy + 20, VW, VH - gy - 20);
    // scrolling stripes
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    for (var i = -1; i < VW / 24 + 2; i++) {
      var sx = i * 24 - groundOffset;
      ctx.fillRect(sx, gy + 24, 12, 6);
      ctx.fillRect(sx + 6, gy + 44, 12, 6);
      ctx.fillRect(sx, gy + 64, 12, 6);
    }
  }

  // ===== Miku sprite (drawn pixel-chibi style on canvas) =====
  function drawMiku() {
    ctx.save();
    ctx.translate(miku.x, miku.y);
    ctx.rotate(miku.angle);

    // shadow under
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(0, 22, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    var flap = miku.flapAnim; // 0..1

    // ===== Twin-tails (teal) trailing behind =====
    ctx.fillStyle = "#39c5bb";
    ctx.strokeStyle = "#1f7e78";
    ctx.lineWidth = 1;
    // upper tail
    ctx.beginPath();
    ctx.moveTo(-6, -6);
    ctx.quadraticCurveTo(-26, -16 - flap * 4, -34, -2);
    ctx.quadraticCurveTo(-26, 2, -8, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // lower tail
    ctx.beginPath();
    ctx.moveTo(-6, 6);
    ctx.quadraticCurveTo(-28, 16 + flap * 4, -36, 4);
    ctx.quadraticCurveTo(-26, 12, -8, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // tail bands (black hair ties)
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(-12, -10, 5, 8);
    ctx.fillRect(-12, 4, 5, 8);

    // ===== Body / outfit (white & teal sailor top) =====
    // torso
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 1.2;
    roundRect(-9, 4, 18, 16, 4);
    ctx.fill(); ctx.stroke();
    // teal collar / tie
    ctx.fillStyle = "#39c5bb";
    ctx.beginPath();
    ctx.moveTo(-9, 4);
    ctx.lineTo(9, 4);
    ctx.lineTo(6, 10);
    ctx.lineTo(0, 7);
    ctx.lineTo(-6, 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#222"; ctx.stroke();
    // red tie
    ctx.fillStyle = "#ff4d6d";
    ctx.beginPath();
    ctx.moveTo(-2, 8);
    ctx.lineTo(2, 8);
    ctx.lineTo(3, 16);
    ctx.lineTo(-3, 16);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // ===== Arm/wing (flaps) =====
    var wingY = 10 - flap * 14;
    var wingAngle = -flap * 0.9;
    ctx.save();
    ctx.translate(6, 10);
    ctx.rotate(wingAngle);
    ctx.fillStyle = "#39c5bb";
    ctx.strokeStyle = "#1f7e78";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(14, -4, 16, 6);
    ctx.quadraticCurveTo(8, 8, 0, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    // back arm (subtle)
    ctx.save();
    ctx.translate(-6, 10);
    ctx.rotate(-wingAngle * 0.6);
    ctx.fillStyle = "#2ea69d";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-10, -2, -12, 6);
    ctx.quadraticCurveTo(-6, 8, 0, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // ===== Head =====
    // hair back (frame around face)
    ctx.fillStyle = "#39c5bb";
    ctx.strokeStyle = "#1f7e78";
    ctx.beginPath();
    ctx.arc(0, -8, 14, 0, Math.PI * 2);
    ctx.fill();
    // face (skin)
    ctx.fillStyle = "#fde6cf";
    ctx.beginPath();
    ctx.arc(1, -6, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#a07a55";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // hair bangs
    ctx.fillStyle = "#39c5bb";
    ctx.strokeStyle = "#1f7e78";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-10, -10);
    ctx.quadraticCurveTo(-8, -18, 0, -16);
    ctx.quadraticCurveTo(8, -18, 11, -10);
    ctx.quadraticCurveTo(6, -8, 4, -12);
    ctx.quadraticCurveTo(0, -8, -3, -12);
    ctx.quadraticCurveTo(-6, -8, -10, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // eyes (teal)
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.ellipse(-3, -6, 2.4, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(5, -6, 2.4, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1f7e78";
    ctx.beginPath(); ctx.ellipse(-3, -5.5, 1.4, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(5, -5.5, 1.4, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(-2.6, -6.2, 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(5.4, -6.2, 0.6, 0, Math.PI * 2); ctx.fill();
    // blush
    ctx.fillStyle = "rgba(255,120,150,0.55)";
    ctx.beginPath(); ctx.arc(-5, -3, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, -3, 1.6, 0, Math.PI * 2); ctx.fill();
    // mouth
    ctx.strokeStyle = "#8a4a4a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.quadraticCurveTo(1.5, -0.5, 3, -2);
    ctx.stroke();

    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawParticles() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var a = Math.max(0, Math.min(1, p.life / p.max));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
      ctx.restore();
    }
  }

  // ===== HUD =====
  function drawHud() {
    // score (top center)
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "bold 56px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillText(String(score), VW / 2 + 2, 88);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(String(score), VW / 2, 86);
    ctx.strokeStyle = "#39c5bb";
    ctx.lineWidth = 2.5;
    ctx.strokeText(String(score), VW / 2, 86);

    // best (top right)
    ctx.font = "600 14px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillText("BEST " + best, VW - 14, 30);
    ctx.fillStyle = "#fff4a3";
    ctx.fillText("BEST " + best, VW - 15, 29);
    ctx.restore();
  }

  function drawReady() {
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "800 28px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillText("MIKU FLAP", VW / 2 + 2, VH * 0.28 + 2);
    ctx.fillStyle = "#39c5bb";
    ctx.fillText("MIKU FLAP", VW / 2, VH * 0.28);
    ctx.font = "600 14px system-ui";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Tap or press Space to start", VW / 2, VH * 0.28 + 30);
    ctx.restore();
  }

  function drawGameOver() {
    ctx.save();
    // panel
    ctx.fillStyle = "rgba(10, 8, 28, 0.55)";
    ctx.fillRect(0, 0, VW, VH);

    var pw = 260, ph = 200;
    var px = VW / 2 - pw / 2;
    var py = VH / 2 - ph / 2 - 30;

    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    roundRect(px + 4, py + 6, pw, ph, 18); ctx.fill();
    // panel
    var pg = ctx.createLinearGradient(0, py, 0, py + ph);
    pg.addColorStop(0, "#ffffff");
    pg.addColorStop(1, "#e5f9f7");
    ctx.fillStyle = pg;
    roundRect(px, py, pw, ph, 18); ctx.fill();
    ctx.strokeStyle = "#39c5bb"; ctx.lineWidth = 3;
    roundRect(px, py, pw, ph, 18); ctx.stroke();

    ctx.textAlign = "center";
    ctx.font = "800 26px system-ui, -apple-system, Segoe UI";
    ctx.fillStyle = "#ff6f9c";
    ctx.fillText("GAME OVER", VW / 2, py + 42);

    ctx.font = "600 14px system-ui";
    ctx.fillStyle = "#444";
    ctx.fillText("SCORE", VW / 2 - 50, py + 80);
    ctx.fillText("BEST", VW / 2 + 50, py + 80);

    ctx.font = "800 30px system-ui";
    ctx.fillStyle = "#1f7e78";
    ctx.fillText(String(score), VW / 2 - 50, py + 116);
    ctx.fillStyle = "#c79a00";
    ctx.fillText(String(best), VW / 2 + 50, py + 116);

    if (score > 0 && score === best) {
      ctx.font = "700 12px system-ui";
      ctx.fillStyle = "#ff6f9c";
      ctx.fillText("NEW BEST!", VW / 2, py + 140);
    }

    // try again button
    var b = tryAgainBtn;
    var bg = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
    bg.addColorStop(0, "#39c5bb");
    bg.addColorStop(1, "#1f7e78");
    ctx.fillStyle = bg;
    roundRect(b.x, b.y, b.w, b.h, 14); ctx.fill();
    ctx.strokeStyle = "#0e4f4a"; ctx.lineWidth = 2;
    roundRect(b.x, b.y, b.w, b.h, 14); ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 18px system-ui";
    ctx.fillText("TRY AGAIN", VW / 2, b.y + 33);
    ctx.restore();
  }

  // ===== Main loop =====
  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }
  resetGame();
  requestAnimationFrame(frame);
})();
</script>
</body>
</html>`;

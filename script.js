(() => {
  // =============================
  // SETTINGS
  // =============================
  const PIPE_GAP_BASE = 145;
  const FORGIVING_BASE = 7;
  const PIPE_WIDTH = 64;

  // ✅ SLOWER (مثل الكود السابق تقريباً)
  const PIPE_SPEED_PX_PER_SEC = 190;  // كان 260 -> صار أبطأ
  // ✅ spacing طبيعي (أقرب شوي بس مو مزعج)
  const SPAWN_EVERY_SEC = 0.95;       // كان 0.86 -> صار أبطأ وأهدأ

  const GRAVITY = 1400;
  const JUMP_VELOCITY = -420;

  const LEVEL_EVERY_SCORE = 5;
  const GAP_SHRINK_PER_LEVEL = 5;
  const FORGIVING_GROW_PER_LEVEL = 0.2;

  const game = document.getElementById("game");
  const beeg = document.getElementById("beeg");

  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const levelEl = document.getElementById("level");

  const startOverlay = document.getElementById("startOverlay");
  const gameOverOverlay = document.getElementById("gameOverOverlay");

  const restartBtn = document.getElementById("restartBtn");
  const skinsBtn = document.getElementById("skinsBtn");

  const lastScoreEl = document.getElementById("lastScore");
  const playingSkinNameEl = document.getElementById("playingSkinName");
  const lastSkinImg = document.getElementById("lastSkinImg");

  const skinsModal = document.getElementById("skinsModal");
  const skinsGrid = document.getElementById("skinsGrid");
  const closeSkins = document.getElementById("closeSkins");
  const doneSkins = document.getElementById("doneSkins");

  const SKINS = [
    "beeg.png",
    "adeniyi.png",
    "angelo.png",
    "axol.png",
    "bard.png",
    "blub.png",
    "clean.png",
    "dave.png",
    "david.png",
    "death.png",
    "evan.png",
    "eyezen.png",
    "gawb.png",
    "iroh.png",
    "kriss.png",
    "legend.png",
    "lofi.png",
    "matteo.png",
    "ninja.png",
    "sca.png",
      "brat.png",
  "doby.png",
  "don.png",
  "kazuto.png",
  "mike.png",
  "mrbread.png",
  "nefarii.png",
    "van.png",
    "wara.png",
    "xp.png",
    "yuppi.png"
  ];

  const LS_BEST = "fb_best";
  const LS_SKIN = "fb_skin";

  let running = false;
  let startedOnce = false;

  let score = 0;
  let best = Number(localStorage.getItem(LS_BEST) || 0);
  let level = 1;

  let beegY = 0;
  let beegV = 0;

  let pipes = [];
  let lastTime = 0;
  let spawnTimer = 0;

  let gap = PIPE_GAP_BASE;
  let forgiving = FORGIVING_BASE;

  let currentSkin = localStorage.getItem(LS_SKIN) || "beeg.png";
  if (!SKINS.includes(currentSkin)) currentSkin = "beeg.png";
  beeg.src = currentSkin;

  bestEl.textContent = String(best);

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function gameRect() { return game.getBoundingClientRect(); }

  function resetDifficulty() {
    score = 0;
    level = 1;
    gap = PIPE_GAP_BASE;
    forgiving = FORGIVING_BASE;
    scoreEl.textContent = "0";
    levelEl.textContent = "1";
  }

  function setGameOverUI() {
    lastScoreEl.textContent = String(score);
    playingSkinNameEl.textContent = currentSkin;
    lastSkinImg.src = currentSkin;
  }

  function showStartOverlay(show) {
    startOverlay.classList.toggle("visible", !!show);
  }

  function showGameOver(show) {
    gameOverOverlay.classList.toggle("visible", !!show);
  }

  function showSkins(show) {
    skinsModal.classList.toggle("visible", !!show);
  }

  function clearPipes() {
    for (const p of pipes) {
      p.elTop.remove();
      p.elBot.remove();
    }
    pipes = [];
  }

  function updateBest() {
    if (score > best) {
      best = score;
      localStorage.setItem(LS_BEST, String(best));
      bestEl.textContent = String(best);
    }
  }

  function updateLevelByScore() {
    const newLevel = Math.floor(score / LEVEL_EVERY_SCORE) + 1;
    if (newLevel !== level) {
      level = newLevel;
      levelEl.textContent = String(level);

      const steps = level - 1;
      gap = PIPE_GAP_BASE - (steps * GAP_SHRINK_PER_LEVEL);
      forgiving = FORGIVING_BASE + (steps * FORGIVING_GROW_PER_LEVEL);

      gap = clamp(gap, 110, 220);
      forgiving = clamp(forgiving, 4, 20);
    }
  }

  function spawnPipe() {
    const rect = gameRect();
    const H = rect.height;

    const minTop = 70;
    const maxTop = H - gap - 140;

    const topH = clamp(
      Math.floor(minTop + Math.random() * (maxTop - minTop)),
      minTop,
      maxTop
    );

    const botY = topH + gap;

    const elTop = document.createElement("div");
    elTop.className = "pipe";
    elTop.style.left = rect.width + "px";
    elTop.style.top = "0px";
    elTop.style.height = topH + "px";

    const elBot = document.createElement("div");
    elBot.className = "pipe";
    elBot.style.left = rect.width + "px";
    elBot.style.top = botY + "px";
    elBot.style.height = (H - botY) + "px";

    game.appendChild(elTop);
    game.appendChild(elBot);

    pipes.push({ elTop, elBot, x: rect.width, topH, botY, passed: false });
  }

  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function checkCollision() {
    const rect = gameRect();
    const beegRect = beeg.getBoundingClientRect();

    const bx = beegRect.left - rect.left;
    const by = beegRect.top - rect.top;
    const bw = beegRect.width;
    const bh = beegRect.height;

    const fx = bx + forgiving;
    const fy = by + forgiving;
    const fw = bw - (forgiving * 2);
    const fh = bh - (forgiving * 2);

    if (fy < 0 || fy + fh > rect.height) return true;

    for (const p of pipes) {
      const px = p.x;
      const pw = PIPE_WIDTH;

      const topY = 0;
      const topH = p.topH;
      const botY = p.botY;
      const botH = rect.height - botY;

      if (rectsOverlap(fx, fy, fw, fh, px, topY, pw, topH)) return true;
      if (rectsOverlap(fx, fy, fw, fh, px, botY, pw, botH)) return true;
    }
    return false;
  }

  function setBeegPosition(y) {
    const rect = gameRect();
    beegY = clamp(y, 0, rect.height);
    beeg.style.top = beegY + "px";
  }

  function startGame() {
    if (running) return;

    showStartOverlay(false);
    showGameOver(false);
    showSkins(false);

    running = true;
    startedOnce = true;

    resetDifficulty();
    clearPipes();

    const rect = gameRect();
    beegV = 0;
    setBeegPosition(rect.height * 0.45);

    lastTime = performance.now();
    spawnTimer = 0;

    requestAnimationFrame(loop);
  }

  function endGame() {
    running = false;
    updateBest();
    setGameOverUI();
    showGameOver(true);
  }

  function jump() {
    if (!startedOnce) { startGame(); return; }
    if (!running) return;
    beegV = JUMP_VELOCITY;
  }

  function loop(t) {
    if (!running) return;

    const dt = Math.min(0.033, (t - lastTime) / 1000);
    lastTime = t;

    beegV += GRAVITY * dt;
    setBeegPosition(beegY + beegV * dt);

    spawnTimer += dt;
    if (spawnTimer >= SPAWN_EVERY_SEC) {
      spawnTimer = 0;
      spawnPipe();
    }

    const dx = PIPE_SPEED_PX_PER_SEC * dt;
    for (const p of pipes) {
      p.x -= dx;
      p.elTop.style.left = p.x + "px";
      p.elBot.style.left = p.x + "px";

      if (!p.passed && p.x + PIPE_WIDTH < 90) {
        p.passed = true;
        score += 1;
        scoreEl.textContent = String(score);
        updateLevelByScore();
      }
    }

    pipes = pipes.filter(p => {
      if (p.x + PIPE_WIDTH < -20) {
        p.elTop.remove();
        p.elBot.remove();
        return false;
      }
      return true;
    });

    if (checkCollision()) { endGame(); return; }
    requestAnimationFrame(loop);
  }

  function renderSkins() {
    skinsGrid.innerHTML = "";
    for (const file of SKINS) {
      const item = document.createElement("div");
      item.className = "skinItem" + (file === currentSkin ? " selected" : "");
      const img = document.createElement("img");
      img.src = file;
      img.alt = file;
      item.appendChild(img);

      item.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        currentSkin = file;
        localStorage.setItem(LS_SKIN, currentSkin);
        beeg.src = currentSkin;

        [...skinsGrid.querySelectorAll(".skinItem")].forEach(x => x.classList.remove("selected"));
        item.classList.add("selected");
      });

      skinsGrid.appendChild(item);
    }
  }

  function stopAll(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  game.addEventListener("pointerdown", (e) => {
    if (skinsModal.classList.contains("visible")) return;
    if (gameOverOverlay.classList.contains("visible")) return;
    stopAll(e);
    jump();
  }, { passive: false });

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      jump();
    }
  });

  [restartBtn, skinsBtn, closeSkins, doneSkins].forEach(btn => {
    btn.addEventListener("pointerdown", stopAll, { passive: false });
  });

  restartBtn.addEventListener("click", (e) => { stopAll(e); startGame(); });
  skinsBtn.addEventListener("click", (e) => { stopAll(e); renderSkins(); showSkins(true); });
  closeSkins.addEventListener("click", (e) => { stopAll(e); showSkins(false); });
  doneSkins.addEventListener("click", (e) => { stopAll(e); showSkins(false); });

  document.addEventListener("gesturestart", (e) => e.preventDefault());

  function init() {
    bestEl.textContent = String(best);
    showStartOverlay(true);
    showGameOver(false);

    lastSkinImg.src = currentSkin;
    playingSkinNameEl.textContent = currentSkin;

    const rect = gameRect();
    setBeegPosition(rect.height * 0.45);
  }

  init();
})();



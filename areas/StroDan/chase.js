// A swarm of fireflies chases the pointer across a night meadow. With no pointer
// around, the swarm wanders by itself, so the gallery tile stays alive.

const canvas = document.getElementById("meadow");
const ctx = canvas.getContext("2d");
const statusText = document.getElementById("status");

const START_COUNT = 80, MIN_COUNT = 10, MAX_COUNT = 300, COUNT_STEP = 10;
const IDLE_SECONDS = 4, MAX_SPEED = 900;
const SCATTER_RADIUS = 350, FLEE_RADIUS = 280;
const HUES = [62, 74, 48];
const steadyGlow = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const flies = [];
const ripples = [];
const pointer = { x: 0, y: 0, active: false, lastMove: -Infinity };
const target = { x: 0, y: 0 };
let width = 0, height = 0, clock = 0, last = null, mode = "follow";
let backdrop, sprites;

function random(min, max) {
  return min + Math.random() * (max - min);
}

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function makeSprite(hue) {
  const c = makeCanvas(64, 64);
  const g = c.getContext("2d");
  const glow = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, `hsla(${hue}, 100%, 92%, 1)`);
  glow.addColorStop(0.14, `hsla(${hue}, 100%, 68%, 0.9)`);
  glow.addColorStop(0.45, `hsla(${hue}, 100%, 50%, 0.22)`);
  glow.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
  g.fillStyle = glow;
  g.fillRect(0, 0, 64, 64);
  return c;
}

// Sky, stars, moon, and grass change only on resize, so they are drawn once.
function makeBackdrop() {
  const c = makeCanvas(width, height);
  const g = c.getContext("2d");

  const sky = g.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#07131f");
  sky.addColorStop(0.65, "#0c2a2e");
  sky.addColorStop(1, "#143a2c");
  g.fillStyle = sky;
  g.fillRect(0, 0, width, height);

  for (let i = 0; i < 140; i++) {
    g.fillStyle = `rgba(230, 240, 255, ${random(0.15, 0.7)})`;
    g.fillRect(random(0, width), random(0, height * 0.6), random(1, 2), random(1, 2));
  }

  const moonX = width * 0.82, moonY = height * 0.18;
  const halo = g.createRadialGradient(moonX, moonY, 10, moonX, moonY, 150);
  halo.addColorStop(0, "rgba(240, 240, 205, 0.3)");
  halo.addColorStop(1, "rgba(240, 240, 205, 0)");
  g.fillStyle = halo;
  g.fillRect(moonX - 150, moonY - 150, 300, 300);
  g.fillStyle = "#f0f0cd";
  g.beginPath();
  g.arc(moonX, moonY, 30, 0, Math.PI * 2);
  g.fill();

  g.strokeStyle = "#04100d";
  g.lineCap = "round";
  for (let x = -10; x < width + 10; x += 5) {
    const tall = random(40, 130);
    g.lineWidth = random(2, 5);
    g.beginPath();
    g.moveTo(x, height);
    g.quadraticCurveTo(x + random(-8, 8), height - tall * 0.6, x + random(-30, 30), height - tall);
    g.stroke();
  }
  return c;
}

function addFly() {
  flies.push({
    x: random(0, width),
    y: random(0, height),
    vx: 0,
    vy: 0,
    angle: random(0, Math.PI * 2),
    spin: random(0.4, 1.6) * (Math.random() < 0.5 ? -1 : 1),
    orbit: random(20, 130),
    pull: random(2, 6),
    homeX: Math.random(),
    homeY: Math.random() * 0.85,
    phase: random(0, Math.PI * 2),
    blink: random(1.5, 4),
    sprite: Math.floor(random(0, HUES.length)),
    size: random(26, 46),
  });
}

function setCount(n) {
  n = Math.max(MIN_COUNT, Math.min(MAX_COUNT, n));
  while (flies.length < n) addFly();
  flies.length = n;
  updateStatus();
}

function updateStatus() {
  const verb = mode === "follow" ? "following" : "fleeing";
  statusText.textContent = `${flies.length} fireflies, ${verb}`;
}

// The point the swarm chases: the pointer, or a slow loop when nobody is steering.
function updateTarget(dt) {
  const steering = pointer.active && clock - pointer.lastMove < IDLE_SECONDS;
  const goalX = steering ? pointer.x : width * (0.5 + 0.32 * Math.cos(clock * 0.37));
  const goalY = steering ? pointer.y : height * (0.45 + 0.28 * Math.sin(clock * 0.53));
  const ease = 1 - Math.exp(-dt * 6);
  target.x += (goalX - target.x) * ease;
  target.y += (goalY - target.y) * ease;
}

function moveFly(f, dt) {
  let ax = random(-90, 90), ay = random(-90, 90);
  if (mode === "follow") {
    f.angle += f.spin * dt;
    ax += (target.x + Math.cos(f.angle) * f.orbit - f.x) * f.pull;
    ay += (target.y + Math.sin(f.angle) * f.orbit - f.y) * f.pull;
  } else {
    ax += (f.homeX * width - f.x) * 0.6;
    ay += (f.homeY * height - f.y) * 0.6;
    const dx = f.x - target.x, dy = f.y - target.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < FLEE_RADIUS) {
      const push = 2600 * (1 - d / FLEE_RADIUS);
      ax += (dx / d) * push;
      ay += (dy / d) * push;
    }
  }

  const damping = Math.exp(-dt * 1.8);
  f.vx = (f.vx + ax * dt) * damping;
  f.vy = (f.vy + ay * dt) * damping;
  const speed = Math.hypot(f.vx, f.vy);
  if (speed > MAX_SPEED) {
    f.vx *= MAX_SPEED / speed;
    f.vy *= MAX_SPEED / speed;
  }
  f.x += f.vx * dt;
  f.y += f.vy * dt;

  if (f.x < 0 || f.x > width) {
    f.x = Math.max(0, Math.min(width, f.x));
    f.vx *= -0.6;
  }
  if (f.y < 0 || f.y > height) {
    f.y = Math.max(0, Math.min(height, f.y));
    f.vy *= -0.6;
  }
}

function scatter(x, y) {
  for (const f of flies) {
    const dx = f.x - x, dy = f.y - y;
    const d = Math.hypot(dx, dy);
    if (d < SCATTER_RADIUS) {
      const angle = d > 1 ? Math.atan2(dy, dx) : random(0, Math.PI * 2);
      const kick = 150 + 750 * (1 - d / SCATTER_RADIUS);
      f.vx += Math.cos(angle) * kick;
      f.vy += Math.sin(angle) * kick;
    }
  }
  ripples.push({ x, y, age: 0 });
}

function step(dt) {
  clock += dt;
  updateTarget(dt);
  for (const f of flies) moveFly(f, dt);
  for (const r of ripples) r.age += dt;
  while (ripples.length && ripples[0].age > 0.6) ripples.shift();
}

function draw() {
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.drawImage(backdrop, 0, 0);

  ctx.globalCompositeOperation = "lighter";
  for (const r of ripples) {
    ctx.strokeStyle = `rgba(225, 240, 150, ${0.5 * (1 - r.age / 0.6)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(r.x, r.y, 20 + r.age * 500, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const f of flies) {
    const wave = 0.5 + 0.5 * Math.sin(clock * f.blink + f.phase);
    ctx.globalAlpha = steadyGlow ? 0.8 : 0.15 + 0.85 * wave * wave;
    ctx.drawImage(sprites[f.sprite], f.x - f.size / 2, f.y - f.size / 2, f.size, f.size);
  }
}

function frame(ms) {
  // A long gap (a hidden tab) must not fling the swarm across the screen.
  const dt = last === null ? 0 : Math.min((ms - last) / 1000, 0.05);
  last = ms;
  step(dt);
  draw();
  requestAnimationFrame(frame);
}

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
  backdrop = makeBackdrop();
}

function movePointer(e) {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.active = true;
  pointer.lastMove = clock;
}

window.addEventListener("pointermove", movePointer);
window.addEventListener("pointerdown", (e) => {
  movePointer(e);
  scatter(e.clientX, e.clientY);
});
document.documentElement.addEventListener("pointerleave", () => {
  pointer.active = false;
});

window.addEventListener("keydown", (e) => {
  if (e.key === " ") {
    mode = mode === "follow" ? "flee" : "follow";
    updateStatus();
  } else if (e.key === "ArrowUp") {
    setCount(flies.length + COUNT_STEP);
  } else if (e.key === "ArrowDown") {
    setCount(flies.length - COUNT_STEP);
  } else {
    return;
  }
  e.preventDefault();
});

window.addEventListener("resize", resize);

sprites = HUES.map(makeSprite);
resize();
target.x = width / 2;
target.y = height / 2;
setCount(START_COUNT);
requestAnimationFrame(frame);

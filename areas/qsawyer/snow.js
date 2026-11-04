// Christmas Night: falling snow, a tree with twinkling lights, and snow piling up.

const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");

let width = 0;
let height = 0;
let groundY = 0;         // top of the ground, in pixels
let flakes = [];         // falling snowflakes
let lights = [];         // the tree's lights, as fractions of the tree's size
let pile = [];           // extra snow height on the ground, one entry per column
const PILE_STEP = 8;     // width of one pile column, in pixels
const PILE_MAX = 60;     // tallest the pile can grow, in pixels
let lightsOn = true;

const LIGHT_COLORS = ["#ff4d4d", "#ffd84d", "#4dff88", "#4db8ff", "#ff7de9"];

function random(min, max) {
  return min + Math.random() * (max - min);
}

function makeFlake(x, y) {
  const size = random(1.5, 4);
  return {
    x: x,
    y: y,
    size: size,
    speed: size * random(0.35, 0.6),   // bigger flakes fall faster
    drift: random(0, Math.PI * 2),     // phase of the side-to-side sway
  };
}

// Size the canvas to the window, and rebuild anything that depends on its size.
function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
  groundY = height * 0.82;
  pile = new Array(Math.ceil(width / PILE_STEP) + 1).fill(0);
  const count = Math.round((width * height) / 4000);
  flakes = [];
  for (let i = 0; i < count; i++) {
    flakes.push(makeFlake(random(0, width), random(0, height)));
  }
}

// Place lights along the tree once. Each light is (u, v): v from 0 (top) to 1 (bottom),
// u from -1 (left edge of the tree at that height) to 1 (right edge).
function makeLights() {
  lights = [];
  for (let i = 0; i < 40; i++) {
    lights.push({
      u: random(-0.85, 0.85),
      v: random(0.12, 0.95),
      color: LIGHT_COLORS[i % LIGHT_COLORS.length],
      phase: random(0, Math.PI * 2),
      rate: random(1.5, 4),
    });
  }
}

// The tree's position and size, worked out from the window size.
function treeShape() {
  const treeHeight = height * 0.55;
  return {
    x: width / 2,
    top: groundY - treeHeight,
    height: treeHeight,
    halfWidth: treeHeight * 0.38,
  };
}

function drawSky() {
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, "#050a1f");
  sky.addColorStop(1, "#1b2d5a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, groundY);

  // The moon, with a soft glow.
  const mx = width * 0.82;
  const my = height * 0.16;
  const glow = ctx.createRadialGradient(mx, my, 10, mx, my, 120);
  glow.addColorStop(0, "rgba(255, 250, 220, 0.35)");
  glow.addColorStop(1, "rgba(255, 250, 220, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(mx - 120, my - 120, 240, 240);
  ctx.fillStyle = "#fff8dc";
  ctx.beginPath();
  ctx.arc(mx, my, 38, 0, Math.PI * 2);
  ctx.fill();
}

function drawGround() {
  ctx.fillStyle = "#e8eef8";
  ctx.beginPath();
  ctx.moveTo(0, height);
  for (let i = 0; i < pile.length; i++) {
    ctx.lineTo(i * PILE_STEP, groundY - pile[i]);
  }
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();
}

function drawTree(time) {
  const t = treeShape();

  // Trunk.
  ctx.fillStyle = "#5a3a22";
  ctx.fillRect(t.x - t.halfWidth * 0.12, groundY - t.height * 0.1, t.halfWidth * 0.24, t.height * 0.12);

  // Three overlapping triangles of branches, darkest at the back.
  const layers = [
    { top: 0.0, bottom: 0.45, width: 0.55, color: "#1f6b3a" },
    { top: 0.2, bottom: 0.7, width: 0.78, color: "#1a5e33" },
    { top: 0.42, bottom: 0.92, width: 1.0, color: "#15512b" },
  ];
  for (const layer of layers.slice().reverse()) {
    ctx.fillStyle = layer.color;
    ctx.beginPath();
    ctx.moveTo(t.x, t.top + t.height * layer.top);
    ctx.lineTo(t.x - t.halfWidth * layer.width, t.top + t.height * layer.bottom);
    ctx.lineTo(t.x + t.halfWidth * layer.width, t.top + t.height * layer.bottom);
    ctx.closePath();
    ctx.fill();
  }

  // Lights: each one brightens and dims on its own rhythm.
  for (const light of lights) {
    const ly = t.top + t.height * 0.92 * light.v;
    const lx = t.x + light.u * t.halfWidth * light.v;
    const brightness = lightsOn ? 0.55 + 0.45 * Math.sin(time * light.rate + light.phase) : 0;
    ctx.globalAlpha = 0.25 + 0.75 * brightness;
    ctx.fillStyle = lightsOn ? light.color : "#3a3a3a";
    if (lightsOn) {
      ctx.shadowColor = light.color;
      ctx.shadowBlur = 14 * brightness;
    }
    ctx.beginPath();
    ctx.arc(lx, ly, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;

  drawStar(t.x, t.top - 6, 26, time);
}

function drawStar(cx, cy, radius, time) {
  const pulse = lightsOn ? 0.8 + 0.2 * Math.sin(time * 2) : 0.4;
  ctx.fillStyle = lightsOn ? "#ffe066" : "#8a7a40";
  ctx.shadowColor = "#ffe066";
  ctx.shadowBlur = lightsOn ? 30 * pulse : 0;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? radius * pulse : radius * 0.45 * pulse;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
}

// Move every flake. A flake that reaches the snow adds a little to the pile there,
// then starts again above the top of the window.
function updateFlakes(time) {
  for (const f of flakes) {
    f.y += f.speed;
    f.x += Math.sin(time + f.drift) * 0.4;
    if (f.x < 0) f.x += width;
    if (f.x > width) f.x -= width;

    const column = Math.floor(f.x / PILE_STEP);
    if (f.y >= groundY - pile[column]) {
      pile[column] = Math.min(PILE_MAX, pile[column] + f.size * 0.02);
      f.y = random(-50, -5);
      f.x = random(0, width);
    }
  }
  // Smooth the pile so it forms gentle drifts instead of spikes.
  for (let i = 1; i < pile.length - 1; i++) {
    pile[i] = (pile[i - 1] + pile[i] * 2 + pile[i + 1]) / 4;
  }
}

function drawFlakes() {
  ctx.fillStyle = "#ffffff";
  for (const f of flakes) {
    ctx.globalAlpha = 0.5 + f.size / 8;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function frame(ms) {
  const time = ms / 1000;
  updateFlakes(time);
  drawSky();
  drawTree(time);
  drawGround();
  drawFlakes();
  requestAnimationFrame(frame);
}

// A click adds a burst of snow around the pointer.
canvas.addEventListener("click", (event) => {
  canvas.focus();
  for (let i = 0; i < 40; i++) {
    flakes.push(makeFlake(event.clientX + random(-60, 60), event.clientY + random(-30, 30)));
  }
  // Keep the number of flakes from growing forever.
  if (flakes.length > 1500) flakes.splice(0, flakes.length - 1500);
});

// Space turns the tree lights on and off.
window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    lightsOn = !lightsOn;
  }
});

window.addEventListener("resize", resize);
resize();
makeLights();
requestAnimationFrame(frame);

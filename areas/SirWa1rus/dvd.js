// The DVD logo bounces around the screen and changes color each time it hits
// an edge. Hitting a corner exactly flashes the screen and adds to the count.

const canvas = document.getElementById("screen");
const ctx = canvas.getContext("2d");
const cornersText = document.getElementById("corners");

// The PNG is 320x320, but the visible logo only fills this box inside it.
const CROP = { x: 16, y: 96, w: 288, h: 127 };

const logo = new Image();
logo.src = "./dvd-logo.png";

// A small canvas holding the logo painted in the current color.
const tinted = document.createElement("canvas");
const tctx = tinted.getContext("2d");

const dvd = { x: 50, y: 50, vx: 1, vy: 1, w: 0, h: 0, hue: 0 };
let speed = 3;
let paused = false;
let corners = 0;
let flash = 0;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  dvd.w = Math.round(canvas.width * 0.2);
  dvd.h = Math.round(dvd.w * CROP.h / CROP.w);
  dvd.x = Math.min(dvd.x, canvas.width - dvd.w);
  dvd.y = Math.min(dvd.y, canvas.height - dvd.h);
  tint();
}

// Paint the black logo in a new color: draw the logo, then fill over it with
// "source-in", which keeps only the pixels where the logo already is.
function tint() {
  tinted.width = dvd.w;
  tinted.height = dvd.h;
  if (!logo.complete) return;
  tctx.drawImage(logo, CROP.x, CROP.y, CROP.w, CROP.h, 0, 0, dvd.w, dvd.h);
  tctx.globalCompositeOperation = "source-in";
  tctx.fillStyle = `hsl(${dvd.hue}, 100%, 55%)`;
  tctx.fillRect(0, 0, dvd.w, dvd.h);
  tctx.globalCompositeOperation = "source-over";
}

function newColor() {
  dvd.hue = (dvd.hue + 60 + Math.random() * 240) % 360;
  tint();
}

function move() {
  dvd.x += dvd.vx * speed;
  dvd.y += dvd.vy * speed;

  let hitX = false;
  let hitY = false;
  if (dvd.x <= 0 || dvd.x + dvd.w >= canvas.width) {
    dvd.vx = -dvd.vx;
    dvd.x = Math.max(0, Math.min(dvd.x, canvas.width - dvd.w));
    hitX = true;
  }
  if (dvd.y <= 0 || dvd.y + dvd.h >= canvas.height) {
    dvd.vy = -dvd.vy;
    dvd.y = Math.max(0, Math.min(dvd.y, canvas.height - dvd.h));
    hitY = true;
  }

  if (hitX || hitY) newColor();
  if (hitX && hitY) {
    corners++;
    cornersText.textContent = `Corner hits: ${corners}`;
    flash = 30;
  }
}

function step() {
  if (!paused) move();

  ctx.fillStyle = flash > 0 ? `hsla(${dvd.hue}, 100%, 50%, ${flash / 60})` : "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (flash > 0) flash--;

  ctx.drawImage(tinted, Math.round(dvd.x), Math.round(dvd.y));
  requestAnimationFrame(step);
}

canvas.addEventListener("click", newColor);

window.addEventListener("keydown", (e) => {
  if (e.key === " ") {
    paused = !paused;
    e.preventDefault();
  } else if (e.key === "ArrowUp") {
    speed = Math.min(speed + 1, 12);
    e.preventDefault();
  } else if (e.key === "ArrowDown") {
    speed = Math.max(speed - 1, 1);
    e.preventDefault();
  }
});

window.addEventListener("resize", resize);
logo.addEventListener("load", tint);
resize();
requestAnimationFrame(step);


/* ── SOMEWHERE — app.js ── */

const THEMES = {
  sky:   { tagline:'Some thoughts were meant to fly.', send:'release into the wind', receiveLabel:'Catch one from the sky', sendIcon:'✈', sendLabel:'Fold a plane', caption:'Carried by the wind.', rcCaption:'Something is drifting your way…', readNote:'This found its way to you.', prompt:'Write something the world can carry.' },
  rain:  { tagline:'Not every feeling needs to stay with you.', send:'set it afloat', receiveLabel:'Catch a drifting boat', sendIcon:'◌', sendLabel:'Fold a boat', caption:'Somewhere, someone may find this.', rcCaption:'A boat drifts toward you…', readNote:'The rain carried this here.', prompt:'Leave something behind.' },
  ocean: { tagline:'The sea remembers everything.', send:'cast it to sea', receiveLabel:'Find a bottle', sendIcon:'⊛', sendLabel:'Seal a bottle', caption:'The sea remembers.', rcCaption:'A bottle washes ashore…', readNote:'The tide brought this to you.', prompt:'A stranger may find this.' },
  night: { tagline:'Some lights travel very far.', send:'release the lantern', receiveLabel:'Catch a light', sendIcon:'◉', sendLabel:'Light a lantern', caption:'A wandering light reached you.', rcCaption:'A lantern descends toward you…', readNote:'The night carries it gently.', prompt:'Write something worth carrying through the dark.' }
};

const PARTICLE = {
  sky:   (ctx,W,H,ps) => { ps.forEach(p=>{ p.y-=p.s*0.3; p.x+=Math.sin(p.t)*0.3; p.t+=0.01; if(p.y<0)p.y=H; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle=`rgba(255,255,255,${p.a})`; ctx.fill(); }); },
  rain:  (ctx,W,H,ps) => { ctx.strokeStyle='rgba(140,180,215,0.3)'; ctx.lineWidth=1; ps.forEach(p=>{ p.y+=p.s*4; p.x+=0.5; if(p.y>H){p.y=0;p.x=Math.random()*W;} ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x+3,p.y+12); ctx.stroke(); }); },
  ocean: (ctx,W,H,ps) => { ps.forEach(p=>{ p.x+=p.s*0.4; p.y+=Math.sin(p.t)*0.3; p.t+=0.02; if(p.x>W)p.x=0; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle=`rgba(80,165,205,${p.a})`; ctx.fill(); }); },
  night: (ctx,W,H,ps) => { ps.forEach(p=>{ p.a=0.3+0.5*Math.abs(Math.sin(p.t)); p.t+=0.02*p.s; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle=`rgba(255,230,120,${p.a})`; ctx.fill(); }); }
};

// ── State ──
let currentTheme = 'sky';
let menuOpen = false;
let currentScreen = 'landing';
let particles = [];
let animFrame;
let sendAnimFrame, rcAnimFrame;
let rcMessage = null;
let sendAnimT = 0, rcAnimT = 0;
let rcReady = false;
let isLettingGo = false;

const LANTERN_SEND_FRAMES = 340;
const LANTERN_RECEIVE_FRAMES = 280;
const LANTERN_START_DELAY = 850;
const BOTTLE_SEND_FRAMES = 360;
const BOTTLE_RECEIVE_FRAMES = 320;
const LETGO_FRAMES = 190;

function easeInOutSine(p) {
  return -(Math.cos(Math.PI * p) - 1) / 2;
}

// ── DOM ──
const body = document.body;
const screens = { landing: document.getElementById('screen-landing'), write: document.getElementById('screen-write'), sending: document.getElementById('screen-sending'), receiving: document.getElementById('screen-receiving'), read: document.getElementById('screen-read') };
const atmoCanvas = document.getElementById('atmo-canvas');
const sendCanvas = document.getElementById('send-canvas');
const rcCanvas   = document.getElementById('receive-canvas');
const atmoCtx = atmoCanvas.getContext('2d');
const sendCtx = sendCanvas.getContext('2d');
const rcCtx   = rcCanvas.getContext('2d');

// ── Resize canvas ──
function resizeCanvases() {
  [atmoCanvas, sendCanvas, rcCanvas].forEach(c => { c.width = window.innerWidth; c.height = window.innerHeight; });
}
window.addEventListener('resize', resizeCanvases);
resizeCanvases();

// ── Init particles ──
function initParticles(theme) {
  particles = [];
  const W = window.innerWidth, H = window.innerHeight;
  const count = theme === 'rain' ? 120 : theme === 'night' ? 80 : 50;
  for (let i = 0; i < count; i++) {
    particles.push({ x: Math.random()*W, y: Math.random()*H, s: Math.random()*0.8+0.2, r: Math.random()*2+0.5, a: Math.random()*0.5+0.15, t: Math.random()*Math.PI*2 });
  }
}

// ── Atmosphere loop ──
function atmoLoop() {
  const W = atmoCanvas.width, H = atmoCanvas.height;
  atmoCtx.clearRect(0, 0, W, H);
  PARTICLE[currentTheme]?.(atmoCtx, W, H, particles);
  animFrame = requestAnimationFrame(atmoLoop);
}

// ── Screen transition ──
function goTo(name) {
  const prev = screens[currentScreen];
  const next = screens[name];
  if (prev) { prev.classList.remove('active'); prev.classList.add('fade-out'); setTimeout(() => prev.classList.remove('fade-out'), 1400); }
  setTimeout(() => { next.classList.add('active'); currentScreen = name; }, 150);
}

// ── Theme switch ──
function setTheme(t) {
  if (!THEMES[t]) t = 'sky';
  currentTheme = t;
  body.className = `theme-${t}`;
  const cfg = THEMES[t];
  document.getElementById('landing-tagline').textContent = cfg.tagline;
  document.getElementById('send-label').textContent = cfg.sendLabel;
  document.getElementById('send-icon').textContent = cfg.sendIcon;
  document.getElementById('receive-label').textContent = cfg.receiveLabel;
  document.getElementById('release-label').textContent = cfg.send;
  document.getElementById('write-prompt').textContent = cfg.prompt;
  document.getElementById('msg-input').placeholder = 'A stranger may someday read this…';
  document.getElementById('send-caption').textContent = cfg.caption;
  document.getElementById('receive-caption').textContent = cfg.rcCaption;
  document.getElementById('read-note').textContent = cfg.readNote;
  document.querySelectorAll('.theme-opt').forEach(b => b.classList.toggle('active', b.dataset.theme === t));
  initParticles(t);
  closeMenu();
}

// ── Theme menu ──
const themeToggle = document.getElementById('theme-toggle');
const themeMenu   = document.getElementById('theme-menu');
function openMenu()  { menuOpen = true;  themeMenu.classList.add('open'); themeToggle.setAttribute('aria-expanded','true'); }
function closeMenu() { menuOpen = false; themeMenu.classList.remove('open'); themeToggle.setAttribute('aria-expanded','false'); }
themeToggle.addEventListener('click', e => { e.stopPropagation(); menuOpen ? closeMenu() : openMenu(); });
document.querySelectorAll('.theme-opt').forEach(btn => btn.addEventListener('click', () => setTheme(btn.dataset.theme)));
document.addEventListener('click', closeMenu);

// ── Char count ──
const msgInput = document.getElementById('msg-input');
const charLeft = document.getElementById('char-left');
msgInput.addEventListener('input', () => { charLeft.textContent = 500 - msgInput.value.length; });

// ── Messages (API Endpoints) ──
async function saveMessage(text, theme) {
  try {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, theme })
    });
    const data = await res.json();
    if (!data.success) {
      console.error('Failed to save message:', data.error);
    }
    updateStatsDisplay();
  } catch (err) {
    console.error('Error saving message:', err);
  }
}

async function fetchRandomMessage(theme) {
  try {
    const res = await fetch(`/api/messages/random?theme=${theme}`);
    const data = await res.json();
    if (data.success && data.message) {
      rcMessage = data.message;
    } else {
      rcMessage = null;
    }
  } catch (err) {
    console.error('Error fetching random message:', err);
    rcMessage = null;
  }
}

async function updateStatsDisplay() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    if (data.success && data.stats) {
      const statsText = document.getElementById('stats-text');
      if (statsText) {
        statsText.textContent = `${data.stats.total} thoughts floating in the atmosphere`;
        statsText.style.opacity = '0.6';
      }
    }
  } catch (err) {
    console.error('Error fetching stats:', err);
  }
}

// ── SEND ANIMATION ──
function drawSendFrame(theme, t, W, H) {
  sendCtx.clearRect(0, 0, W, H);
  const travelFrames = isLettingGo ? LETGO_FRAMES : theme === 'night' ? LANTERN_SEND_FRAMES : theme === 'ocean' ? BOTTLE_SEND_FRAMES : 180;
  const prog = Math.min(t / travelFrames, 1);
  const ease = 1 - Math.pow(1 - prog, 3);

  if (theme === 'sky') {
    if (isLettingGo) {
      const floatEase = easeInOutSine(prog);
      const sx = W * 0.5, sy = H * 0.42;
      const ex = W * 1.28, ey = -H * 0.22;
      const lift = Math.sin(floatEase * Math.PI) * H * 0.08;
      const px = sx + floatEase * (ex - sx);
      const py = sy + floatEase * (ey - sy) - lift;
      const angle = Math.atan2(ey - sy - lift * 0.35, ex - sx);
      drawPlane(sendCtx, px, py, 1.25 * (1 - floatEase * 0.42), angle);
    } else {
      const FOLD_END = 72;
      if (t < FOLD_END) {
        drawFoldingPage(sendCtx, W / 2, H * 0.48, t / FOLD_END);
      } else {
        const fp = Math.min((t - FOLD_END) / (180 - FOLD_END), 1);
        const fe = 1 - Math.pow(1 - fp, 2);
        const sx = W * 0.5, sy = H * 0.48;
        const ex = W * 1.35, ey = -H * 0.25;
        const px = sx + fe * (ex - sx);
        const py = sy + fe * (ey - sy);
        const angle = Math.atan2(ey - sy, ex - sx);
        drawPlane(sendCtx, px, py, 1.3 * (1 - fe * 0.5), angle);
      }
    }
  } else if (theme === 'rain') {
    const FOLD_END = 85;
    const waterY = H * 0.75;
    drawPuddle(sendCtx, W, H, t, waterY);
    drawRain(sendCtx, W, H, 0.32);
    if (isLettingGo) {
      const bx = W * 0.5 + ease * W * 0.6;
      const bob = Math.sin(t * 0.05) * 4;
      drawBoat(sendCtx, bx, waterY - 5 + bob, 1.4 * (1 - ease * 0.3));
    } else {
      if (t < FOLD_END) {
        drawFoldingBoat(sendCtx, W / 2, H * 0.55, t / FOLD_END, 1.4);
      } else {
        const fp = Math.min((t - FOLD_END) / 400, 1); 
        const fe = 1 - Math.pow(1 - fp, 2.2);
        const bx = W * 0.5 + fe * W * 0.4;
        const bob = Math.sin(t * 0.05) * 4;
        drawBoat(sendCtx, bx, waterY - 5 + bob, 1.4 * (1 - fe * 0.2));
      }
    }
  } else if (theme === 'ocean') {
    let x, scale, tiltDir;
    const driftEase = easeInOutSine(prog);
    if (isLettingGo) {
      x = W * 0.6 - driftEase * W * 0.8;
      scale = 0.9 - driftEase * 0.4;
      tiltDir = -1;
    } else {
      x = W * 0.35 + driftEase * W * 0.8;
      scale = 1 - driftEase * 0.5;
      tiltDir = 1;
    }
    const y = H * 0.68 + Math.sin(x * 0.012 + t * 0.018) * 8;
    drawBottle(sendCtx, x, y, scale, t, tiltDir);
    drawWaves(sendCtx, W, H, t);
  } else {
    const floatEase = easeInOutSine(prog);
    const sway = Math.sin(t * 0.018) * 16 + Math.sin(t * 0.007) * 8;
    const x = W / 2 + sway;
    const startY = isLettingGo ? H * 0.52 : H * 0.62;
    const endY = isLettingGo ? -H * 0.18 : -H * 0.26;
    const y = startY + floatEase * (endY - startY);
    const scale = 1 - floatEase * 0.34;
    drawLantern(sendCtx, x, y, scale, t);
  }

  let duration = 200;
  if (isLettingGo) duration = LETGO_FRAMES;
  else if (theme === 'rain') duration = 350;
  else if (theme === 'ocean') duration = BOTTLE_SEND_FRAMES;
  else if (theme === 'night') duration = LANTERN_SEND_FRAMES;
  
  if (t < duration) { sendAnimT++; sendAnimFrame = requestAnimationFrame(() => drawSendFrame(theme, sendAnimT, W, H)); }
  else {
    setTimeout(() => {
      cancelAnimationFrame(sendAnimFrame);
      goTo('landing');
      let msg = 'the world';
      if (currentTheme === 'sky') msg = 'the sky';
      else if (currentTheme === 'night') msg = 'the lanternlight';
      showToast('released into ' + msg);
    }, 600);
  }
}

// ── RECEIVE ANIMATION ──
function drawRcFrame(theme, t, W, H) {
  rcCtx.clearRect(0, 0, W, H);
  const travelFrames = theme === 'night' ? LANTERN_RECEIVE_FRAMES : theme === 'ocean' ? BOTTLE_RECEIVE_FRAMES : 120;
  const prog = Math.min(t / travelFrames, 1);
  const ease = 1 - Math.pow(1 - prog, 3);

  if (theme === 'sky') {
    const startX = W * 1.15, startY = -50;
    const endX = W * 0.5,   endY = H * 0.35;
    const px = startX + ease * (endX - startX);
    const py = startY + ease * (endY - startY);
    const travelAngle = Math.atan2(endY - startY, endX - startX);
    drawPlane(rcCtx, px, py, 1.25, travelAngle);
  } else if (theme === 'rain') {
    const waterY = H * 0.75;
    drawPuddle(rcCtx, W, H, t, waterY);
    drawRain(rcCtx, W, H, 0.32);
    
    // Slow drift into view
    const fp = Math.min(t / 200, 1);
    const fe = 1 - Math.pow(1 - fp, 1.5); // Slower easing
    const bx = -100 + fe * (W * 0.5 + 100);
    const bob = Math.sin(t * 0.05) * 4;
    
    drawBoat(rcCtx, bx, waterY - 5 + bob, 1.4);
  } else if (theme === 'ocean') {
    const driftEase = easeInOutSine(prog);
    const x = W * 1.1 - driftEase * W * 0.5;
    const y = H * 0.68 + Math.sin(x * 0.012 + t * 0.018) * 8;
    drawBottle(rcCtx, x, y, 0.9, t);
    drawWaves(rcCtx, W, H, t);
  } else {
    const floatEase = easeInOutSine(prog);
    const sway = Math.sin(t * 0.018) * 14 + Math.sin(t * 0.006) * 7;
    const x = W / 2 + sway;
    const y = -90 + floatEase * (H * 0.62);
    const scale = 0.72 + floatEase * 0.18;
    drawLantern(rcCtx, x, y, scale, t);
  }

  const duration = theme === 'rain' ? 300 : theme === 'ocean' ? BOTTLE_RECEIVE_FRAMES : theme === 'night' ? LANTERN_RECEIVE_FRAMES : 130;
  if (t < duration) { rcAnimT++; rcAnimFrame = requestAnimationFrame(() => drawRcFrame(theme, rcAnimT, W, H)); }
  else if (!rcReady) {
    rcReady = true;
    const tapBtn = document.getElementById('tap-open');
    const landX = rcCanvas.width * 0.5;
    let landY;
    if (theme === 'rain') landY = H * 0.75 - 130;
    else if (theme === 'ocean') landY = H * 0.68 - 150;
    else if (theme === 'night') landY = Math.max(H * 0.42, H * 0.62 - 5);
    else landY = H * 0.35 + 90; // sky
    
    tapBtn.style.left = landX + 'px';
    tapBtn.style.top  = landY + 'px';
    tapBtn.style.display = 'block';
    requestAnimationFrame(() => { tapBtn.style.opacity = '1'; });
    tapBtn.addEventListener('click', openMessage, { once: true });
  }
}

// ── Drawing helpers ──
function drawPlane(ctx, x, y, scale, angle) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(248,244,238,0.96)';
  ctx.strokeStyle = 'rgba(165,148,128,0.55)';
  ctx.lineWidth = 1;
  // Right wing (top)
  ctx.beginPath(); ctx.moveTo(52,0); ctx.lineTo(-28,-22); ctx.lineTo(-12,0); ctx.closePath(); ctx.fill(); ctx.stroke();
  // Left wing (bottom)
  ctx.beginPath(); ctx.moveTo(52,0); ctx.lineTo(-28, 22); ctx.lineTo(-12,0); ctx.closePath(); ctx.fill(); ctx.stroke();
  // Center crease
  ctx.beginPath(); ctx.moveTo(52,0); ctx.lineTo(-12,0); ctx.strokeStyle='rgba(145,128,108,0.4)'; ctx.stroke();
  ctx.restore();
}
function drawFoldingPage(ctx, cx, cy, progress) {
  ctx.save(); ctx.translate(cx, cy);
  const p = Math.min(progress, 1);
  ctx.fillStyle = 'rgba(248,244,238,0.95)';
  ctx.strokeStyle = 'rgba(165,148,128,0.55)';
  ctx.lineWidth = 1.2;
  if (p < 0.38) {
    // Flat paper with fold lines appearing
    const fp = p / 0.38;
    const W2 = 72, H2 = 52;
    ctx.beginPath(); ctx.rect(-W2/2, -H2/2, W2, H2); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.strokeStyle = `rgba(155,135,110,${fp*0.5})`; ctx.lineWidth=0.8; ctx.setLineDash([5,4]);
    ctx.beginPath(); ctx.moveTo(-W2/2, 0); ctx.lineTo(W2/2, -H2/2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-W2/2, 0); ctx.lineTo(W2/2,  H2/2); ctx.stroke();
    ctx.restore();
  } else if (p < 0.78) {
    // Morphing rect → plane
    const tp = (p - 0.38) / 0.40;
    const te = 1 - Math.pow(1 - tp, 2);
    const nX = 20 + te*32, topX = -36+te*8, topY = -26+te*4, dipX=-12;
    ctx.beginPath(); ctx.moveTo(nX,0); ctx.lineTo(topX,topY); ctx.lineTo(dipX,0); ctx.lineTo(topX,-topY); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(nX,0); ctx.lineTo(dipX,0); ctx.strokeStyle='rgba(145,128,108,0.35)'; ctx.stroke();
  } else {
    // Full plane
    ctx.beginPath(); ctx.moveTo(52,0); ctx.lineTo(-28,-22); ctx.lineTo(-12,0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(52,0); ctx.lineTo(-28, 22); ctx.lineTo(-12,0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(52,0); ctx.lineTo(-12,0); ctx.strokeStyle='rgba(145,128,108,0.35)'; ctx.stroke();
  }
  ctx.restore();
}
function drawBoat(ctx, x, y, scale) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(240,235,225,0.88)'; ctx.strokeStyle = 'rgba(170,155,130,0.5)'; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(-28,0); ctx.lineTo(28,0); ctx.lineTo(18,16); ctx.lineTo(-18,16); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-4,0); ctx.lineTo(-4,-26); ctx.lineTo(16,0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawBottle(ctx, x, y, scale, t = 0, tiltDir = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.rotate((0.45 * tiltDir) + Math.sin(t * 0.022) * 0.08); // Tilted and slowly bobbing
  
  // Base glass styling
  ctx.fillStyle = 'rgba(80,180,210,0.25)'; 
  ctx.strokeStyle = 'rgba(120,200,230,0.8)'; 
  ctx.lineWidth = 2;
  
  // Slim Bottle path
  ctx.beginPath();
  ctx.moveTo(-10, 25);
  ctx.bezierCurveTo(-12, -5, -6, -10, -4, -20);
  ctx.lineTo(-4, -30);
  ctx.lineTo(4, -30);
  ctx.lineTo(4, -20);
  ctx.bezierCurveTo(6, -10, 12, -5, 10, 25);
  ctx.bezierCurveTo(8, 30, -8, 30, -10, 25);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  
  // A tiny rolled paper inside
  ctx.fillStyle = 'rgba(240, 230, 210, 0.9)';
  ctx.beginPath();
  ctx.ellipse(0, 5, 5, 15, 0.2, 0, Math.PI*2); // slightly tilted
  ctx.fill();
  ctx.strokeStyle = 'rgba(180, 160, 140, 0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Highlight/reflection on the glass
  ctx.beginPath();
  ctx.moveTo(-6, 20);
  ctx.bezierCurveTo(-8, 5, -4, -8, -2, -20);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Cork
  ctx.fillStyle = 'rgba(160,110,70,0.9)';
  ctx.beginPath(); 
  ctx.moveTo(-5, -30);
  ctx.lineTo(5, -30);
  ctx.lineTo(6, -38);
  ctx.lineTo(-6, -38);
  ctx.closePath();
  ctx.fill();
  
  // Cork detail (top curve)
  ctx.beginPath();
  ctx.ellipse(0, -38, 6, 2, 0, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(180,130,90,0.9)';
  ctx.fill();

  ctx.restore();
}
function drawLantern(ctx, x, y, scale, t = 0) {
  ctx.save(); 
  ctx.translate(x, y); 
  ctx.scale(scale * 1.5, scale * 1.5); // Increase size a little
  
  // Gentle paper-lantern wobble.
  ctx.rotate(Math.sin(t * 0.025) * 0.035 + Math.sin(t * 0.011) * 0.018);

  // Lantern paper body
  ctx.beginPath();
  ctx.moveTo(-16, 25);
  ctx.bezierCurveTo(-32, 10, -32, -20, -22, -35);
  ctx.bezierCurveTo(-10, -42, 10, -42, 22, -35);
  ctx.bezierCurveTo(32, -20, 32, 10, 16, 25);
  ctx.bezierCurveTo(10, 29, -10, 29, -16, 25); 
  ctx.closePath();

  // Gradient for the paper
  const paperGrd = ctx.createRadialGradient(0, 20, 5, 0, 0, 50);
  paperGrd.addColorStop(0, 'rgba(255, 180, 50, 0.95)');
  paperGrd.addColorStop(0.5, 'rgba(255, 110, 20, 0.9)');
  paperGrd.addColorStop(1, 'rgba(220, 60, 10, 0.85)');
  ctx.fillStyle = paperGrd;
  ctx.fill();
  
  // Vertical paper seams/creases for realism
  ctx.strokeStyle = 'rgba(180, 50, 0, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-9, 27); ctx.bezierCurveTo(-14, 5, -14, -20, -9, -38); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 28); ctx.bezierCurveTo(0, 5, 0, -20, 0, -40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(9, 27); ctx.bezierCurveTo(14, 5, 14, -20, 9, -38); ctx.stroke();

  // The bottom opening (inner dark part)
  ctx.beginPath();
  ctx.ellipse(0, 26, 16, 4, 0, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(60, 20, 0, 0.8)';
  ctx.fill();
  
  // Wire rim
  ctx.strokeStyle = 'rgba(40, 15, 0, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Flame inside the opening
  const flicker = 0.84 + Math.sin(t * 0.17) * 0.08 + Math.sin(t * 0.071) * 0.04;
  const flameGrd = ctx.createRadialGradient(0, 24, 1, 0, 24, 12);
  flameGrd.addColorStop(0, `rgba(255, 255, 255, ${flicker})`);
  flameGrd.addColorStop(0.3, `rgba(255, 200, 50, ${flicker})`);
  flameGrd.addColorStop(1, 'rgba(255, 100, 0, 0)');
  ctx.fillStyle = flameGrd;
  ctx.beginPath(); ctx.arc(0, 24, 12, 0, Math.PI*2); ctx.fill();

  // Flame core
  ctx.fillStyle = `rgba(255, 240, 150, ${flicker})`;
  ctx.beginPath();
  const flameTip = 18 - (Math.sin(t * 0.21) + 1) * 2.2;
  ctx.moveTo(0, flameTip);
  ctx.bezierCurveTo(3, 22, 4, 25, 0, 26);
  ctx.bezierCurveTo(-4, 25, -3, 22, 0, flameTip);
  ctx.fill();

  // Outer ambient glow
  ctx.globalCompositeOperation = 'screen';
  const ambientGrd = ctx.createRadialGradient(0, 10, 25, 0, 10, 80);
  ambientGrd.addColorStop(0, 'rgba(255, 140, 40, 0.4)');
  ambientGrd.addColorStop(1, 'rgba(255, 80, 10, 0)');
  ctx.fillStyle = ambientGrd;
  ctx.beginPath(); ctx.arc(0, 10, 80, 0, Math.PI*2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  ctx.restore();
}
function drawRain(ctx, W, H, alpha) {
  ctx.save(); ctx.strokeStyle = `rgba(140,180,215,${alpha})`; ctx.lineWidth = 1;
  for (let i = 0; i < 40; i++) {
    const rx = Math.random() * W, ry = Math.random() * H;
    ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + 3, ry + 12); ctx.stroke();
  }
  ctx.restore();
}
function drawWaves(ctx, W, H, t) {
  ctx.save(); ctx.strokeStyle = 'rgba(100,180,220,0.2)'; ctx.lineWidth = 1.5;
  for (let w = 0; w < 3; w++) {
    ctx.beginPath();
    for (let x = 0; x < W; x += 5) {
      const y = H * 0.68 + Math.sin(x * 0.015 + t * 0.04 + w) * 8;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}
function drawPuddle(ctx, W, H, t, waterY) {
  ctx.save();
  const cy = waterY ?? H * 0.75;
  const puddleH = H - cy + 20; // Extend to bottom
  
  // Base water - dark, slightly reflective
  const grd = ctx.createLinearGradient(0, cy - 20, 0, H);
  grd.addColorStop(0, 'rgba(25, 35, 50, 0.0)');
  grd.addColorStop(0.1, 'rgba(25, 35, 50, 0.8)'); // Sharp edge
  grd.addColorStop(1, 'rgba(15, 20, 30, 0.95)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, cy - 20, W, puddleH + 20);

  // Distant reflections / lighter patches
  ctx.fillStyle = 'rgba(60, 90, 120, 0.15)';
  ctx.beginPath(); ctx.ellipse(W * 0.3, cy + 30, W * 0.4, 20, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(W * 0.8, cy + 50, W * 0.3, 30, 0, 0, Math.PI*2); ctx.fill();

  // Dynamic ripples from raindrops
  // Use pseudo-random deterministic positions based on time
  for(let i=0; i<8; i++) {
     // Each ripple lasts ~100 frames. Offset them in time.
     const phase = ((t + i * 45) % 150) / 150; 
     
     // Random-ish position that stays fixed for the duration of the ripple
     const cycleId = Math.floor((t + i * 45) / 150);
     const pseudoRandX = Math.sin(cycleId * 12.34 + i) * 0.5 + 0.5; // 0 to 1
     const pseudoRandY = Math.cos(cycleId * 56.78 + i) * 0.5 + 0.5; // 0 to 1
     
     const rx = W * 0.1 + pseudoRandX * W * 0.8;
     const ry = cy + 10 + pseudoRandY * (puddleH - 20);
     
     if (phase > 0 && phase < 1) {
         // Concentric rings
         for(let ring=0; ring<3; ring++) {
             const ringPhase = phase - (ring * 0.08);
             if (ringPhase > 0) {
                 const maxRadius = 40 + pseudoRandY * 40; // closer ones are bigger
                 const radius = ringPhase * maxRadius;
                 // Alpha fades out as it grows, and outer rings are fainter
                 const alpha = (1 - ringPhase) * 0.4 * (1 - ring*0.2);
                 
                 ctx.strokeStyle = `rgba(140, 180, 220, ${alpha})`;
                 ctx.lineWidth = 1.5 - (ringPhase * 1.0);
                 
                 ctx.beginPath();
                 // Perspective squish: height is ~25% of width
                 ctx.ellipse(rx, ry, radius, radius * 0.25, 0, 0, Math.PI*2);
                 ctx.stroke();
             }
         }
     }
  }
  ctx.restore();
}
function drawFoldingBoat(ctx, cx, cy, progress, scale=1) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(scale, scale);
  const p = Math.min(progress, 1);
  ctx.fillStyle = 'rgba(245,240,230,0.95)';
  ctx.strokeStyle = 'rgba(160,142,120,0.6)';
  ctx.lineWidth = 1.2;
  if (p < 0.33) {
    // Flat paper + diagonal fold lines
    const fp = p / 0.33;
    const W2 = 74, H2 = 54;
    ctx.beginPath(); ctx.rect(-W2/2, -H2/2, W2, H2); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.strokeStyle = `rgba(145,125,100,${fp*0.55})`; ctx.lineWidth=0.85; ctx.setLineDash([4,4]);
    ctx.beginPath(); ctx.moveTo(-W2/2, H2/6); ctx.lineTo(W2/2, H2/6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -H2/2); ctx.lineTo(-W2/2, H2/2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -H2/2); ctx.lineTo( W2/2, H2/2); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
  } else if (p < 0.72) {
    // Morphing rect → hull + rising sail
    const tp = (p - 0.33) / 0.39;
    const te = 1 - Math.pow(1 - tp, 2);
    const hW = 34 - te*6, taper = te*12, hH = 14 + te*6;
    ctx.beginPath();
    ctx.moveTo(-hW, 0); ctx.lineTo(hW, 0);
    ctx.lineTo(hW-taper, hH); ctx.lineTo(-hW+taper, hH);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5,0); ctx.lineTo(-5,-28*te); ctx.lineTo(18*te,0); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else {
    // Full boat
    ctx.beginPath(); ctx.moveTo(-30,0); ctx.lineTo(30,0); ctx.lineTo(20,16); ctx.lineTo(-20,16); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5,0); ctx.lineTo(-5,-28); ctx.lineTo(18,0); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

// ── Open received message ──
function openMessage() {
  if (!rcMessage) {
    document.getElementById('msg-display').textContent = 'No messages yet in this atmosphere. Be the first to release one.';
  } else {
    document.getElementById('msg-display').textContent = rcMessage.text;
  }
  cancelAnimationFrame(rcAnimFrame);
  goTo('read');
}

// ── Toast ──
function showToast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 3200);
}

// ── Navigation ──
document.getElementById('btn-send').addEventListener('click', () => goTo('write'));
document.getElementById('back-write').addEventListener('click', () => goTo('landing'));

document.getElementById('btn-release').addEventListener('click', () => {
  isLettingGo = false;
  const txt = msgInput.value.trim();
  if (!txt) { showToast('write something first…'); return; }
  saveMessage(txt, currentTheme);

  msgInput.value = ''; charLeft.textContent = '500';
  goTo('sending');
  sendAnimT = 0; rcReady = false;
  const W = sendCanvas.width, H = sendCanvas.height;
  cancelAnimationFrame(sendAnimFrame);
  setTimeout(() => { drawSendFrame(currentTheme, 0, W, H); }, currentTheme === 'night' ? LANTERN_START_DELAY : 500);
});

document.getElementById('btn-receive').addEventListener('click', () => {
  rcMessage = null;
  fetchRandomMessage(currentTheme);
  rcReady = false;
  document.getElementById('tap-open').style.display = 'none';
  goTo('receiving');
  rcAnimT = 0;
  const W = rcCanvas.width, H = rcCanvas.height;
  cancelAnimationFrame(rcAnimFrame);
  setTimeout(() => { drawRcFrame(currentTheme, 0, W, H); }, currentTheme === 'night' ? LANTERN_START_DELAY : 500);
});

document.getElementById('btn-letgo').addEventListener('click', () => {
  isLettingGo = true;
  const letter = document.getElementById('msg-letter');
  letter.style.animation = '';
  goTo('sending');
  sendAnimT = 0; rcReady = false;
  const W = sendCanvas.width, H = sendCanvas.height;
  cancelAnimationFrame(sendAnimFrame);
  setTimeout(() => { drawSendFrame(currentTheme, 0, W, H); }, currentTheme === 'night' ? LANTERN_START_DELAY : 500);
});

// ── Init ──
initParticles('sky');
atmoLoop();
updateStatsDisplay();

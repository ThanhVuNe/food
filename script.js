/* =========================================================
   HÔM NAY ĂN GÌ? — Vòng xoay đồ ăn
   Web tĩnh • HTML + CSS + JS thuần (không cần thư viện ngoài)
   ---------------------------------------------------------
   👉 THÊM / SỬA MÓN ĂN: chỉnh object `data` bên dưới.
      Mỗi món: { emoji: '🍜', name: 'Bún chả' }
      Thêm bao nhiêu cũng được — vòng xoay tự chia nan đều.
   ========================================================= */

const data = {
  no: {
    title: 'Thức ăn no',
    emoji: '🍜',
    items: [
      { emoji: '🍜', name: 'Bún chả' },
      { emoji: '🍲', name: 'Phở bò' },
      { emoji: '🍛', name: 'Cơm tấm' },
      { emoji: '🌶️', name: 'Bún bò' },
      { emoji: '🦐', name: 'Hủ tiếu' },
      { emoji: '🍝', name: 'Mì cay' },
      { emoji: '🍗', name: 'Cơm gà' },
      { emoji: '🥖', name: 'Bánh mì' },
      { emoji: '🥟', name: 'Hoành thánh' },
      { emoji: '🫕', name: 'Lẩu' },
    ],
  },
  fast: {
    title: 'Thức ăn nhanh',
    emoji: '🍕',
    items: [
      { emoji: '🍗', name: 'Gà rán' },
      { emoji: '🍢', name: 'Topokki' },
      { emoji: '🍜', name: 'Mì Hàn' },
      { emoji: '🍱', name: 'Bibimbap' },
      { emoji: '🍕', name: 'Pizza' },
      { emoji: '🍔', name: 'Hamburger' },
      { emoji: '🌭', name: 'Hotdog' },
      { emoji: '🍣', name: 'Sushi' },
      { emoji: '🌮', name: 'Taco' },
      { emoji: '🍟', name: 'Khoai tây' },
    ],
  },
};

// Màu cho các nan vòng xoay (xoay vòng theo thứ tự)
const PALETTE = ['#FF6B35','#FFD23F','#FF3CAC','#2EC4B6','#8338EC','#3A86FF','#FF4D6D','#06D6A0'];

// ----- Trạng thái -----
let currentCat = null;   // 'no' | 'fast'
let rotation   = 0;      // góc xoay hiện tại (độ)
let spinning   = false;
let muted      = false;

// ----- Phần tử DOM -----
const $ = (id) => document.getElementById(id);
const el = {
  select:     $('screenSelect'),
  wheel:      $('screenWheel'),
  result:     $('screenResult'),
  cards:      document.querySelectorAll('.cat-card'),
  backBtn:    $('backBtn'),
  catTitle:   $('catTitle'),
  wheelStage: $('wheelStage'),
  wheelCanvas:$('wheelCanvas'),
  spinBtn:    $('spinBtn'),
  resultCard: $('resultCard'),
  resEmoji:   $('resEmoji'),
  resName:    $('resName'),
  againBtn:   $('againBtn'),
  changeBtn:  $('changeBtn'),
  muteBtn:    $('muteBtn'),
  confetti:   $('confettiCanvas'),
};

/* =========================================================
   ÂM THANH (Web Audio API — không cần file âm thanh ngoài)
   ========================================================= */
let audioCtx = null;
function ensureAudio(){
  if(!audioCtx){
    const AC = window.AudioContext || window.webkitAudioContext;
    if(AC) audioCtx = new AC();
  }
  if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
function blip(freq, dur, type='square', vol=0.15){
  if(muted || !audioCtx) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}
function playTick(){ blip(1150, 0.05, 'square', 0.10); }
function playDing(){
  if(muted) return;
  ensureAudio();
  blip(660, 0.18, 'triangle', 0.20);
  setTimeout(() => blip(990, 0.26, 'triangle', 0.18), 130);
}

/* =========================================================
   VẼ VÒNG XOAY (Canvas)
   ========================================================= */
function setupCanvas(canvas, cssSize){
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width  = Math.round(cssSize * dpr);
  canvas.height = Math.round(cssSize * dpr);
  canvas.style.width  = cssSize + 'px';
  canvas.style.height = cssSize + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // vẽ theo toạ độ CSS px
  return ctx;
}

function drawWheel(){
  if(!currentCat) return;
  const items = data[currentCat].items;
  const S = el.wheelStage.clientWidth || 320;
  const ctx = setupCanvas(el.wheelCanvas, S);

  const cx = S / 2, cy = S / 2;
  const R = S / 2 - S * 0.015;
  const n = items.length;
  const seg = (Math.PI * 2) / n;

  ctx.clearRect(0, 0, S, S);

  for(let i = 0; i < n; i++){
    const a0 = -Math.PI / 2 + i * seg;     // bắt đầu từ đỉnh trên
    const a1 = a0 + seg;

    // tô nan
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, a0, a1);
    ctx.closePath();
    ctx.fillStyle = PALETTE[i % PALETTE.length];
    ctx.fill();

    // viền nan
    ctx.lineWidth = S * 0.006;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.stroke();

    // emoji + tên (thẳng đứng, ở giữa nan)
    const mid = a0 + seg / 2;
    const rr  = R * 0.66;
    const ex  = cx + Math.cos(mid) * rr;
    const ey  = cy + Math.sin(mid) * rr;
    ctx.save();
    ctx.translate(ex, ey);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // emoji
    ctx.font = Math.round(S * 0.085) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    ctx.fillText(items[i].emoji, 0, -S * 0.035);
    // tên món
    ctx.font = '800 ' + Math.round(S * 0.038) + 'px Nunito, system-ui, sans-serif';
    ctx.lineWidth = S * 0.004;
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.strokeText(items[i].name, 0, S * 0.06);
    ctx.fillStyle = '#fff';
    ctx.fillText(items[i].name, 0, S * 0.06);
    ctx.restore();
  }

  // vành ngoài trắng
  ctx.beginPath();
  ctx.arc(cx, cy, R - S * 0.004, 0, Math.PI * 2);
  ctx.lineWidth = S * 0.025;
  ctx.strokeStyle = '#fff';
  ctx.stroke();

  // nốt tròn ở giữa (lót dưới nút QUAY)
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.17, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0,0,0,0.12)';
  ctx.shadowBlur  = S * 0.02;
  ctx.fill();
  ctx.shadowBlur = 0;

  // giữ nguyên góc xoay hiện tại
  el.wheelCanvas.style.transform = 'rotate(' + rotation + 'deg)';
}

/* =========================================================
   XOAY
   ========================================================= */
function spin(){
  if(spinning || !currentCat) return;
  ensureAudio();
  spinning = true;
  el.spinBtn.disabled = true;
  el.spinBtn.textContent = '...';

  const items = data[currentCat].items;
  const n  = items.length;
  const segDeg = 360 / n;
  const turns  = 5 + Math.floor(Math.random() * 3); // 5–7 vòng
  const offset = Math.random() * 360;
  const target = rotation + turns * 360 + offset;
  const start  = rotation;
  const delta  = target - start;
  const duration = 4200 + Math.random() * 900;
  const t0 = performance.now();
  let lastSeg = -1;

  function frame(now){
    let t = (now - t0) / duration;
    if(t > 1) t = 1;
    const eased = 1 - Math.pow(1 - t, 3);          // easeOutCubic
    const rot = start + delta * eased;
    el.wheelCanvas.style.transform = 'rotate(' + rot + 'deg)';

    // tiếng "tích" mỗi khi qua một nan
    const norm = ((-rot % 360) + 360) % 360;
    const si = Math.floor(norm / segDeg);
    if(si !== lastSeg){ lastSeg = si; playTick(); }

    if(t < 1) requestAnimationFrame(frame);
    else finishSpin(target);
  }
  requestAnimationFrame(frame);
}

function finishSpin(finalRot){
  rotation = finalRot;            // tiếp tục từ đây cho lần sau
  spinning = false;
  el.spinBtn.disabled = false;
  el.spinBtn.textContent = 'QUAY';

  const items = data[currentCat].items;
  const n  = items.length;
  const segDeg = 360 / n;
  const norm = ((-finalRot % 360) + 360) % 360;
  const idx = Math.floor(norm / segDeg) % n;       // nan trùng mũi tên
  showResult(items[idx]);
}

/* =========================================================
   HIỆN KẾT QUẢ (lật thẻ + pháo giấy + tiếng ting)
   ========================================================= */
function showResult(food){
  el.resEmoji.textContent = food.emoji;
  el.resName.textContent  = food.name;
  el.resultCard.classList.remove('flipped');
  el.result.classList.add('is-active');

  setTimeout(() => {
    el.resultCard.classList.add('flipped');
    playDing();
    launchConfetti();
  }, 150);
}

/* =========================================================
   PHÁO GIẤY (canvas, không dùng thư viện)
   ========================================================= */
let confettiRAF = null;
function launchConfetti(){
  const cvs = el.confetti;
  const ctx = cvs.getContext('2d');
  const W = cvs.width  = window.innerWidth;
  const H = cvs.height = window.innerHeight;
  const colors = ['#FF6B35','#FFD23F','#FF3CAC','#2EC4B6','#8338EC','#3A86FF','#FF4D6D'];
  const parts = [];

  for(let i = 0; i < 150; i++){
    parts.push({
      x: Math.random() * W,
      y: -20 - Math.random() * H * 0.4,
      r: 5 + Math.random() * 7,
      c: colors[(Math.random() * colors.length) | 0],
      vx: -2 + Math.random() * 4,
      vy: 2 + Math.random() * 4,
      rot: Math.random() * Math.PI * 2,
      vr: -0.2 + Math.random() * 0.4,
      shape: Math.random() > 0.5 ? 0 : 1,
    });
  }

  const start = performance.now();
  cancelAnimationFrame(confettiRAF);

  function step(){
    ctx.clearRect(0, 0, W, H);
    let alive = 0;
    for(const p of parts){
      p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.rot += p.vr;
      if(p.y < H + 30) alive++;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      if(p.shape === 0) ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
      else { ctx.beginPath(); ctx.arc(0, 0, p.r / 2, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    if(alive > 0 && performance.now() - start < 4000){
      confettiRAF = requestAnimationFrame(step);
    } else {
      ctx.clearRect(0, 0, W, H);
    }
  }
  confettiRAF = requestAnimationFrame(step);
}

/* =========================================================
   ĐIỀU HƯỚNG GIỮA CÁC MÀN HÌNH
   ========================================================= */
function selectCategory(cat){
  ensureAudio();
  currentCat = cat;
  rotation = 0;
  el.catTitle.textContent = data[cat].emoji + ' ' + data[cat].title;
  el.wheelCanvas.style.transform = 'rotate(0deg)';
  showScreen('wheel');
  requestAnimationFrame(drawWheel);   // vẽ sau khi màn đã hiện (lấy đúng kích thước)
}

function showScreen(name){
  el.select.classList.toggle('is-active', name === 'select');
  el.wheel.classList.toggle('is-active',  name === 'wheel');
  el.result.classList.remove('is-active');
}

function spinAgain(){ el.result.classList.remove('is-active'); }      // về vòng xoay, xoay tiếp

function goSelect(){
  el.result.classList.remove('is-active');
  showScreen('select');
}

function toggleMute(){
  muted = !muted;
  el.muteBtn.textContent = muted ? '🔇' : '🔊';
  if(!muted) ensureAudio();
}

/* =========================================================
   KHỞI TẠO
   ========================================================= */
function debounce(fn, ms){
  let h;
  return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); };
}

function init(){
  el.cards.forEach((card) => {
    card.addEventListener('click', () => selectCategory(card.dataset.cat));
  });
  el.backBtn.addEventListener('click', goSelect);
  el.spinBtn.addEventListener('click', spin);
  el.againBtn.addEventListener('click', spinAgain);
  el.changeBtn.addEventListener('click', goSelect);
  el.muteBtn.addEventListener('click', toggleMute);
  window.addEventListener('resize', debounce(() => { if(currentCat) drawWheel(); }, 150));
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

import './style.css';
import './image-input.js';

const button = document.querySelector('#check-status');
const backendStatus = document.querySelector('#backend-status');
const aiStatus = document.querySelector('#ai-status');
const backendDot = document.querySelector('#backend-dot');
const aiDot = document.querySelector('#ai-dot');

function setDotColor(dot, state) {
  if (!dot) return;
  dot.className = state === 'ok'
    ? 'h-2 w-2 rounded-full bg-[#00F5D4]'
    : state === 'warn'
      ? 'h-2 w-2 rounded-full bg-amber-400'
      : state === 'err'
        ? 'h-2 w-2 rounded-full bg-[#F72585]'
        : 'h-2 w-2 rounded-full bg-slate-400';
}

async function checkService(path, element, service, dot) {
  try {
    const response = await fetch(path, { signal: AbortSignal.timeout(7000) });
    const body = await response.json();
    if (!response.ok || body.status !== 'ok' || body.service !== service) {
      throw new Error('Health check failed');
    }
    if (service === 'backend') {
      element.textContent = 'Terhubung.';
      setDotColor(dot, 'ok');
    } else if (service === 'ai-service') {
      element.textContent = body.model_loaded
        ? 'Aktif (SCHP ATR-18)'
        : 'Terhubung (Model belum dimuat)';
      setDotColor(dot, body.model_loaded ? 'ok' : 'warn');
    }
  } catch {
    element.textContent = 'Tidak terhubung.';
    setDotColor(dot, 'err');
  }
}

async function checkStatus() {
  button.disabled = true;
  backendStatus.textContent = 'Memeriksa…';
  aiStatus.textContent = 'Memeriksa…';
  setDotColor(backendDot, 'pending');
  setDotColor(aiDot, 'pending');
  await Promise.all([
    checkService('/api/health', backendStatus, 'backend', backendDot),
    checkService('/api/health/ai', aiStatus, 'ai-service', aiDot),
  ]);
  button.disabled = false;
}

button.addEventListener('click', checkStatus);
checkStatus();

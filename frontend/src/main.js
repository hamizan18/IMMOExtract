import './style.css';
import './image-input.js';

const button = document.querySelector('#check-status');
const backendStatus = document.querySelector('#backend-status');
const aiStatus = document.querySelector('#ai-status');

async function checkService(path, element, service) {
  try {
    const response = await fetch(path, { signal: AbortSignal.timeout(7000) });
    const body = await response.json();
    if (!response.ok || body.status !== 'ok' || body.service !== service) {
      throw new Error('Health check failed');
    }
    if (service === 'backend') {
      element.textContent = 'Terhubung.';
    } else if (service === 'ai-service') {
      element.textContent = body.model_loaded
        ? 'Terhubung melalui Express. Model AI aktif (SCHP ATR-18).'
        : 'Terhubung melalui Express. Model AI belum dipasang.';
    }
  } catch {
    element.textContent = 'Tidak terhubung. Periksa proses layanan dan konfigurasi lokal.';
  }
}

async function checkStatus() {
  button.disabled = true;
  backendStatus.textContent = 'Memeriksa…';
  aiStatus.textContent = 'Memeriksa…';
  await Promise.all([
    checkService('/api/health', backendStatus, 'backend'),
    checkService('/api/health/ai', aiStatus, 'ai-service'),
  ]);
  button.disabled = false;
}

button.addEventListener('click', checkStatus);
checkStatus();

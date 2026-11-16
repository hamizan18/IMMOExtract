const input = document.querySelector('#image-input');
const clearButton = document.querySelector('#clear-image');
const status = document.querySelector('#image-status');
const preview = document.querySelector('#image-preview');
const image = document.querySelector('#preview-image');
const details = document.querySelector('#image-details');
const startCameraButton = document.querySelector('#start-camera');
const captureButton = document.querySelector('#capture-photo');
const stopCameraButton = document.querySelector('#stop-camera');
const cameraStatus = document.querySelector('#camera-status');
const video = document.querySelector('#camera-video');

const maxBytes = 10 * 1024 * 1024;
const maxSide = 8192;
const maxPixels = 24_000_000;
let selection = 0;
let objectUrl = null;
let cameraSession = 0;
let cameraStream = null;
let uploadController = null;

function clearPreview() {
  uploadController?.abort();
  uploadController = null;
  preview.hidden = true;
  image.removeAttribute('src');
  details.textContent = '';
  if (objectUrl !== null) URL.revokeObjectURL(objectUrl);
  objectUrl = null;
}

function detectType(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, i) => bytes[i] === byte)) {
    return 'image/png';
  }
  if (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
      && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}

async function uploadImage(file, type, current) {
  const controller = new AbortController();
  uploadController = controller;
  const form = new FormData();
  // Browser file pickers may omit MIME; use the signature-checked type.
  form.append('image', file.type ? file : file.slice(0, file.size, type), file.name);
  status.textContent = 'Preview siap. Mengunggah dan memvalidasi gambar di server lokal…';
  try {
    const response = await fetch('/api/uploads', {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null);
    if (current !== selection) return;
    if (!response.ok) {
      const message = typeof body?.error?.message === 'string'
        ? body.error.message
        : 'Server tidak dapat menerima gambar.';
      status.textContent = `Upload gagal: ${message} Preview lokal tetap tersedia. Pilih ulang gambar untuk mencoba lagi.`;
      return;
    }
    if (body?.status !== 'uploaded' || typeof body.upload_id !== 'string' || !body.upload_id) {
      throw new Error('Invalid upload response');
    }
    status.textContent = `Upload berhasil. ID upload: ${body.upload_id}. Gambar tersimpan di server lokal; ekstraksi AI belum tersedia.`;
  } catch {
    if (current !== selection || controller.signal.aborted) return;
    status.textContent = 'Upload belum dapat dikonfirmasi. Periksa koneksi/server lokal, lalu pilih ulang gambar. Preview lokal tetap tersedia.';
  } finally {
    if (uploadController === controller) uploadController = null;
  }
}

async function showImage(file) {
  const current = ++selection;
  clearPreview();
  clearButton.disabled = !file;
  if (!file) {
    status.textContent = 'Belum ada gambar dipilih.';
    return;
  }

  status.textContent = 'Memeriksa gambar…';
  try {
    if (file.size === 0) throw new Error('File kosong. Pilih gambar lain.');
    if (file.size > maxBytes) throw new Error('Ukuran gambar melebihi 10 MiB. Pilih gambar yang lebih kecil.');
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (current !== selection) return;
    const type = detectType(bytes);
    if (!type || (file.type && file.type !== type)) {
      throw new Error('Format atau isi file tidak sesuai. Gunakan JPG, PNG, atau WebP.');
    }

    objectUrl = URL.createObjectURL(file);
    const candidate = new Image();
    candidate.src = objectUrl;
    try {
      await candidate.decode();
    } catch {
      throw new Error('Gambar rusak atau tidak dapat dibaca browser. Pilih gambar lain.');
    }
    // A later selection or clear action always wins over an earlier decode.
    if (current !== selection) return;
    const width = candidate.naturalWidth;
    const height = candidate.naturalHeight;
    if (width > maxSide || height > maxSide || width * height > maxPixels) {
      throw new Error('Dimensi gambar melebihi batas preview: sisi 8192 piksel atau 24 megapiksel.');
    }

    image.src = objectUrl;
    details.textContent = `${file.name} — ${width} × ${height} piksel — ${(file.size / 1024 / 1024).toFixed(2)} MiB`;
    preview.hidden = false;
    await uploadImage(file, type, current);
  } catch (error) {
    if (current !== selection) return;
    clearPreview();
    status.textContent = error.message;
    input.value = '';
    clearButton.disabled = true;
  }
}

function resetImage() {
  ++selection;
  clearPreview();
  input.value = '';
  clearButton.disabled = true;
  status.textContent = 'Belum ada gambar dipilih.';
}

function stopCamera(message = 'Kamera dihentikan.') {
  // Invalidate pending permission requests and PNG encodes, not just live streams.
  ++cameraSession;
  if (cameraStream) {
    for (const track of cameraStream.getTracks()) track.stop();
    cameraStream = null;
  }
  video.pause();
  video.srcObject = null;
  video.hidden = true;
  startCameraButton.disabled = false;
  captureButton.disabled = true;
  stopCameraButton.disabled = true;
  cameraStatus.textContent = message;
}

input.addEventListener('change', () => {
  stopCamera();
  showImage(input.files[0]);
});

clearButton.addEventListener('click', () => {
  stopCamera();
  resetImage();
});

startCameraButton.addEventListener('click', async () => {
  stopCamera();
  resetImage();
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    cameraStatus.textContent = 'Kamera tidak tersedia. Gunakan browser yang mendukung kamera melalui HTTPS atau localhost, atau pilih file gambar.';
    return;
  }

  const current = cameraSession;
  startCameraButton.disabled = true;
  stopCameraButton.disabled = false;
  clearButton.disabled = false;
  cameraStatus.textContent = 'Menunggu izin kamera. Anda dapat membatalkan dengan Tutup kamera.';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    if (current !== cameraSession || document.hidden) {
      for (const track of stream.getTracks()) track.stop();
      return;
    }
    cameraStream = stream;
    for (const track of stream.getVideoTracks()) {
      track.addEventListener('ended', () => {
        if (current === cameraSession) stopCamera('Kamera terputus. Buka kembali kamera atau pilih file gambar.');
      }, { once: true });
    }
    video.srcObject = stream;
    video.hidden = false;
    await video.play();
    if (current !== cameraSession) return;
    captureButton.disabled = video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA;
    cameraStatus.textContent = 'Kamera aktif. Tekan Ambil foto; kamera akan dihentikan setelah pengambilan gambar.';
  } catch (error) {
    if (current !== cameraSession) return;
    const messages = {
      NotAllowedError: 'Izin kamera ditolak atau diblokir. Izinkan kamera di pengaturan browser, lalu coba lagi, atau pilih file gambar.',
      SecurityError: 'Akses kamera diblokir browser. Periksa izin situs atau pilih file gambar.',
      NotFoundError: 'Kamera tidak ditemukan. Hubungkan kamera atau pilih file gambar.',
      NotReadableError: 'Kamera tidak dapat digunakan. Tutup aplikasi lain yang memakai kamera, lalu coba lagi.',
    };
    stopCamera(messages[error.name] || 'Kamera gagal dibuka. Periksa perangkat dan izin browser, atau pilih file gambar.');
  }
});

video.addEventListener('loadeddata', () => {
  if (cameraStream) captureButton.disabled = false;
});

video.addEventListener('error', () => {
  if (cameraStream) stopCamera('Tampilan kamera gagal dimuat. Buka kembali kamera atau pilih file gambar.');
});

stopCameraButton.addEventListener('click', () => stopCamera());

captureButton.addEventListener('click', async () => {
  if (!cameraStream || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
  captureButton.disabled = true;
  let current = cameraSession;
  try {
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height || width > maxSide || height > maxSide || width * height > maxPixels) {
      throw new Error('Dimensi kamera tidak sesuai batas preview: sisi 8192 piksel atau 24 megapiksel. Pilih file gambar lain.');
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Browser tidak dapat mengambil foto. Pilih file gambar.');
    context.drawImage(video, 0, 0, width, height);
    stopCamera('Memproses foto lokal; kamera sudah dihentikan.');
    current = cameraSession;
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (current !== cameraSession) return;
    if (!blob) throw new Error('Foto tidak dapat dibuat. Buka kembali kamera atau pilih file gambar.');
    cameraStatus.textContent = 'Foto diambil. Kamera sudah dihentikan.';
    await showImage(new File([blob], 'foto-kamera.png', { type: 'image/png' }));
  } catch (error) {
    if (current === cameraSession) stopCamera(error.message);
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopCamera('Kamera dihentikan karena halaman tidak aktif.');
});
window.addEventListener('pagehide', () => {
  stopCamera('Kamera dihentikan karena halaman ditinggalkan.');
  resetImage();
});

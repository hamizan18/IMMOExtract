const button = document.querySelector('#extract-objects');
const status = document.querySelector('#job-status');
const details = document.querySelector('#job-details');
const progress = document.querySelector('#job-progress');
const gallery = document.querySelector('#object-gallery');
const cardTemplate = document.querySelector('#object-card');
const exportSelected = document.querySelector('#export-selected');
const exportAll = document.querySelector('#export-all');
const selectionCount = document.querySelector('#selection-count');
const exportStatus = document.querySelector('#export-status');
const exportDownload = document.querySelector('#export-download');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let uploadId = null;
let jobId = null;
let controller = null;
let pollTimer = null;
let exportController = null;

function updateSelection() {
  const checkboxes = gallery.querySelectorAll('[data-select-object]');
  const selected = gallery.querySelectorAll('[data-select-object]:checked');
  selectionCount.textContent = `${selected.length} dari ${checkboxes.length} objek dipilih.`;
  exportSelected.disabled = !!exportController || selected.length === 0;
  exportAll.disabled = !!exportController || checkboxes.length === 0;
  for (const checkbox of checkboxes) checkbox.disabled = !!exportController;
}

function clearExportDownload() {
  exportDownload.hidden = true;
  exportDownload.removeAttribute('href');
  exportDownload.removeAttribute('download');
}

function showStatus(message) {
  if (status.textContent !== message) status.textContent = message;
}

// Called by the existing upload/selection lifecycle, including camera and pagehide.
export function setUploadedImage(id) {
  controller?.abort();
  controller = null;
  exportController?.abort();
  exportController = null;
  clearExportDownload();
  exportStatus.textContent = '';
  clearTimeout(pollTimer);
  pollTimer = null;
  uploadId = id;
  jobId = null;
  for (const image of gallery.querySelectorAll('img')) image.removeAttribute('src');
  gallery.replaceChildren();
  updateSelection();
  details.textContent = '';
  details.hidden = true;
  progress.hidden = true;
  button.textContent = 'Ekstrak objek';
  button.disabled = !uploadId;
  showStatus(uploadId ? 'Gambar siap diekstrak. Tekan Ekstrak objek.' : 'Pilih gambar dan tunggu upload berhasil.');
}

async function requestJob(path, operation, options = {}) {
  const response = await fetch(path, {
    ...options,
    signal: AbortSignal.any([operation.signal, AbortSignal.timeout(15000)]),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(typeof body?.error?.message === 'string' ? body.error.message : 'Server tidak dapat memproses permintaan job.');
  }
  if (!body || !uuid.test(body.job_id) || !['queued', 'processing', 'completed', 'failed'].includes(body.status)) {
    throw new Error('Respons status job tidak valid.');
  }
  return body;
}

function renderObjects(objects) {
  if (!Array.isArray(objects) || objects.some(object => !object || !uuid.test(object.id)
      || typeof object.category !== 'string' || !Number.isInteger(object.width) || object.width < 1
      || !Number.isInteger(object.height) || object.height < 1)) {
    throw new Error('Daftar objek dari server tidak valid.');
  }
  const cards = document.createDocumentFragment();
  for (const object of objects) {
    const card = cardTemplate.content.cloneNode(true);
    const label = object.category === 'human' ? 'Manusia (foreground)' : object.category;
    const path = `/api/jobs/${jobId}/objects/${object.id}`;
    const image = card.querySelector('img');
    const previewError = card.querySelector('[data-preview-error]');
    image.alt = `Hasil ekstraksi: ${label}`;
    image.addEventListener('error', () => {
      image.hidden = true;
      previewError.hidden = false;
    }, { once: true });
    image.src = path;
    card.querySelector('h4').textContent = label;
    card.querySelector('[data-dimensions]').textContent = `${object.width} × ${object.height} piksel`;
    const checkbox = card.querySelector('[data-select-object]');
    checkbox.value = object.id;
    checkbox.setAttribute('aria-label', `Pilih untuk ZIP: ${label}`);
    const download = card.querySelector('a');
    download.href = `${path}/download`;
    download.download = `${object.id}.png`;
    download.setAttribute('aria-label', `Unduh PNG asli: ${label}`);
    cards.append(card);
  }
  gallery.replaceChildren(cards);
  updateSelection();
  showStatus(objects.length
    ? `Selesai. ${objects.length} objek tersedia untuk diunduh sebagai PNG asli.`
    : 'Selesai, tetapi tidak ada objek yang dapat diekstrak. Coba gambar dengan satu orang yang terlihat lebih jelas.');
}

function applyJob(job, operation) {
  if (controller !== operation || operation.signal.aborted) return;
  if (job.job_id !== jobId) throw new Error('ID status job tidak sesuai.');
  details.textContent = `ID job: ${jobId} — ${job.status}`;
  details.hidden = false;
  if (job.status === 'queued' || job.status === 'processing') {
    showStatus(job.status === 'queued'
      ? 'Dalam antrean. Menunggu worker AI lokal…'
      : 'Sedang memproses ekstraksi dengan AI lokal…');
    // Schedule only after the previous response; requests never overlap.
    pollTimer = setTimeout(() => { void pollJob(operation); }, 1000);
    return;
  }
  if (job.status === 'completed') {
    renderObjects(job.objects);
  } else {
    const message = typeof job.error?.message === 'string' ? job.error.message : 'Ekstraksi tidak berhasil.';
    showStatus(`Ekstraksi gagal: ${message} Pilih ulang gambar untuk mencoba lagi.`);
  }
  progress.hidden = true;
  controller = null;
}

function handleFailure(error, operation) {
  if (controller !== operation || operation.signal.aborted) return;
  progress.hidden = true;
  controller = null;
  button.disabled = false;
  button.textContent = jobId ? 'Periksa status' : 'Ekstrak objek';
  showStatus(jobId
    ? `Pemeriksaan status terhenti: ${error.message} Job mungkin masih berjalan di server. Periksa koneksi, lalu tekan Periksa status untuk melanjutkan tanpa membuat job baru.`
    : `Permintaan ekstraksi belum dapat dikonfirmasi: ${error.message} Job mungkin sudah diterima server. Menekan Ekstrak objek lagi akan mengirim permintaan baru.`);
}

async function pollJob(operation) {
  pollTimer = null;
  try {
    const job = await requestJob(`/api/jobs/${jobId}`, operation);
    applyJob(job, operation);
  } catch (error) {
    handleFailure(error, operation);
  }
}

button.addEventListener('click', async () => {
  if (!uploadId || button.disabled) return;
  button.disabled = true;
  progress.hidden = false;
  const operation = new AbortController();
  controller = operation;
  if (jobId) {
    showStatus('Memeriksa kembali status job…');
    await pollJob(operation);
    return;
  }
  showStatus('Mengirim permintaan ekstraksi ke server lokal…');
  try {
    const job = await requestJob('/api/jobs', operation, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upload_id: uploadId }),
    });
    if (controller !== operation || operation.signal.aborted) return;
    jobId = job.job_id;
    applyJob(job, operation);
  } catch (error) {
    handleFailure(error, operation);
  }
});

gallery.addEventListener('change', updateSelection);

async function exportObjects(all) {
  if (exportController || !jobId || (all ? exportAll.disabled : exportSelected.disabled)) return;
  const selection = all ? { all: true } : {
    object_ids: Array.from(gallery.querySelectorAll('[data-select-object]:checked'), checkbox => checkbox.value),
  };
  const exportingJobId = jobId;
  const operation = new AbortController();
  exportController = operation;
  clearExportDownload();
  updateSelection();
  exportStatus.textContent = 'Sedang membuat ZIP asli di server lokal…';
  try {
    const response = await fetch(`/api/jobs/${exportingJobId}/exports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selection),
      signal: AbortSignal.any([operation.signal, AbortSignal.timeout(15000)]),
    });
    const result = await response.json().catch(() => null);
    // Reset can happen even after fetch resolves, while the response body is read.
    if (exportController !== operation || operation.signal.aborted) return;
    if (!response.ok) {
      throw new Error(typeof result?.error?.message === 'string'
        ? result.error.message : 'Server tidak dapat membuat ZIP.');
    }
    if (!result || !uuid.test(result.export_id) || result.job_id !== exportingJobId
        || result.status !== 'completed'
        || result.download_url !== `/api/jobs/${exportingJobId}/exports/${result.export_id}/download`) {
      throw new Error('Respons ekspor ZIP tidak valid.');
    }
    exportDownload.href = result.download_url;
    exportDownload.download = `${result.export_id}.zip`;
    exportDownload.hidden = false;
    exportStatus.textContent = 'ZIP siap. Unduhan diminta ke browser. Jika belum mulai, gunakan Unduh ulang ZIP siap tanpa membuat ekspor baru.';
    exportDownload.click();
  } catch (error) {
    if (exportController !== operation || operation.signal.aborted) return;
    exportStatus.textContent = `Pembuatan ZIP belum dapat dikonfirmasi: ${error.message} Pilihan tetap tersimpan. Periksa koneksi/file lalu coba lagi; permintaan sebelumnya mungkin sudah tersimpan di server.`;
  } finally {
    if (exportController === operation) {
      exportController = null;
      updateSelection();
    }
  }
}

exportSelected.addEventListener('click', () => { void exportObjects(false); });
exportAll.addEventListener('click', () => { void exportObjects(true); });

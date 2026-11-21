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
const spritesheetPadding = document.querySelector('#spritesheet-padding');
const spritesheetColumns = document.querySelector('#spritesheet-columns');
const spritesheetSelected = document.querySelector('#spritesheet-selected');
const spritesheetAll = document.querySelector('#spritesheet-all');
const spritesheetStatus = document.querySelector('#spritesheet-status');
const spritesheetResult = document.querySelector('#spritesheet-result');
const spritesheetPreviewImg = document.querySelector('#spritesheet-preview-img');
const spritesheetInfo = document.querySelector('#spritesheet-info');
const spritesheetDownloadPng = document.querySelector('#spritesheet-download-png');
const spritesheetDownloadAtlas = document.querySelector('#spritesheet-download-atlas');
const previewImage = document.querySelector('#preview-image');
const maskDialog = document.querySelector('#mask-editor-dialog');
const maskTitle = document.querySelector('#mask-editor-title');
const maskClose = document.querySelector('#mask-editor-close');
const maskCanvas = document.querySelector('#mask-editor-canvas');
const maskBrushSize = document.querySelector('#mask-brush-size');
const maskBrushSizeVal = document.querySelector('#mask-brush-size-val');
const maskUndo = document.querySelector('#mask-undo');
const maskReset = document.querySelector('#mask-reset');
const maskCancel = document.querySelector('#mask-editor-cancel');
const maskSave = document.querySelector('#mask-editor-save');
const maskStatus = document.querySelector('#mask-editor-status');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let uploadId = null;
let jobId = null;
let controller = null;
let pollTimer = null;
let exportController = null;
let spritesheetController = null;
const pixelationControllers = new Map();
const stylizationControllers = new Map();
const stylizationPollTimers = new Map();

function updateSelection() {
  const checkboxes = gallery.querySelectorAll('[data-select-object]');
  const selected = gallery.querySelectorAll('[data-select-object]:checked');
  selectionCount.textContent = `${selected.length} dari ${checkboxes.length} objek dipilih.`;
  const busy = !!exportController || !!spritesheetController;
  exportSelected.disabled = busy || selected.length === 0;
  exportAll.disabled = busy || checkboxes.length === 0;
  spritesheetSelected.disabled = busy || selected.length === 0;
  spritesheetAll.disabled = busy || checkboxes.length === 0;
  for (const checkbox of checkboxes) checkbox.disabled = busy;
}

function clearSpritesheetResult() {
  spritesheetResult.hidden = true;
  spritesheetPreviewImg.removeAttribute('src');
  spritesheetInfo.textContent = '';
  spritesheetDownloadPng.removeAttribute('href');
  spritesheetDownloadAtlas.removeAttribute('href');
  spritesheetDownloadPng.removeAttribute('download');
  spritesheetDownloadAtlas.removeAttribute('download');
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
  spritesheetController?.abort();
  spritesheetController = null;
  for (const op of pixelationControllers.values()) op.abort();
  pixelationControllers.clear();
  for (const op of stylizationControllers.values()) op.abort();
  stylizationControllers.clear();
  for (const timer of stylizationPollTimers.values()) clearTimeout(timer);
  stylizationPollTimers.clear();
  clearExportDownload();
  clearSpritesheetResult();
  exportStatus.textContent = '';
  spritesheetStatus.textContent = '';
  if (maskDialog?.open) maskDialog.close();
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
    const download = card.querySelector('[data-download-original]');
    download.href = `${path}/download`;
    download.download = `${object.id}.png`;
    download.setAttribute('aria-label', `Unduh PNG asli: ${label}`);

    const editMaskBtn = card.querySelector('[data-edit-mask-button]');
    editMaskBtn.setAttribute('aria-label', `Koreksi mask: ${label}`);
    editMaskBtn.addEventListener('click', () => {
      openMaskEditor(object, label, image, download);
    });

    const sizeSelect = card.querySelector('[data-pixel-size]');
    const paletteSelect = card.querySelector('[data-pixel-palette]');
    sizeSelect.setAttribute('aria-label', `Ukuran pixelation: ${label}`);
    paletteSelect.setAttribute('aria-label', `Palet pixelation: ${label}`);
    const pixelateButton = card.querySelector('[data-pixelate-button]');
    const pixelateStatus = card.querySelector('[data-pixelate-status]');
    const pixelateResult = card.querySelector('[data-pixelate-result]');
    const pixelateImage = card.querySelector('[data-pixelate-image]');
    const pixelateDims = card.querySelector('[data-pixelate-dimensions]');
    const pixelateError = card.querySelector('[data-pixelate-error]');
    const pixelateDownload = card.querySelector('[data-pixelate-download]');

    const currentJobId = jobId;
    pixelateButton.addEventListener('click', async () => {
      const selectedSize = Number(sizeSelect.value);
      const selectedPalette = paletteSelect.value;
      const paletteLabel = selectedPalette === 'retro16' ? 'Retro 16 warna' : 'Warna asli';
      if (![16, 32, 64, 128].includes(selectedSize)
          || !['original', 'retro16'].includes(selectedPalette) || !jobId) return;

      pixelateButton.disabled = true;
      sizeSelect.disabled = true;
      paletteSelect.disabled = true;
      pixelateStatus.textContent = `Sedang memproses pixelation ${selectedSize} px — ${paletteLabel} di server lokal…`;

      pixelationControllers.get(object.id)?.abort();
      const operation = new AbortController();
      pixelationControllers.set(object.id, operation);

      try {
        const response = await fetch(`/api/jobs/${currentJobId}/pixelate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ object_id: object.id, size: selectedSize, palette: selectedPalette }),
          signal: AbortSignal.any([operation.signal, AbortSignal.timeout(15000)]),
        });
        const result = await response.json().catch(() => null);

        if (operation.signal.aborted || jobId !== currentJobId) return;
        if (!response.ok) {
          throw new Error(typeof result?.error?.message === 'string'
            ? result.error.message : 'Server tidak dapat memproses pixelation.');
        }
        if (!result || !uuid.test(result.pixelation_id) || result.job_id !== currentJobId
            || result.object_id !== object.id || result.status !== 'completed'
            || result.size !== selectedSize || result.palette !== selectedPalette
            || !Number.isInteger(result.width) || result.width < 1
            || !Number.isInteger(result.height) || result.height < 1
            || result.preview_url !== `/api/jobs/${currentJobId}/pixelations/${result.pixelation_id}`
            || result.download_url !== `/api/jobs/${currentJobId}/pixelations/${result.pixelation_id}/download`) {
          throw new Error('Respons pixelation tidak valid.');
        }

        pixelateImage.hidden = false;
        pixelateError.hidden = true;
        pixelateImage.alt = `Hasil pixelation ${result.size} px — ${paletteLabel}: ${label}`;
        pixelateImage.addEventListener('error', () => {
          pixelateImage.hidden = true;
          pixelateError.hidden = false;
        }, { once: true });
        pixelateImage.src = result.preview_url;

        pixelateDims.textContent = `${result.width} × ${result.height} piksel (grid ${result.size} px) — ${paletteLabel}`;
        pixelateDownload.href = result.download_url;
        pixelateDownload.download = `${result.pixelation_id}.png`;
        pixelateDownload.setAttribute('aria-label', `Unduh PNG pixelated ${result.size} px — ${paletteLabel}: ${label}`);

        pixelateResult.hidden = false;
        pixelateStatus.textContent = `Pixelation ${selectedSize} px — ${paletteLabel} selesai.`;
      } catch (error) {
        if (operation.signal.aborted || jobId !== currentJobId) return;
        pixelateStatus.textContent = `Pixelation gagal: ${error.message}`;
      } finally {
        if (pixelationControllers.get(object.id) === operation) {
          pixelationControllers.delete(object.id);
          pixelateButton.disabled = false;
          sizeSelect.disabled = false;
          paletteSelect.disabled = false;
        }
      }
    });

    const stylizePreset = card.querySelector('[data-stylize-preset]');
    const stylizeSize = card.querySelector('[data-stylize-size]');
    const stylizeButton = card.querySelector('[data-stylize-button]');
    const stylizeStatus = card.querySelector('[data-stylize-status]');
    const stylizeResult = card.querySelector('[data-stylize-result]');
    const stylizeImage = card.querySelector('[data-stylize-image]');
    const stylizeInfo = card.querySelector('[data-stylize-info]');
    const stylizeError = card.querySelector('[data-stylize-error]');
    const stylizeDownload = card.querySelector('[data-stylize-download]');

    stylizePreset.setAttribute('aria-label', `Preset AI stylization: ${label}`);
    stylizeSize.setAttribute('aria-label', `Ukuran AI stylization: ${label}`);
    stylizeButton.setAttribute('aria-label', `Stylize AI: ${label}`);

    stylizeButton.addEventListener('click', async () => {
      const selectedPreset = stylizePreset.value;
      const selectedSize = Number(stylizeSize.value);
      if (!['pixel-art', 'retro-rpg', 'game-boy'].includes(selectedPreset)
          || ![128, 256].includes(selectedSize) || !jobId) return;

      stylizeButton.disabled = true;
      stylizePreset.disabled = true;
      stylizeSize.disabled = true;
      stylizeStatus.textContent = `Mengirim permintaan AI stylization (${selectedPreset}, ${selectedSize} px)…`;

      stylizationControllers.get(object.id)?.abort();
      clearTimeout(stylizationPollTimers.get(object.id));
      stylizationPollTimers.delete(object.id);

      const operation = new AbortController();
      stylizationControllers.set(object.id, operation);

      const cleanupCardStylize = () => {
        if (stylizationControllers.get(object.id) === operation) {
          stylizationControllers.delete(object.id);
          stylizationPollTimers.delete(object.id);
          stylizeButton.disabled = false;
          stylizePreset.disabled = false;
          stylizeSize.disabled = false;
        }
      };

      try {
        const response = await fetch(`/api/jobs/${currentJobId}/stylize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            object_id: object.id,
            preset: selectedPreset,
            target_size: selectedSize,
            num_inference_steps: 2,
            strength: 0.5,
          }),
          signal: AbortSignal.any([operation.signal, AbortSignal.timeout(15000)]),
        });
        const initial = await response.json().catch(() => null);

        if (operation.signal.aborted || jobId !== currentJobId) return;
        if (!response.ok) {
          throw new Error(typeof initial?.error?.message === 'string'
            ? initial.error.message : 'Server tidak dapat memulai AI stylization.');
        }
        if (!initial || !uuid.test(initial.stylization_id) || initial.job_id !== currentJobId
            || initial.object_id !== object.id) {
          throw new Error('Respons inisialisasi stylization tidak valid.');
        }

        const stylizationId = initial.stylization_id;

        const pollStylization = async () => {
          if (operation.signal.aborted || jobId !== currentJobId) return;
          try {
            const pollResponse = await fetch(`/api/jobs/${currentJobId}/stylizations/${stylizationId}`, {
              signal: AbortSignal.any([operation.signal, AbortSignal.timeout(15000)]),
            });
            const result = await pollResponse.json().catch(() => null);

            if (operation.signal.aborted || jobId !== currentJobId) return;
            if (!pollResponse.ok) {
              throw new Error(typeof result?.error?.message === 'string'
                ? result.error.message : 'Gagal memeriksa status stylization.');
            }
            if (!result || result.stylization_id !== stylizationId) {
              throw new Error('Respons polling stylization tidak valid.');
            }

            if (result.status === 'queued') {
              stylizeStatus.textContent = 'Dalam antrean worker AI lokal (0%)…';
              const timer = setTimeout(() => { void pollStylization(); }, 2000);
              stylizationPollTimers.set(object.id, timer);
              return;
            }

            if (result.status === 'processing') {
              stylizeStatus.textContent = 'Sedang memproses AI stylization di server lokal (10%)… Mohon tunggu, proses memakan waktu ±1 menit di CPU.';
              const timer = setTimeout(() => { void pollStylization(); }, 2000);
              stylizationPollTimers.set(object.id, timer);
              return;
            }

            if (result.status === 'completed') {
              if (!result.preview_url || !result.download_url
                  || !Number.isInteger(result.width) || result.width < 1
                  || !Number.isInteger(result.height) || result.height < 1) {
                throw new Error('Respons hasil stylization tidak lengkap.');
              }

              stylizeImage.hidden = false;
              stylizeError.hidden = true;
              stylizeImage.alt = `Hasil AI stylization ${result.parameters?.preset ?? selectedPreset} ${result.width}×${result.height}: ${label}`;
              stylizeImage.addEventListener('error', () => {
                stylizeImage.hidden = true;
                stylizeError.hidden = false;
              }, { once: true });
              stylizeImage.src = result.preview_url;

              const duration = typeof result.result?.execution_time_seconds === 'number'
                ? ` dalam ${result.result.execution_time_seconds.toFixed(1)}s`
                : '';
              stylizeInfo.textContent = `${result.width} × ${result.height} piksel — Preset: ${result.parameters?.preset ?? selectedPreset}${duration}`;
              stylizeDownload.href = result.download_url;
              stylizeDownload.download = `${result.stylization_id}.png`;
              stylizeDownload.setAttribute('aria-label', `Unduh PNG Stylized ${result.parameters?.preset ?? selectedPreset}: ${label}`);

              stylizeResult.hidden = false;
              stylizeStatus.textContent = 'AI Stylization selesai! Siap diunduh.';
              cleanupCardStylize();
              return;
            }

            if (result.status === 'failed') {
              const message = typeof result.error?.message === 'string'
                ? result.error.message
                : 'Generasi AI gagal di server lokal.';
              throw new Error(message);
            }

            throw new Error(`Status stylization tidak dikenal: ${result.status}`);
          } catch (error) {
            if (operation.signal.aborted || jobId !== currentJobId) return;
            stylizeStatus.textContent = `AI Stylization gagal: ${error.message}`;
            cleanupCardStylize();
          }
        };

        const initialTimer = setTimeout(() => { void pollStylization(); }, 2000);
        stylizationPollTimers.set(object.id, initialTimer);
      } catch (error) {
        if (operation.signal.aborted || jobId !== currentJobId) return;
        stylizeStatus.textContent = `AI Stylization gagal: ${error.message}`;
        cleanupCardStylize();
      }
    });
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

async function handleSpritesheet(all) {
  if (spritesheetController || exportController || !jobId || (all ? spritesheetAll.disabled : spritesheetSelected.disabled)) return;
  const selected = Array.from(gallery.querySelectorAll('[data-select-object]:checked'), checkbox => checkbox.value);
  if (!all && selected.length === 0) return;
  const currentJobId = jobId;
  const operation = new AbortController();
  spritesheetController = operation;
  clearSpritesheetResult();
  updateSelection();
  spritesheetStatus.textContent = 'Sedang membuat spritesheet di server lokal…';

  const paddingVal = parseInt(spritesheetPadding.value, 10);
  const padding = Number.isInteger(paddingVal) && paddingVal >= 0 && paddingVal <= 64 ? paddingVal : 4;
  const columnsVal = parseInt(spritesheetColumns.value, 10);
  const columns = Number.isInteger(columnsVal) && columnsVal >= 1 && columnsVal <= 16 ? columnsVal : undefined;

  const payload = all ? { all: true, padding } : { object_ids: selected, padding };
  if (columns) payload.columns = columns;

  try {
    const response = await fetch(`/api/jobs/${currentJobId}/spritesheet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.any([operation.signal, AbortSignal.timeout(15000)]),
    });
    const result = await response.json().catch(() => null);
    if (spritesheetController !== operation || operation.signal.aborted) return;
    if (!response.ok) {
      throw new Error(typeof result?.error?.message === 'string'
        ? result.error.message : 'Server tidak dapat membuat spritesheet.');
    }
    if (!result || !uuid.test(result.spritesheet_id) || result.job_id !== currentJobId
        || result.status !== 'completed'
        || !result.image_url || !result.atlas_url) {
      throw new Error('Respons pembuatan spritesheet tidak valid.');
    }

    spritesheetPreviewImg.src = `${result.image_url}?t=${Date.now()}`;
    spritesheetInfo.textContent = `${result.width} × ${result.height} piksel — ${result.object_ids.length} objek (Padding: ${result.padding}px, Kolom: ${result.columns})`;
    spritesheetDownloadPng.href = result.download_url;
    spritesheetDownloadPng.download = `${result.spritesheet_id}.png`;
    spritesheetDownloadAtlas.href = result.atlas_download_url;
    spritesheetDownloadAtlas.download = `${result.spritesheet_id}.atlas.json`;
    spritesheetResult.hidden = false;
    spritesheetStatus.textContent = 'Spritesheet berhasil dibuat dan siap diunduh!';
  } catch (error) {
    if (spritesheetController !== operation || operation.signal.aborted) return;
    spritesheetStatus.textContent = `Pembuatan spritesheet belum dapat dikonfirmasi: ${error.message}`;
  } finally {
    if (spritesheetController === operation) {
      spritesheetController = null;
      updateSelection();
    }
  }
}

spritesheetSelected.addEventListener('click', () => { void handleSpritesheet(false); });
spritesheetAll.addEventListener('click', () => { void handleSpritesheet(true); });

let currentMaskObject = null;
let currentMaskJobId = null;
let currentMaskCardImg = null;
let currentMaskCardDownload = null;
let maskCtx = null;
let maskUndoStack = [];
let isDrawing = false;
let lastPoint = null;
let sourceCropCanvas = null;
let originalObjectData = null;

function getCanvasCoords(event) {
  const rect = maskCanvas.getBoundingClientRect();
  const scaleX = maskCanvas.width / rect.width;
  const scaleY = maskCanvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function drawStroke(p1, p2) {
  if (!maskCtx) return;
  const tool = document.querySelector('input[name="mask-tool"]:checked')?.value || 'eraser';
  const radius = Math.max(1, Number(maskBrushSize.value) / 2);

  maskCtx.save();
  maskCtx.beginPath();
  maskCtx.lineWidth = radius * 2;
  maskCtx.lineCap = 'round';
  maskCtx.lineJoin = 'round';
  maskCtx.moveTo(p1.x, p1.y);
  maskCtx.lineTo(p2.x, p2.y);

  if (tool === 'eraser') {
    maskCtx.globalCompositeOperation = 'destination-out';
    maskCtx.stroke();
  } else if (tool === 'restore' && sourceCropCanvas) {
    maskCtx.stroke();
    maskCtx.clip();
    maskCtx.drawImage(sourceCropCanvas, 0, 0);
  }
  maskCtx.restore();
}

function handlePointerDown(event) {
  if (event.button !== 0 || !maskCtx) return;
  isDrawing = true;
  maskUndoStack.push(maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height));
  if (maskUndoStack.length > 20) maskUndoStack.shift();
  maskUndo.disabled = false;
  lastPoint = getCanvasCoords(event);
  drawStroke(lastPoint, lastPoint);
  maskCanvas.setPointerCapture?.(event.pointerId);
}

function handlePointerMove(event) {
  if (!isDrawing || !lastPoint) return;
  const current = getCanvasCoords(event);
  drawStroke(lastPoint, current);
  lastPoint = current;
}

function handlePointerUp(event) {
  if (!isDrawing) return;
  isDrawing = false;
  lastPoint = null;
  if (event.pointerId && maskCanvas.hasPointerCapture?.(event.pointerId)) {
    maskCanvas.releasePointerCapture(event.pointerId);
  }
}

function handleUndo() {
  if (maskUndoStack.length === 0 || !maskCtx) return;
  const prev = maskUndoStack.pop();
  maskCtx.putImageData(prev, 0, 0);
  maskUndo.disabled = maskUndoStack.length === 0;
  maskStatus.textContent = 'Goresan terakhir dibatalkan (Undo).';
}

function handleReset() {
  if (!originalObjectData || !maskCtx) return;
  maskCtx.putImageData(originalObjectData, 0, 0);
  maskUndoStack = [];
  maskUndo.disabled = true;
  maskStatus.textContent = 'Mask dikembalikan ke kondisi awal ekstraksi.';
}

async function openMaskEditor(object, label, cardImg, cardDownload) {
  if (!jobId) return;
  currentMaskObject = object;
  currentMaskJobId = jobId;
  currentMaskCardImg = cardImg;
  currentMaskCardDownload = cardDownload;
  maskTitle.textContent = `Koreksi Mask: ${label}`;
  maskUndoStack = [];
  maskUndo.disabled = true;
  maskSave.disabled = true;
  maskStatus.textContent = 'Memuat gambar objek…';
  maskDialog.showModal();

  maskCanvas.width = object.width;
  maskCanvas.height = object.height;
  maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
  maskCtx.clearRect(0, 0, object.width, object.height);

  try {
    sourceCropCanvas = document.createElement('canvas');
    sourceCropCanvas.width = object.width;
    sourceCropCanvas.height = object.height;
    const sCtx = sourceCropCanvas.getContext('2d');
    if (previewImage && previewImage.complete && previewImage.naturalWidth > 0) {
      if (Array.isArray(object.bbox) && object.bbox.length === 4) {
        const [left, top] = object.bbox;
        sCtx.drawImage(previewImage, left, top, object.width, object.height, 0, 0, object.width, object.height);
      } else {
        sCtx.drawImage(previewImage, 0, 0, object.width, object.height);
      }
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Gagal memuat gambar objek dari server.'));
      img.src = cardImg.src;
    });

    maskCtx.drawImage(img, 0, 0);
    originalObjectData = maskCtx.getImageData(0, 0, object.width, object.height);
    maskSave.disabled = false;
    maskStatus.textContent = 'Gunakan Penghapus untuk membuang background atau Kuas Pulihkan untuk mengembalikan bagian foto asli.';
  } catch (err) {
    maskStatus.textContent = `Error: ${err.message}`;
  }
}

async function handleSaveMask() {
  if (!currentMaskObject || !currentMaskJobId || !maskCanvas) return;
  maskSave.disabled = true;
  maskStatus.textContent = 'Menyimpan koreksi mask ke server lokal…';

  try {
    const blob = await new Promise(resolve => maskCanvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Kanvas tidak dapat diubah ke format PNG.');

    const response = await fetch(`/api/jobs/${currentMaskJobId}/objects/${currentMaskObject.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/png' },
      body: blob,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      throw new Error(errData?.error?.message || 'Server gagal menyimpan hasil koreksi mask.');
    }

    const updated = await response.json();
    if (typeof updated.pixel_count === 'number') {
      currentMaskObject.pixel_count = updated.pixel_count;
    }

    const cacheBust = `?t=${Date.now()}`;
    const newUrl = `/api/jobs/${currentMaskJobId}/objects/${currentMaskObject.id}${cacheBust}`;
    currentMaskCardImg.src = newUrl;
    currentMaskCardDownload.href = `/api/jobs/${currentMaskJobId}/objects/${currentMaskObject.id}/download${cacheBust}`;

    maskDialog.close();
  } catch (err) {
    maskStatus.textContent = `Penyimpanan gagal: ${err.message}`;
    maskSave.disabled = false;
  }
}

maskBrushSize?.addEventListener('input', () => {
  if (maskBrushSizeVal) maskBrushSizeVal.textContent = `${maskBrushSize.value} px`;
});
maskClose?.addEventListener('click', () => maskDialog?.close());
maskCancel?.addEventListener('click', () => maskDialog?.close());
maskUndo?.addEventListener('click', handleUndo);
maskReset?.addEventListener('click', handleReset);
maskSave?.addEventListener('click', () => { void handleSaveMask(); });
maskCanvas?.addEventListener('pointerdown', handlePointerDown);
maskCanvas?.addEventListener('pointermove', handlePointerMove);
window.addEventListener('pointerup', handlePointerUp);
window.addEventListener('pointercancel', handlePointerUp);

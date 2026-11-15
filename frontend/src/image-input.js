const input = document.querySelector('#image-input');
const clearButton = document.querySelector('#clear-image');
const status = document.querySelector('#image-status');
const preview = document.querySelector('#image-preview');
const image = document.querySelector('#preview-image');
const details = document.querySelector('#image-details');

const maxBytes = 10 * 1024 * 1024;
const maxSide = 8192;
const maxPixels = 24_000_000;
let selection = 0;
let objectUrl = null;

function clearPreview() {
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

input.addEventListener('change', async () => {
  const current = ++selection;
  clearPreview();
  const file = input.files[0];
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
    status.textContent = 'Preview siap. Gambar tetap lokal di browser dan belum dikirim ke server.';
  } catch (error) {
    if (current !== selection) return;
    clearPreview();
    status.textContent = error.message;
    input.value = '';
    clearButton.disabled = true;
  }
});

clearButton.addEventListener('click', () => {
  ++selection;
  clearPreview();
  input.value = '';
  clearButton.disabled = true;
  status.textContent = 'Belum ada gambar dipilih.';
});

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const sharp = (await import(pathToFileURL(resolve('backend/node_modules/sharp/dist/index.mjs')).href)).default;
const { createApp } = await import(pathToFileURL(resolve('backend/src/app.js')).href);

// Fixture generator for synthetic source PNG and category PNG
async function createSourceFixture(width = 200, height = 300) {
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const isBody = x >= 50 && x <= 150 && y >= 50 && y <= 250;
      data[idx] = isBody ? x : 0;
      data[idx + 1] = isBody ? y % 256 : 0;
      data[idx + 2] = isBody ? 240 : 0;
      const translucent = x >= 80 && x < 95 && y >= 140 && y < 160;
      data[idx + 3] = isBody ? (translucent ? 128 : 255) : 0;
    }
  }
  return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

function findBrowser() {
  const candidates = [
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error('No compatible browser executable found.');
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    this.consoleLogs = [];
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        if (msg.method === 'Runtime.consoleAPICalled') {
          this.consoleLogs.push(msg.params);
        }
        this.events.push(msg);
      }
    };
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression, ...args) {
    const exprString = typeof expression === 'function'
      ? `(${expression.toString()})(${args.map(a => JSON.stringify(a)).join(',')})`
      : expression;
    const res = await this.send('Runtime.evaluate', {
      expression: exprString,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval failed: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  close() {
    if (this.ws) {
      try { this.ws.close(); } catch {}
    }
  }
}

async function waitFor(fn, timeoutMs = 15000, intervalMs = 250) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fn();
      if (res) return res;
    } catch {}
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error(`Timeout waiting for condition after ${timeoutMs}ms`);
}

async function main() {
  console.log('=== Starting Automated Headless Browser Smoke Test for M7 Spritesheet ===');
  const tempDir = await mkdtemp(join(tmpdir(), 'immo-smoke-m7-'));
  const uploadDir = join(tempDir, 'uploads');
  const jobDir = join(tempDir, 'jobs');
  await mkdir(uploadDir, { recursive: true });
  await mkdir(jobDir, { recursive: true });

  let backendServer = null;
  let frontendServer = null;
  let browserProcess = null;
  let pageCdp = null;

  try {
    // 1. Mock AI Client & Express Backend
    console.log('1. Setting up mock AI client and Express backend...');
    const mockAiClient = {
      async health() {
        return { status: 'ok', service: 'ai-service', model_loaded: true };
      },
      async extractPath({ imagePath, outputPath, saveMaskPath, objectsDir }) {
        const meta = await sharp(imagePath).metadata();
        const width = meta.width;
        const height = meta.height;

        // Write foreground
        await sharp(imagePath).ensureAlpha().png().toFile(outputPath);
        // Write mask
        await sharp({ create: { width, height, channels: 3, background: 'white' } }).png().toFile(saveMaskPath);

        // Write category PNG for Upper-clothes (class_id 4)
        if (objectsDir) {
          await mkdir(objectsDir, { recursive: true });
          const catBbox = [50, 70, 150, 170];
          const catW = catBbox[2] - catBbox[0];
          const catH = catBbox[3] - catBbox[1];
          const catPixels = Buffer.alloc(catW * catH * 4);
          for (let i = 0; i < catW * catH; i++) {
            catPixels[i * 4] = 60;
            catPixels[i * 4 + 1] = 120;
            catPixels[i * 4 + 2] = 200;
            catPixels[i * 4 + 3] = 255;
          }
          await sharp(catPixels, { raw: { width: catW, height: catH, channels: 4 } })
            .png()
            .toFile(join(objectsDir, 'atr-4.png'));

          return {
            status: 'success',
            original_size: [width, height],
            categories_present: ['Upper-clothes'],
            category_pixel_counts: { 'Upper-clothes': catW * catH },
            objects: [
              {
                class_id: 4,
                category: 'Upper-clothes',
                file: 'objects/atr-4.png',
                bbox: catBbox,
                width: catW,
                height: catH,
                pixel_count: catW * catH,
              },
            ],
            execution_time_seconds: 0.05,
          };
        }

        return {
          status: 'success',
          original_size: [width, height],
          categories_present: [],
          category_pixel_counts: {},
          objects: [],
          execution_time_seconds: 0.05,
        };
      },
    };

    const backendApp = createApp({
      uploadDir,
      jobDir,
      aiClient: mockAiClient,
      aiTimeoutMs: 15000,
    });

    const backendPort = await new Promise(res => {
      backendServer = backendApp.listen(0, '127.0.0.1', () => {
        res(backendServer.address().port);
      });
    });
    console.log(`   Express backend listening on http://127.0.0.1:${backendPort}`);

    // 2. Frontend Static Server
    console.log('2. Starting frontend static server pointing to frontend/dist...');
    const distDir = resolve('frontend/dist');
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.png': 'image/png',
      '.json': 'application/json',
    };

    frontendServer = http.createServer((req, res) => {
      if (req.url.startsWith('/api/')) {
        const proxyReq = http.request(
          `http://127.0.0.1:${backendPort}${req.url}`,
          {
            method: req.method,
            headers: req.headers,
          },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
          }
        );
        req.pipe(proxyReq);
        proxyReq.on('error', (err) => {
          res.writeHead(502, { 'Content-Type': 'text/plain' });
          res.end(`Proxy error: ${err.message}`);
        });
        return;
      }

      const cleanUrl = req.url.split('?')[0];
      const filePath = join(distDir, cleanUrl === '/' ? 'index.html' : cleanUrl);
      if (!filePath.startsWith(distDir) || !existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      const ext = extname(filePath);
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      createReadStream(filePath).pipe(res);
    });

    const frontendPort = await new Promise(res => {
      frontendServer.listen(0, '127.0.0.1', () => {
        res(frontendServer.address().port);
      });
    });
    console.log(`   Frontend server + API proxy listening on http://127.0.0.1:${frontendPort}`);

    // 3. Launch headless browser
    console.log('3. Launching headless browser with CDP...');
    const browserBin = findBrowser();
    console.log(`   Using browser binary: ${browserBin}`);
    const browserUserData = join(tempDir, 'browser-profile');
    await mkdir(browserUserData, { recursive: true });

    browserProcess = spawn(browserBin, [
      '--headless=new',
      '--remote-debugging-port=0',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${browserUserData}`,
      'about:blank',
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    const portFile = join(browserUserData, 'DevToolsActivePort');
    const portContent = await waitFor(async () => {
      if (existsSync(portFile)) {
        const text = await readFile(portFile, 'utf8');
        const lines = text.trim().split('\n');
        if (lines.length >= 2) return lines;
      }
      return null;
    }, 10000, 100);

    const cdpPort = parseInt(portContent[0].trim(), 10);
    const browserWsPath = portContent[1].trim();
    const browserWsUrl = `ws://127.0.0.1:${cdpPort}${browserWsPath}`;

    const browserCdp = new CdpClient(browserWsUrl);
    await browserCdp.connect();
    const targets = await browserCdp.send('Target.getTargets');
    const pageTarget = targets.targetInfos.find(t => t.type === 'page');
    assert.ok(pageTarget, 'Must find a page target');
    const pageWsUrl = `ws://127.0.0.1:${cdpPort}/devtools/page/${pageTarget.targetId}`;

    pageCdp = new CdpClient(pageWsUrl);
    await pageCdp.connect();
    await pageCdp.send('Page.enable');
    await pageCdp.send('Runtime.enable');

    // 4. Navigate to frontend
    console.log(`4. Navigating to http://127.0.0.1:${frontendPort}...`);
    await pageCdp.send('Page.navigate', { url: `http://127.0.0.1:${frontendPort}` });
    await waitFor(async () => {
      const readyState = await pageCdp.evaluate('document.readyState');
      return readyState === 'complete';
    });

    // 5. Verify UI Backend Status
    console.log('5. Verifying UI service status checks...');
    await waitFor(async () => {
      const text = await pageCdp.evaluate("document.querySelector('#backend-status')?.textContent");
      return text && text.includes('Terhubung');
    });

    // 6. Upload synthetic fixture
    console.log('6. Uploading synthetic image fixture to file input...');
    const fixturePng = await createSourceFixture(200, 300);
    const fixturePath = join(tempDir, 'input-fixture.png');
    await writeFile(fixturePath, fixturePng);

    const doc = await pageCdp.send('DOM.getDocument');
    const inputNode = await pageCdp.send('DOM.querySelector', {
      nodeId: doc.root.nodeId,
      selector: '#image-input',
    });
    await pageCdp.send('DOM.setFileInputFiles', {
      files: [fixturePath],
      nodeId: inputNode.nodeId,
    });

    await waitFor(async () => {
      const btn = await pageCdp.evaluate("document.querySelector('#extract-objects')?.disabled === false");
      return btn;
    });

    // 7. Trigger object extraction
    console.log('7. Triggering object extraction...');
    await pageCdp.evaluate("document.querySelector('#extract-objects').click()");
    await waitFor(async () => {
      const count = await pageCdp.evaluate("document.querySelectorAll('#object-gallery li').length");
      return count === 2;
    });
    console.log('   Extraction completed: 2 cards rendered.');

    // 8. Verify Spritesheet Controls
    console.log('8. Verifying Spritesheet UI controls (M7)...');
    const spritesheetUi = await pageCdp.evaluate(() => {
      const pad = document.querySelector('#spritesheet-padding');
      const col = document.querySelector('#spritesheet-columns');
      const btnSel = document.querySelector('#spritesheet-selected');
      const btnAll = document.querySelector('#spritesheet-all');
      const res = document.querySelector('#spritesheet-result');
      return {
        paddingExists: !!pad,
        paddingVal: pad?.value,
        columnsExists: !!col,
        selectedDisabled: btnSel?.disabled,
        allDisabled: btnAll?.disabled,
        resultHidden: res?.hidden,
      };
    });
    assert.equal(spritesheetUi.paddingExists, true);
    assert.equal(spritesheetUi.paddingVal, '4');
    assert.equal(spritesheetUi.columnsExists, true);
    assert.equal(spritesheetUi.selectedDisabled, true); // no checkboxes checked initially
    assert.equal(spritesheetUi.allDisabled, false); // cards exist, all is enabled
    assert.equal(spritesheetUi.resultHidden, true);

    // 9. Generate Spritesheet (All) with custom padding = 6, columns = 2
    console.log('9. Generating Spritesheet for All objects (padding: 6, columns: 2)...');
    await pageCdp.evaluate(() => {
      document.querySelector('#spritesheet-padding').value = '6';
      document.querySelector('#spritesheet-columns').value = '2';
      document.querySelector('#spritesheet-all').click();
    });

    // Wait for completion
    await waitFor(async () => {
      const statusText = await pageCdp.evaluate("document.querySelector('#spritesheet-status')?.textContent");
      return statusText && statusText.includes('Spritesheet berhasil dibuat');
    });

    const spritesheetReport = await pageCdp.evaluate(() => {
      const res = document.querySelector('#spritesheet-result');
      const img = document.querySelector('#spritesheet-preview-img');
      const info = document.querySelector('#spritesheet-info');
      const dlPng = document.querySelector('#spritesheet-download-png');
      const dlAtlas = document.querySelector('#spritesheet-download-atlas');
      return {
        resultHidden: res?.hidden,
        imgSrc: img?.getAttribute('src'),
        imgNaturalWidth: img?.naturalWidth,
        imgNaturalHeight: img?.naturalHeight,
        infoText: info?.textContent,
        pngHref: dlPng?.getAttribute('href'),
        pngDownload: dlPng?.getAttribute('download'),
        atlasHref: dlAtlas?.getAttribute('href'),
        atlasDownload: dlAtlas?.getAttribute('download'),
      };
    });

    console.log('   Spritesheet All report:', JSON.stringify(spritesheetReport, null, 2));
    assert.equal(spritesheetReport.resultHidden, false);
    assert.ok(spritesheetReport.imgNaturalWidth > 0);
    assert.ok(spritesheetReport.imgNaturalHeight > 0);
    assert.ok(spritesheetReport.pngHref.includes('/spritesheets/'));
    assert.ok(spritesheetReport.atlasHref.includes('/atlas'));

    // 10. Direct download verification for Spritesheet PNG & Atlas JSON
    console.log('10. Testing direct file download from browser context...');
    const dlPngCheck = await pageCdp.evaluate(async (url) => {
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      return {
        status: res.status,
        ct: res.headers.get('content-type'),
        cd: res.headers.get('content-disposition'),
        bytes: buf.byteLength,
      };
    }, spritesheetReport.pngHref);

    console.log('   PNG Download check:', dlPngCheck);
    assert.equal(dlPngCheck.status, 200);
    assert.equal(dlPngCheck.ct, 'image/png');
    assert.ok(dlPngCheck.bytes > 100);

    const dlAtlasCheck = await pageCdp.evaluate(async (url) => {
      const res = await fetch(url);
      const data = await res.json();
      return {
        status: res.status,
        ct: res.headers.get('content-type'),
        hasMeta: !!data?.meta,
        framesCount: Object.keys(data?.frames || {}).length,
        metaFormat: data?.meta?.format,
      };
    }, spritesheetReport.atlasHref);

    console.log('   Atlas JSON Download check:', dlAtlasCheck);
    assert.equal(dlAtlasCheck.status, 200);
    assert.equal(dlAtlasCheck.hasMeta, true);
    assert.equal(dlAtlasCheck.framesCount, 2);
    assert.equal(dlAtlasCheck.metaFormat, 'RGBA8888');

    // 11. Test Spritesheet Pilihan (selection)
    console.log('11. Testing Spritesheet for selected objects...');
    await pageCdp.evaluate(() => {
      // Check only the first card checkbox
      const firstCheck = document.querySelector('#object-gallery li input[type="checkbox"]');
      if (firstCheck) {
        firstCheck.checked = true;
        firstCheck.dispatchEvent(new Event('change', { bubbles: true }));
      }
      document.querySelector('#spritesheet-selected').click();
    });

    await waitFor(async () => {
      const statusText = await pageCdp.evaluate("document.querySelector('#spritesheet-status')?.textContent");
      return statusText && statusText.includes('Spritesheet berhasil dibuat');
    });

    const singleAtlas = await pageCdp.evaluate(async () => {
      const atlasHref = document.querySelector('#spritesheet-download-atlas')?.getAttribute('href');
      const res = await fetch(atlasHref);
      const data = await res.json();
      return Object.keys(data?.frames || {}).length;
    });
    console.log(`   Single selection atlas frames count: ${singleAtlas}`);
    assert.equal(singleAtlas, 1);

    // Regression: a stationary eraser click must remove a brush-sized disk,
    // remain undoable, and persist through the real backend PNG endpoint.
    console.log('11b. Testing mask eraser click, Undo, drag, and saved PNG...');
    await pageCdp.evaluate(() => {
      document.querySelector('#object-gallery li [data-edit-mask-button]').click();
    });
    await waitFor(() => pageCdp.evaluate(() => {
      return document.querySelector('#mask-editor-dialog').open
        && !document.querySelector('#mask-editor-save').disabled;
    }));
    const maskPoint = await pageCdp.evaluate(() => {
      const canvas = document.querySelector('#mask-editor-canvas');
      const rect = canvas.getBoundingClientRect();
      return {
        x: rect.left + 100 * rect.width / canvas.width,
        y: rect.top + 150 * rect.height / canvas.height,
        scale: rect.width / canvas.width,
      };
    });
    const readMaskAlpha = (x, y) => pageCdp.evaluate((x, y) => {
      return document.querySelector('#mask-editor-canvas')
        .getContext('2d').getImageData(x, y, 1, 1).data[3];
    }, x, y);
    const eraseGesture = async (start, end = start) => {
      await pageCdp.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved', x: start.x, y: start.y,
      });
      await pageCdp.send('Input.dispatchMouseEvent', {
        type: 'mousePressed', x: start.x, y: start.y,
        button: 'left', buttons: 1, clickCount: 1,
      });
      if (end !== start) {
        await pageCdp.send('Input.dispatchMouseEvent', {
          type: 'mouseMoved', x: end.x, y: end.y, button: 'left', buttons: 1,
        });
      }
      await pageCdp.send('Input.dispatchMouseEvent', {
        type: 'mouseReleased', x: end.x, y: end.y,
        button: 'left', buttons: 0, clickCount: 1,
      });
    };
    assert.equal(await readMaskAlpha(100, 150), 255);
    await eraseGesture(maskPoint);
    assert.equal(await readMaskAlpha(100, 150), 0, 'Click erases center');
    assert.equal(await readMaskAlpha(104, 150), 0, 'Click erases inside brush radius');
    assert.equal(await readMaskAlpha(110, 150), 255, 'Click preserves outside brush radius');
    await pageCdp.evaluate("document.querySelector('#mask-undo').click()");
    assert.equal(await readMaskAlpha(100, 150), 255, 'Undo restores clicked pixel');
    await eraseGesture(
      { x: maskPoint.x - 20 * maskPoint.scale, y: maskPoint.y },
      { x: maskPoint.x + 20 * maskPoint.scale, y: maskPoint.y },
    );
    assert.equal(await readMaskAlpha(100, 150), 0, 'Drag still erases its midpoint');
    await pageCdp.evaluate("document.querySelector('#mask-undo').click()");
    assert.equal(await readMaskAlpha(100, 150), 255, 'Undo restores dragged pixel');
    await eraseGesture(maskPoint);
    await pageCdp.evaluate("document.querySelector('#mask-editor-save').click()");
    await waitFor(() => pageCdp.evaluate("!document.querySelector('#mask-editor-dialog').open"));
    const correctedUrl = await pageCdp.evaluate(
      "document.querySelector('#object-gallery li [data-download-original]').getAttribute('href')",
    );
    const correctedResponse = await fetch(`http://127.0.0.1:${backendPort}${correctedUrl}`);
    assert.equal(correctedResponse.status, 200);
    const corrected = await sharp(Buffer.from(await correctedResponse.arrayBuffer()))
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(corrected.info.width, 200);
    assert.equal(corrected.info.height, 300);
    assert.equal(corrected.data[(150 * 200 + 100) * 4 + 3], 0, 'Saved PNG retains click erasure');
    assert.equal(corrected.data[(150 * 200 + 110) * 4 + 3], 255, 'Saved PNG retains surrounding pixels');
    console.log('   PASS: eraser click radius, Undo, drag, and persisted PNG alpha.');

    console.log('11c. Testing Restore brush RGB/alpha, bounds, Undo, and cropped objects...');
    const readMaskPixel = (x, y) => pageCdp.evaluate((x, y) => {
      return Array.from(document.querySelector('#mask-editor-canvas')
        .getContext('2d').getImageData(x, y, 1, 1).data);
    }, x, y);
    // Canvas-normalized source pixels account for browser premultiplied-alpha rounding.
    const sourcePixels = await pageCdp.evaluate(() => {
      const image = document.querySelector('#preview-image');
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      return [[100, 150], [90, 150], [40, 150]].map(([x, y]) =>
        Array.from(ctx.getImageData(x, y, 1, 1).data));
    });
    const openMask = async (cardIndex) => {
      await pageCdp.evaluate(index => {
        document.querySelectorAll('#object-gallery li [data-edit-mask-button]')[index].click();
      }, cardIndex);
      await waitFor(() => pageCdp.evaluate(() =>
        document.querySelector('#mask-editor-dialog').open
          && !document.querySelector('#mask-editor-save').disabled));
      const box = await pageCdp.evaluate(() => {
        const c = document.querySelector('#mask-editor-canvas');
        const r = c.getBoundingClientRect();
        return { x: r.left, y: r.top, sx: r.width / c.width, sy: r.height / c.height };
      });
      return (x, y) => ({ x: box.x + x * box.sx, y: box.y + y * box.sy });
    };
    const selectMaskTool = tool => pageCdp.evaluate(value => {
      document.querySelector(`input[name="mask-tool"][value="${value}"]`).click();
    }, tool);
    const undoMask = () => pageCdp.evaluate("document.querySelector('#mask-undo').click()");
    const saveMask = async (cardIndex) => {
      await pageCdp.evaluate("document.querySelector('#mask-editor-save').click()");
      await waitFor(() => pageCdp.evaluate("!document.querySelector('#mask-editor-dialog').open"));
      const url = await pageCdp.evaluate(index =>
        document.querySelectorAll('#object-gallery li [data-download-original]')[index]
          .getAttribute('href'), cardIndex);
      const response = await fetch(`http://127.0.0.1:${backendPort}${url}`);
      assert.equal(response.status, 200);
      return sharp(Buffer.from(await response.arrayBuffer()))
        .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    };
    const pngPixel = (png, x, y) => Array.from(
      png.data.subarray((y * png.info.width + x) * 4, (y * png.info.width + x) * 4 + 4),
    );
    const foregroundPoint = await openMask(0);
    await selectMaskTool('restore');
    await eraseGesture(foregroundPoint(100, 150));
    assert.deepEqual(await readMaskPixel(100, 150), sourcePixels[0], 'Restore click recovers source RGBA');
    await undoMask();
    assert.equal(await readMaskAlpha(100, 150), 0, 'Undo restore click recovers erased mask');
    await selectMaskTool('eraser');
    await eraseGesture(foregroundPoint(60, 150), foregroundPoint(140, 150));
    await selectMaskTool('restore');
    await eraseGesture(foregroundPoint(100, 150));
    assert.deepEqual(await readMaskPixel(100, 150), sourcePixels[0]);
    assert.equal(await readMaskAlpha(110, 150), 0, 'Restore click leaves outside radius erased');
    await undoMask();
    await eraseGesture(foregroundPoint(80, 150), foregroundPoint(120, 150));
    assert.deepEqual(await readMaskPixel(100, 150), sourcePixels[0], 'Drag restores RGB, not black stroke');
    assert.deepEqual(await readMaskPixel(90, 150), sourcePixels[1], 'Drag restores source partial alpha');
    assert.equal(await readMaskAlpha(70, 150), 0, 'Restore drag preserves outside its capsule');
    await undoMask();
    assert.equal(await readMaskAlpha(100, 150), 0, 'Undo restore drag recovers erased band');
    await eraseGesture(foregroundPoint(80, 150), foregroundPoint(120, 150));
    await eraseGesture(foregroundPoint(80, 150), foregroundPoint(120, 150));
    assert.deepEqual(await readMaskPixel(90, 150), sourcePixels[1], 'Repeated restore must not accumulate alpha');
    await eraseGesture(foregroundPoint(40, 150));
    assert.deepEqual(await readMaskPixel(40, 150), sourcePixels[2], 'Transparent source must not paint black');
    const restoredForeground = await saveMask(0);
    assert.deepEqual(pngPixel(restoredForeground, 100, 150), sourcePixels[0]);
    assert.deepEqual(pngPixel(restoredForeground, 90, 150), sourcePixels[1]);
    assert.deepEqual(pngPixel(restoredForeground, 40, 150), sourcePixels[2]);
    assert.equal(pngPixel(restoredForeground, 70, 150)[3], 0);
    const categoryPoint = await openMask(1);
    const categoryOriginal = await readMaskPixel(50, 80);
    await eraseGesture(categoryPoint(50, 80));
    assert.deepEqual(await readMaskPixel(50, 80), sourcePixels[0], 'Cropped object uses source bbox offset');
    assert.deepEqual(await readMaskPixel(60, 80), categoryOriginal, 'Outside cropped brush remains unchanged');
    await undoMask();
    assert.deepEqual(await readMaskPixel(50, 80), categoryOriginal);
    await eraseGesture(categoryPoint(30, 60), categoryPoint(70, 100));
    assert.deepEqual(await readMaskPixel(50, 80), sourcePixels[0], 'Diagonal drag restores source');
    assert.deepEqual(await readMaskPixel(50, 95), categoryOriginal, 'Diagonal drag leaves outside unchanged');
    const restoredCategory = await saveMask(1);
    assert.equal(restoredCategory.info.width, 100);
    assert.equal(restoredCategory.info.height, 100);
    assert.deepEqual(pngPixel(restoredCategory, 50, 80), sourcePixels[0]);
    assert.deepEqual(pngPixel(restoredCategory, 50, 95), categoryOriginal);
    console.log('   PASS: Restore click/drag, source RGBA, bounds, Undo, repeated alpha, bbox and saved PNG.');

    // 12. Screenshot proof
    console.log('12. Capturing proof screenshot...');
    const screenshot = await pageCdp.send('Page.captureScreenshot', { format: 'png' });
    const proofPath = resolve('scratch/proof_smoke_m7_spritesheet.png');
    await mkdir(resolve('scratch'), { recursive: true });
    await writeFile(proofPath, Buffer.from(screenshot.data, 'base64'));
    console.log(`   Proof screenshot saved to: ${proofPath}`);

    // 13. Test reset lifecycle
    console.log('13. Testing reset / upload lifecycle cleanup...');
    await pageCdp.evaluate(() => {
      document.querySelector('#clear-image').click();
    });
    await waitFor(async () => {
      const count = await pageCdp.evaluate("document.querySelectorAll('#object-gallery li').length");
      return count === 0;
    });
    const resetResultHidden = await pageCdp.evaluate("document.querySelector('#spritesheet-result')?.hidden");
    assert.equal(resetResultHidden, true);
    console.log('   Gallery cards and spritesheet result cleared cleanly.');

    // 14. Check console logs
    assert.equal(pageCdp.consoleLogs.length, 0, 'No console errors expected.');
    console.log('=== ALL M7 SMOKE TEST STAGES SUCCEEDED 100% ===');
  } finally {
    if (pageCdp) pageCdp.close();
    if (browserProcess) {
      try { browserProcess.kill(); } catch {}
    }
    if (frontendServer) {
      try { frontendServer.close(); } catch {}
    }
    if (backendServer) {
      try { backendServer.close(); } catch {}
    }
    try { await rm(tempDir, { recursive: true, force: true }); } catch {}
  }
}

main().catch(err => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});

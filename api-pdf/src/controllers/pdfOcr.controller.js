// src/controllers/pdfOcr.controller.js

const { createCanvas } = require("canvas");
const util = require("util");

const fs = require("fs");
const os = require("os");
const path = require("path");
const { promisify } = require("util");
const { execFile } = require("child_process");
const execFileAsync = promisify(execFile);

let _pdfjsLibPromise = null;

async function getPdfJs() {
  if (_pdfjsLibPromise) return _pdfjsLibPromise;

  _pdfjsLibPromise = (async () => {
    try {
      console.log("[OCR] Tentando importar: pdfjs-dist/legacy/build/pdf.mjs");
      const mod = await import("pdfjs-dist/legacy/build/pdf.mjs");
      console.log("[OCR] OK (ESM) pdf.mjs");
      return mod;
    } catch (e1) {
      console.log("[OCR] Falhou pdf.mjs:", e1.message);
    }

    try {
      console.log("[OCR] Tentando require: pdfjs-dist/legacy/build/pdf.js");
      // eslint-disable-next-line global-require
      const mod = require("pdfjs-dist/legacy/build/pdf.js");
      console.log("[OCR] OK (CJS) pdf.js");
      return mod;
    } catch (e2) {
      console.log("[OCR] Falhou pdf.js:", e2.message);
    }

    try {
      console.log("[OCR] Tentando require: pdfjs-dist/legacy/build/pdf");
      // eslint-disable-next-line global-require
      const mod = require("pdfjs-dist/legacy/build/pdf");
      console.log("[OCR] OK (CJS) pdf");
      return mod;
    } catch (e3) {
      console.log("[OCR] Falhou pdf:", e3.message);
    }

    throw new Error(
      "Não consegui importar o PDF.js do pdfjs-dist. Verifique node_modules/pdfjs-dist/legacy/build."
    );
  })();

  return _pdfjsLibPromise;
}

function base64ToPdfBuffer(base64) {
  if (!base64 || typeof base64 !== "string") {
    throw new Error("Campo 'base64' ausente ou inválido.");
  }

  const clean = base64.replace(/^data:application\/pdf;base64,/, "").trim();
  const normalized = clean.replace(/\s/g, "");
  const buf = Buffer.from(normalized, "base64");

  const header = buf.subarray(0, 8).toString("utf8");
  console.log("[OCR] PDF header:", header);

  if (!header.includes("%PDF")) {
    throw new Error("Base64 decodificou, mas não parece PDF válido (%PDF ausente).");
  }

  return buf;
}

// ============================
// Fallback Poppler (pdftoppm)
// ============================
function mkTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ocrpdf-"));
}

function safeRm(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {}
}

async function renderPdfPagesToPngDataUrlsWithPdftoppm(pdfBuffer, { dpi = 220, maxPages = 1 } = {}) {
  console.log("[OCR] Fallback pdftoppm: iniciando PDF -> PNG");

  const dir = mkTmpDir();
  const inputPdf = path.join(dir, "input.pdf");
  fs.writeFileSync(inputPdf, pdfBuffer);

  const outPrefix = path.join(dir, "page");

  try {
    await execFileAsync("pdftoppm", [
      "-png",
      "-r", String(dpi),
      "-f", "1",
      "-l", String(maxPages),
      inputPdf,
      outPrefix
    ]);
  } catch (err) {
    console.error("[OCR] pdftoppm falhou:", err.message);
    console.error(err.stderr || "");
    safeRm(dir);
    throw new Error("pdftoppm não executou. Verifique se poppler-utils está instalado no ambiente.");
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => /^page-\d+\.png$/i.test(f))
    .sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10));

  console.log("[OCR] pdftoppm gerou:", files);

  const pages = files.map((f, idx) => {
    const fp = path.join(dir, f);
    const buf = fs.readFileSync(fp);
    console.log(`[OCR] pdftoppm PNG ${idx + 1} length:`, buf.length);

    return {
      page: idx + 1,
      dataUrl: `data:image/png;base64,${buf.toString("base64")}`
    };
  });

  safeRm(dir);

  return { pagesProcessed: pages.length, totalPages: pages.length, pages };
}

// ============================
// Render: PDF.js -> (se falhar) pdftoppm
// ============================
async function renderPdfPagesToPngDataUrls(pdfBuffer, { scale = 2.0, maxPages = 1 } = {}) {
  try {
    const pdfjsLib = await getPdfJs();

    console.log("[OCR] Iniciando pdfjs.getDocument");
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      disableWorker: true
    });

    const pdf = await loadingTask.promise;
    console.log("[OCR] PDF carregado. Total páginas:", pdf.numPages);

    const totalPages = Math.min(pdf.numPages, maxPages);
    const pages = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      console.log(`[OCR] Renderizando página ${pageNum}`);

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      console.log("[OCR] Viewport:", viewport.width, viewport.height);

      const canvas = createCanvas(viewport.width, viewport.height);
      const ctx = canvas.getContext("2d");

      await page.render({ canvasContext: ctx, viewport }).promise;

      const pngBuffer = canvas.toBuffer("image/png");
      console.log("[OCR] PNG buffer length:", pngBuffer.length);

      const dataUrl = `data:image/png;base64,${pngBuffer.toString("base64")}`;
      pages.push({ page: pageNum, dataUrl });
    }

    return { pagesProcessed: totalPages, totalPages: pdf.numPages, pages };
  } catch (err) {
    const msg = String(err?.message || "");
    console.error("[OCR] PDF.js render falhou:", msg);

    // ✅ Aqui é a correção importante: cair no fallback também em AbortException
    const shouldFallback =
      msg.includes("Image or Canvas expected") ||
      msg.includes("AbortException") ||
      msg.toLowerCase().includes("abort");

    if (shouldFallback) {
      console.log("[OCR] Usando fallback: pdftoppm (poppler)");
      return await renderPdfPagesToPngDataUrlsWithPdftoppm(pdfBuffer, {
        dpi: 220,
        maxPages
      });
    }

    throw err;
  }
}

// ============================
// OCR: Tesseract.js (DataURL)
// ============================
async function ocrDataUrls(pages, lang = "por") {
  const { createWorker } = require("tesseract.js");

  // ✅ pega caminho via env (pro docker)
  const langPath = process.env.TESS_LANG_PATH || process.env.TESSDATA_PREFIX || "/app/tessdata";
  console.log("[OCR] langPath:", langPath);

  console.log("[OCR] Criando worker tesseract com idioma:", lang);

  // ✅ cria worker já com idioma (API do tesseract.js v5+)
  const worker = await createWorker(lang, 1, {
    langPath,
    cachePath: langPath,
    gzip: false
  });

  try {
    let fullText = "";

    for (const p of pages) {
      console.log(`[OCR] OCR página ${p.page} (dataUrl length=${p.dataUrl.length})`);

      const result = await worker.recognize(p.dataUrl);
      console.log("[OCR] OCR result (depth=1):", util.inspect(result, { depth: 1 }));

      const pageText = (result?.data?.text || "").trim();
      fullText += `\n\n===== page ${p.page} =====\n${pageText}`;
    }

    return fullText.trim();
  } finally {
    console.log("[OCR] Finalizando worker");
    await worker.terminate();
  }
}

// =======================================================
// 1) Endpoint HTTP (se você tiver rota /ocr-base64)
// =======================================================
exports.extractTextFromBase64Ocr = async (req, res) => {
  try {
    console.log("======================================");
    console.log("[OCR] NOVA REQUISIÇÃO (HTTP)");
    console.log("[OCR] Node:", process.version);
    console.log("[OCR] Plataforma:", process.platform);
    console.log("[OCR] Arquitetura:", process.arch);

    const { base64, lang, scale, maxPages } = req.body || {};
    console.log("[OCR] Params:", { lang, scale, maxPages });

    const pdfBuffer = base64ToPdfBuffer(base64);

    const render = await renderPdfPagesToPngDataUrls(pdfBuffer, {
      scale: typeof scale === "number" ? scale : 1.5,
      maxPages: typeof maxPages === "number" ? maxPages : 1
    });

    const text = await ocrDataUrls(render.pages, lang || "por");

    return res.json({
      success: true,
      metodo: "ocr-npm-dataurl-poppler-fallback",
      pagesProcessed: render.pagesProcessed,
      totalPages: render.totalPages,
      texto: text
    });
  } catch (err) {
    console.error("❌ [OCR] ERRO FINAL (HTTP)");
    console.error(err);
    console.error(err.stack);

    return res.status(500).json({
      success: false,
      message: "Erro ao executar OCR no PDF (base64).",
      error: err.message,
      stack: err.stack
    });
  }
};

// =======================================================
// 2) Função interna (SEM HTTP) -> usada por /pdf/text e Fluig
// =======================================================
exports.ocrFromBase64 = async (base64, { lang = "por", scale = 1.5, maxPages = 1 } = {}) => {
  console.log("======================================");
  console.log("[OCR] NOVA REQUISIÇÃO (INTERNA)");
  console.log("[OCR] Node:", process.version);
  console.log("[OCR] Plataforma:", process.platform);
  console.log("[OCR] Arquitetura:", process.arch);
  console.log("[OCR] Params:", { lang, scale, maxPages });

  const pdfBuffer = base64ToPdfBuffer(base64);

  const render = await renderPdfPagesToPngDataUrls(pdfBuffer, {
    scale: typeof scale === "number" ? scale : 1.5,
    maxPages: typeof maxPages === "number" ? maxPages : 1
  });

  const text = await ocrDataUrls(render.pages, lang || "por");
  return text || "";
};
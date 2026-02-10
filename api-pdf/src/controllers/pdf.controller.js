const { extractTextFromBuffer } = require('../services/pdf.services');
const { base64ToPdfBuffer } = require('../utils/base64ToBuffer');
const pdfOcrController = require('./pdfOcr.controller');

function textoInsuficiente(text) {
  if (!text) return true;

  const clean = String(text).replace(/\s+/g, ' ').trim();
  const semEspaco = clean.replace(/\s/g, '');

  // Heurísticas simples:
  if (semEspaco.length < 30) return true;
  if (clean.includes('-- 1 of 1 --')) return true;

  return false;
}

exports.extractText = async (req, res) => {
  try {
    console.log('================ PDF API ================');
    console.log('Method:', req.method);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Body keys:', Object.keys(req.body || {}));
    console.log('Has file?', !!req.file);

    let pdfBuffer = null;
    let fileName = 'arquivo.pdf';
    let origem = null;

    //  BASE64 (JSON)
    let base64Original = null;
    if (req.body?.fileBase64 || req.body?.base64) {
      origem = 'BASE64';
      fileName = req.body.fileName || fileName;

      base64Original = req.body.fileBase64 || req.body.base64;

      console.log('[BASE64] Nome:', fileName);
      console.log('[BASE64] Tamanho string:', base64Original.length);

      pdfBuffer = base64ToPdfBuffer(base64Original);

      console.log('[BASE64] Buffer criado:', Buffer.isBuffer(pdfBuffer));
      console.log('[BASE64] Buffer size:', pdfBuffer.length);
    }
    // MULTIPART (FORM-DATA)
    else if (req.file?.buffer) {
      origem = 'MULTIPART';
      fileName = req.file.originalname;
      pdfBuffer = req.file.buffer;

      console.log('[MULTIPART] Nome:', fileName);
      console.log('[MULTIPART] Buffer size:', pdfBuffer.length);

      // se vier multipart, gera base64 pra poder chamar OCR também
      base64Original = pdfBuffer.toString('base64');
    }
    // ERRO — NENHUM ARQUIVO
    else {
      console.error('Nenhum arquivo recebido');
      console.log('========================================');

      return res.status(400).json({
        success: false,
        message: 'Nenhum PDF recebido (Base64 ou multipart)'
      });
    }

    // 1) TENTA pdf-parse primeiro
    const result = await extractTextFromBuffer(pdfBuffer);

    let finalText = result.text || '';
    let metodo = 'pdf-parse';

    console.log('PDF processado (pdf-parse). Páginas:', result.pages);

    // 2) SE TEXTO FOR INSUFICIENTE -> OCR
    if (textoInsuficiente(finalText)) {
      console.log(`[PDF API] Texto insuficiente (${origem}). Tentando OCR...`);

      // parâmetros opcionais pro OCR (se você mandar no body)
      const lang = req.body?.lang || 'por';
      const scale = req.body?.scale != null ? Number(req.body.scale) : 1.5;
      const maxPages = req.body?.maxPages != null ? Number(req.body.maxPages) : 1;

      try {
        const ocrText = await pdfOcrController.ocrFromBase64(base64Original, { lang, scale, maxPages });

        if (ocrText && ocrText.trim()) {
          finalText = ocrText;
          metodo = 'ocr';
          console.log('[PDF API] OCR OK. Texto preenchido via OCR.');
        } else {
          console.log('[PDF API] OCR retornou vazio. Mantendo pdf-parse.');
        }
      } catch (e) {
        console.log('[PDF API] OCR falhou. Mantendo pdf-parse. Motivo:', e.message);
      }
    }

    console.log('========================================');

    return res.status(200).json({
      success: true,
      origem,
      metodo,
      fileName,
      pages: result.pages,
      text: finalText
    });

  } catch (error) {
    console.error('ERRO PDF API >>>', error);
    console.log('========================================');

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

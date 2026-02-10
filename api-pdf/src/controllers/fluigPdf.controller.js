const { extractTextFromBuffer } = require('../services/pdf.services');
const { base64ToPdfBuffer } = require('../utils/base64ToBuffer');
const { getFluigDocumentBase64 } = require('../services/fluigSoap.service'); 
const pdfOcrController = require('./pdfOcr.controller');

function precisaOCR(texto) {
  if (!texto) return true;
  const t = String(texto).trim();
  if (!t) return true;
  if (t === '-- 1 of 1 --') return true;
  if (t.length < 30) return true;
  return false;
}

async function executarOCRBase64(base64) {
  const fakeReq = {
    body: {
      base64,
      lang: 'por',
      scale: 1.5,
      maxPages: 3
    }
  };

  let payload = null;
  const fakeRes = {
    status: () => fakeRes,
    json: (data) => { payload = data; }
  };

  await pdfOcrController.extractTextFromBase64Ocr(fakeReq, fakeRes);
  return payload;
}

exports.extractTextFromFluig = async (req, res) => {
  try {
    const { documentId, documentoVersao, colleagueId, nomeArquivo } = req.body || {};
    if (!documentId || documentoVersao == null) {
      return res.status(400).json({ success: false, message: 'Informe "documentId" e "documentoVersao".' });
    }

    const base64 = await getFluigDocumentBase64({ documentId, documentoVersao, colleagueId, nomeArquivo });

    const buffer = base64ToPdfBuffer(base64);
    const result = await extractTextFromBuffer(buffer);

    let textFinal = result.text;
    let metodo = 'pdf-parse';

    if (precisaOCR(textFinal)) {
      console.log('[FLUIG HM] Texto insuficiente, tentando OCR...');

      const ocr = await executarOCRBase64(base64);

      if (ocr?.success && ocr.texto && String(ocr.texto).trim().length > 0) {
        textFinal = ocr.texto;
        metodo = 'ocr';
      } else {
        console.log('[FLUIG HM] OCR falhou ou retornou vazio, mantendo resultado do pdf-parse.');
      }
    }

    return res.json({
      success: true,
      ambiente: 'hm',
      metodo,
      documentId,
      documentoVersao,
      colleagueId,
      nomeArquivo,
      pages: result.pages,
      text: textFinal
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

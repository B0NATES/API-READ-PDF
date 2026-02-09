const { extractTextFromBuffer } = require('../services/pdf.services');
const { base64ToPdfBuffer } = require('../utils/base64ToBuffer');

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
    if (req.body?.fileBase64 || req.body?.base64) {
      origem = 'BASE64';

      fileName = req.body.fileName || fileName;

      let base64 = req.body.fileBase64 || req.body.base64;

      console.log('[BASE64] Nome:', fileName);
      console.log('[BASE64] Tamanho string:', base64.length);

      pdfBuffer = base64ToPdfBuffer(base64);

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

    // PROCESSAMENTO DO PDF (core isolado)
    const result = await extractTextFromBuffer(pdfBuffer);

    console.log('PDF processado com sucesso');
    console.log('Páginas:', result.pages);
    console.log('========================================');

    return res.status(200).json({
      success: true,
      origem,
      fileName,
      pages: result.pages,
      text: result.text
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
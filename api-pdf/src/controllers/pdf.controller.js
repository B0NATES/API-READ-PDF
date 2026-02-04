const { PDFParse } = require('pdf-parse');

exports.extractText = async (req, res) => {
  let parser = null;

  try {
    console.log('================ PDF API ================');
    console.log('Method:', req.method);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Body keys:', Object.keys(req.body || {}));
    console.log('Has file?', !!req.file);

    let pdfBuffer = null;
    let fileName = 'arquivo.pdf';
    let origem = null;

    // =====================================================
    // 1️⃣ RECEBIMENTO VIA BASE64 (JSON)
    // Aceita: fileBase64 OU base64
    // =====================================================
    if (req.body?.fileBase64 || req.body?.base64) {
      origem = 'BASE64';

      fileName = req.body.fileName || fileName;

      let base64 =
        req.body.fileBase64 ||
        req.body.base64;

      console.log('[BASE64] Nome:', fileName);
      console.log('[BASE64] Tamanho string:', base64.length);

      // Remove prefixo data:application/pdf;base64,
      if (base64.indexOf('base64,') !== -1) {
        console.log('[BASE64] Prefixo detectado, removendo...');
        base64 = base64.split('base64,')[1];
      }

      // Remove espaços/quebras
      base64 = base64.replace(/\s/g, '');

      pdfBuffer = Buffer.from(base64, 'base64');

      console.log('[BASE64] Buffer criado:', Buffer.isBuffer(pdfBuffer));
      console.log('[BASE64] Buffer size:', pdfBuffer.length);
    }

    // =====================================================
    // 2️⃣ RECEBIMENTO VIA MULTIPART (FORM-DATA)
    // =====================================================
    else if (req.file?.buffer) {
      origem = 'MULTIPART';

      fileName = req.file.originalname;
      pdfBuffer = req.file.buffer;

      console.log('[MULTIPART] Nome:', fileName);
      console.log('[MULTIPART] Buffer size:', pdfBuffer.length);
    }

    // =====================================================
    // 3️⃣ ERRO — NENHUM ARQUIVO
    // =====================================================
    else {
      console.error('❌ Nenhum arquivo recebido');
      console.log('========================================');

      return res.status(400).json({
        success: false,
        message: 'Nenhum PDF recebido (Base64 ou multipart)'
      });
    }

    // =====================================================
    // 4️⃣ VALIDAÇÃO DO BUFFER
    // =====================================================
    if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
      throw new Error('Conteúdo do PDF inválido ou vazio');
    }

    console.log('Origem:', origem);
    console.log('Arquivo:', fileName);
    console.log('Tamanho final (bytes):', pdfBuffer.length);

    // =====================================================
    // 5️⃣ PROCESSAMENTO DO PDF
    // =====================================================
    parser = new PDFParse({ data: pdfBuffer });

    const result = await parser.getText();

    console.log('PDF processado com sucesso');
    console.log('Páginas:', result.total);
    console.log('========================================');

    return res.status(200).json({
      success: true,
      origem,
      fileName,
      pages: result.total,
      text: result.text
    });

  } catch (error) {
    console.error('❌ ERRO PDF API >>>', error);
    console.log('========================================');

    return res.status(500).json({
      success: false,
      message: error.message
    });

  } finally {
    if (parser) {
      await parser.destroy();
      console.log('Parser destruído');
    }
  }
};

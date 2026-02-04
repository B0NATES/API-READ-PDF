const { PDFParse } = require('pdf-parse');

exports.extractText = async (req, res) => {
  let parser;

  try {
    console.log('================ PDF API ================');
    console.log('Content-Type:', req.headers['content-type']);

    let pdfBuffer;
    let fileName = 'arquivo.pdf';
    let origem = '';

    if (req.body?.fileBase64) {
      origem = 'BASE64';

      fileName = req.body.fileName || fileName;
      pdfBuffer = Buffer.from(req.body.fileBase64, 'base64');
    }

 
    else if (req.file?.buffer) {
      origem = 'MULTIPART';

      fileName = req.file.originalname;
      pdfBuffer = req.file.buffer;
    }

  
    else {
      return res.status(400).json({
        success: false,
        message: 'Nenhum PDF recebido (Base64 ou multipart)'
      });
    }

    console.log('Origem:', origem);
    console.log('Arquivo:', fileName);
    console.log('Tamanho (bytes):', pdfBuffer.length);

    if (!Buffer.isBuffer(pdfBuffer)) {
      throw new Error('Conteúdo do PDF inválido');
    }

    
    parser = new PDFParse({ data: pdfBuffer });

    const result = await parser.getText();

    console.log('PDF processado com sucesso');
    console.log('Páginas:', result.total);

    return res.status(200).json({
      success: true,
      origem,
      fileName,
      pages: result.total,
      text: result.text
    });

  } catch (error) {
    console.error('❌ ERRO PDF API >>>', error);

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

const { PDFParse } = require('pdf-parse');

exports.extractText = async (req, res) => {
  let parser;

  try {
    console.log('Arquivo recebido?', !!req.file);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Arquivo PDF não enviado'
      });
    }

    console.log('Nome:', req.file.originalname);
    console.log('Tipo:', req.file.mimetype);
    console.log('Tamanho:', req.file.size);
    console.log('PDFParse:', typeof PDFParse);

    if (typeof PDFParse !== 'function') {
      throw new Error('PDFParse não é uma classe válida');
    }

    // cria o parser com buffer (igual doc)
    parser = new PDFParse({
      data: req.file.buffer
    });

    const result = await parser.getText();

    return res.status(200).json({
      success: true,
      data: {
        pages: result.total,
        text: result.text
      }
    });

  } catch (error) {
    console.error('ERRO REAL PDF >>>', error);

    return res.status(500).json({
      success: false,
      message: error.message
    });

  } finally {
    // MUITO IMPORTANTE na v2 (libera memória / worker)
    if (parser) {
      await parser.destroy();
    }
  }
};

const { PDFParse } = require('pdf-parse');

/**
 * Core da API: recebe um Buffer de PDF e devolve texto + páginas.
 * Compatível com pdf-parse v2.
 */
async function extractTextFromBuffer(pdfBuffer) {
  if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
    throw new Error('Buffer inválido ou vazio');
  }

  const parser = new PDFParse({ data: pdfBuffer });

  try {
    const result = await parser.getText();

    return {
      pages: result.total,
      text: result.text
    };
  } finally {
    await parser.destroy();
  }
}

module.exports = {
  extractTextFromBuffer
};
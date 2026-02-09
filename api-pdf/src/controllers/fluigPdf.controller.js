const { extractTextFromBuffer } = require('../services/pdf.services');
const { base64ToPdfBuffer } = require('../utils/base64ToBuffer');
const { getFluigDocumentBase64 } = require('../services/fluigSoap.service');

/**
 * Endpoint que:
 * 1) Recebe dados do documento no Fluig (documentId, versão, etc.)
 * 2) Busca o PDF no Fluig via SOAP
 * 3) Converte Base64 -> Buffer
 * 4) Reutiliza o mesmo core de leitura (pdf-parse v2)
 */
exports.extractTextFromFluig = async (req, res) => {
  try {
    const {
      documentId,
      documentoVersao,
      nomeArquivo,
      colleagueId
    } = req.body;

    if (!documentId || !documentoVersao || !nomeArquivo || !colleagueId) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: documentId, documentoVersao, nomeArquivo, colleagueId'
      });
    }

    // 1) SOAP -> Base64
    const base64 = await getFluigDocumentBase64({
      documentId,
      documentoVersao,
      nomeArquivo,
      colleagueId
    });

    // 2) Base64 -> Buffer
    const pdfBuffer = base64ToPdfBuffer(base64);

    // 3) Core de leitura
    const result = await extractTextFromBuffer(pdfBuffer);

    return res.status(200).json({
      success: true,
      origem: 'FLUIG_SOAP',
      documentId,
      documentoVersao,
      nomeArquivo,
      pages: result.pages,
      text: result.text
    });

  } catch (error) {
    console.error('❌ ERRO em extractTextFromFluig >>>', error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
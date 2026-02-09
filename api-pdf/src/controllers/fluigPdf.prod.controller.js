const { extractTextFromBuffer } = require('../services/pdf.services');
const { base64ToPdfBuffer } = require('../utils/base64ToBuffer');
const { getFluigDocumentBase64 } = require('../services/fluigSoap.service.prod');

exports.extractTextFromFluigProd = async (req, res) => {
  try {
    const { documentId, documentoVersao, colleagueId, nomeArquivo } = req.body || {};
    if (!documentId || documentoVersao == null) {
      return res.status(400).json({ success: false, message: 'Informe "documentId" e "documentoVersao".' });
    }

    const base64 = await getFluigDocumentBase64({ documentId, documentoVersao, colleagueId, nomeArquivo });
    const buffer = base64ToPdfBuffer(base64);
    const result = await extractTextFromBuffer(buffer);

    return res.json({
      success: true,
      ambiente: 'prod',
      documentId,
      documentoVersao,
      colleagueId,
      nomeArquivo,
      pages: result.pages,
      text: result.text
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// src/controllers/fluigPdf.prod.controller.js

const { extractTextFromBuffer } = require("../services/pdf.services");
const { base64ToPdfBuffer } = require("../utils/base64ToBuffer");
const { getFluigDocumentBase64 } = require("../services/fluigSoap.service.prod");
const pdfOcrController = require("./pdfOcr.controller");

function textoInsuficiente(text) {
  if (!text) return true;

  const clean = String(text).replace(/\s+/g, " ").trim();
  const semEspaco = clean.replace(/\s/g, "");

  if (semEspaco.length < 30) return true;
  if (clean.includes("-- 1 of 1 --")) return true;

  return false;
}

exports.extractTextFromFluigProd = async (req, res) => {
  try {
    const { documentId, documentoVersao, colleagueId, nomeArquivo } = req.body || {};
    if (!documentId || documentoVersao == null) {
      return res.status(400).json({
        success: false,
        message: 'Informe "documentId" e "documentoVersao".'
      });
    }

    console.log("[FLUIG SOAP] Chamando endpoint: https://myweb.am.sebrae.com.br/webdesk/ECMDocumentService");

    const base64 = await getFluigDocumentBase64({ documentId, documentoVersao, colleagueId, nomeArquivo });
    const buffer = base64ToPdfBuffer(base64);

    // 1) pdf-parse primeiro
    const result = await extractTextFromBuffer(buffer);

    let finalText = result.text || "";
    let metodo = "pdf-parse";

    // 2) se insuficiente -> OCR (SEM HTTP)
    if (textoInsuficiente(finalText)) {
      console.log("[FLUIG PROD] Texto insuficiente, tentando OCR...");

      const lang = req.body?.lang || "por";
      const scale = req.body?.scale != null ? Number(req.body.scale) : 1.5;
      const maxPages = req.body?.maxPages != null ? Number(req.body.maxPages) : 3;

      try {
        const ocrText = await pdfOcrController.ocrFromBase64(base64, { lang, scale, maxPages });

        if (ocrText && ocrText.trim()) {
          finalText = ocrText;
          metodo = "ocr";
          console.log("[FLUIG PROD] OCR OK.");
        } else {
          console.log("[FLUIG PROD] OCR retornou vazio. Mantendo resultado do pdf-parse.");
        }
      } catch (e) {
        console.log("[FLUIG PROD] OCR falhou. Mantendo pdf-parse. Motivo:", e.message);
      }
    }

    return res.json({
      success: true,
      ambiente: "prod",
      metodo,
      documentId,
      documentoVersao,
      colleagueId,
      nomeArquivo,
      pages: result.pages,
      text: finalText
    });
  } catch (error) {
    console.error("❌ ERRO em extractTextFromFluigProd >>>", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
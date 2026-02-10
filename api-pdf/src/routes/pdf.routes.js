const express = require('express');
const router = express.Router();

const upload = require('../middlewares/upload.middleware');
const pdfController = require('../controllers/pdf.controller');
const fluigPdfController = require('../controllers/fluigPdf.controller');
const fluigPdfProdController = require('../controllers/fluigPdf.prod.controller');
const pdfOcrController = require('../controllers/pdfOcr.controller');



// PROD

router.post('/api/v1/pdf/fluig-prod', fluigPdfProdController.extractTextFromFluigProd);



// RECEBE SÓ O BASE 64
router.post('/api/v1/pdf/text', upload.single('file'), pdfController.extractText);

// HM
router.post('/api/v1/pdf/fluig', fluigPdfController.extractTextFromFluig);


// Teste OCR base 64
router.post('/api/v1/pdf/ocr', express.json({ limit: '50mb' }), pdfOcrController.extractTextFromBase64Ocr);



module.exports = router;
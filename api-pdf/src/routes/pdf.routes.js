const express = require('express');
const router = express.Router();

const upload = require('../middlewares/upload.middleware');
const pdfController = require('../controllers/pdf.controller');
const fluigPdfController = require('../controllers/fluigPdf.controller');
const fluigPdfProdController = require('../controllers/fluigPdf.prod.controller');



// PROD

router.post('/api/v1/pdf/fluig-prod', fluigPdfProdController.extractTextFromFluigProd);



// RECEBE SÓ O BASE 64
router.post('/api/v1/pdf/text', upload.single('file'), pdfController.extractText);

// HM
router.post('/api/v1/pdf/fluig', fluigPdfController.extractTextFromFluig);



module.exports = router;

const express = require('express');
const router = express.Router();

const upload = require('../middlewares/upload.middleware');
const pdfController = require('../controllers/pdf.controller');

/**
 * Endpoint único, suporta:
 * - JSON (Base64)
 * - multipart/form-data
 */
router.post(
  '/api/v1/pdf/text',
  upload.single('file'), // só age se for multipart
  pdfController.extractText
);

module.exports = router;

const express = require('express');
const multer = require('multer');
const pdfController = require('../controllers/pdf.controller');

const router = express.Router();
const upload = multer(); 

router.post('/text', upload.single('file'), pdfController.extractText);

module.exports = router;

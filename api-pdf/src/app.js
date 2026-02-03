const express = require('express');
const pdfRoutes = require('./routes/pdf.routes');

const app = express();


app.use('/api/v1/pdf', pdfRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`API REST PDF rodando na porta ${PORT}`);
});

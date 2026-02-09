const express = require('express');
const app = express();

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(require('./routes/pdf.routes'));

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`API REST PDF rodando na porta ${PORT}`);
});
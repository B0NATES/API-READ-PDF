const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const URL = 'http://localhost:3000/api/v1/pdf/text';
const TOTAL_REQUESTS = 200; 


const pdfPath = path.join(__dirname, 'teste.pdf');


if (!fs.existsSync(pdfPath)) {
  console.error('❌ PDF de teste não encontrado em:', pdfPath);
  process.exit(1);
}

console.log('📄 PDF encontrado:', pdfPath);


function makeRequest(id) {
  const form = new FormData();
  form.append('file', fs.createReadStream(pdfPath));

  return fetch(URL, {
    method: 'POST',
    body: form,
    headers: form.getHeaders()
  })
    .then(async res => {
      const body = await res.json();

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} - ${JSON.stringify(body)}`);
      }

      console.log(`✅ Req ${id} OK`);
      return body;
    })
    .catch(err => {
      console.error(`❌ Req ${id} ERRO:`, err.message);
      return {
        success: false,
        error: err.message
      };
    });
}


(async () => {
  console.log(`🚀 Disparando ${TOTAL_REQUESTS} requests simultâneas`);
  console.time('⏱️ tempo-total');

  const requests = [];

  for (let i = 1; i <= TOTAL_REQUESTS; i++) {
    requests.push(makeRequest(i));
  }

  const responses = await Promise.all(requests);

  console.timeEnd('⏱️ tempo-total');

 
  const sucesso = responses.filter(r => r.success).length;
  const erro = responses.length - sucesso;

  console.log('\n📊 RESUMO FINAL');
  console.log('-------------------------');
  console.log('Total de requests:', responses.length);
  console.log('Sucesso:', sucesso);
  console.log('Erro:', erro);


  const primeiraRespostaOk = responses.find(r => r.success);

  if (primeiraRespostaOk) {
    console.log('\n📄 EXEMPLO DE RESPOSTA DA API');
    console.log('-------------------------');
    console.dir(primeiraRespostaOk, { depth: 4 });
  } else {
    console.log('\n⚠️ Nenhuma resposta válida retornou sucesso');
  }
})();

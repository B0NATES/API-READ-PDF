const axios = require('axios');
const { parseStringPromise } = require('xml2js');


const FLUIG_URL = 'https://mywebhm.am.sebrae.com.br';
const FLUIG_USER = 'utic.13';
const FLUIG_PASS = 'a940721';
const FLUIG_COMPANYID = 1;

// Caminho fixo do serviço SOAP
const ECM_PATH = '/webdesk/ECMDocumentService';

/**
 * Chama o getDocumentContent do ECMDocumentService
 * e retorna o Base64 contido dentro da tag <folder>.
 */
async function getFluigDocumentBase64({
    documentId,
    colleagueId,
    documentoVersao,
    nomeArquivo
}) {
    
    const xml = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                      xmlns:ws="http://ws.dm.ecm.technology.totvs.com/">
      <soapenv:Header/>
      <soapenv:Body>
        <ws:getDocumentContent>
          <username>${FLUIG_USER}</username>
          <password>${FLUIG_PASS}</password>
          <companyId>${FLUIG_COMPANYID}</companyId>
          <documentId>${documentId}</documentId>
          <colleagueId>${colleagueId}</colleagueId>
          <documentoVersao>${documentoVersao}</documentoVersao>
          <nomeArquivo>${nomeArquivo}</nomeArquivo>
        </ws:getDocumentContent>
      </soapenv:Body>
    </soapenv:Envelope>
  `.trim();

    //  Endpoint correto: base + /webdesk/ECMDocumentService
    const endpoint = `${FLUIG_URL.replace(/\/$/, '')}${ECM_PATH}`;
    console.log('[FLUIG SOAP] Chamando endpoint:', endpoint);

    const response = await axios.post(endpoint, xml, {
        headers: {
            'Content-Type': 'text/xml;charset=UTF-8',
            'SOAPAction': ''
        }
    });

    const xmlResp = response.data;
    // console.log('[FLUIG SOAP] XML de resposta:', xmlResp);

    const result = await parseStringPromise(xmlResp, { explicitArray: false });

    const envelope = result['soap:Envelope'] || result['Envelope'];
    if (!envelope) {
        throw new Error('Não foi possível localizar soap:Envelope na resposta SOAP.');
    }

    const body = envelope['soap:Body'] || envelope['Body'];
    if (!body) {
        throw new Error('Não foi possível localizar soap:Body na resposta SOAP.');
    }

    const respNode =
        body['ns1:getDocumentContentResponse'] ||
        body['getDocumentContentResponse'] ||
        body['ws:getDocumentContentResponse'];

    if (!respNode) {
        throw new Error('Não foi possível localizar getDocumentContentResponse na resposta SOAP.');
    }

    let base64 = respNode.folder;
    if (!base64) {
        throw new Error('Não foi possível localizar <folder> com o Base64 na resposta SOAP.');
    }

    // xml2js pode retornar array, Esse Array. garante string
    if (Array.isArray(base64)) {
        base64 = base64[0];
    }

    return String(base64);
}

module.exports = {
    getFluigDocumentBase64
};
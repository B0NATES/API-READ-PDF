function base64ToPdfBuffer(rawBase64) {
  if (!rawBase64) {
    throw new Error('Base64 vazio');
  }

  let base64 = String(rawBase64);

  // Remove prefixo data:application/pdf;base64,
  if (base64.indexOf('base64,') !== -1) {
    base64 = base64.split('base64,')[1];
  }

  // Remove espaços e quebras de linha
  base64 = base64.replace(/\s/g, '');

  return Buffer.from(base64, 'base64');
}

module.exports = { base64ToPdfBuffer };
const { PDFParse } = require('pdf-parse');

exports.extractText = async (req, res) => {
  let parser;

  try {
    console.log('Arquivo recebido?', !!req.file);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Arquivo PDF não enviado'
      });
    }

    console.log('Nome:', req.file.originalname);
    console.log('Tipo:', req.file.mimetype);
    console.log('Tamanho:', req.file.size);
    console.log('PDFParse:', typeof PDFParse);

    if (typeof PDFParse !== 'function') {
      throw new Error('PDFParse não é uma classe válida');
    }

   
    parser = new PDFParse({
      data: req.file.buffer
    });


    /*
    async function testaReq() {
      return parser.getText();
    }


      let qtdRequisicao = 0;
      const resultados = [];

    for (let i = 0; i < 100; i++) {
      const r = await testaReq(); 
      resultados.push(r);
      console.log("qt req");
      
      qtdRequisicao++;
    }

   
    const firstResult = resultados[0];


    return res.status(200).json({
      success: true,
      quantidadeReq: qtdRequisicao,
      data: {
        pages: firstResult.total,
        text: firstResult.text
      }
    });

    
    
    */


      
    


 const result = await parser.getText();
    

    return res.status(200).json({
      success: true,
      data: {
        pages: result.total,
        text: result.text
      }
    });



   
  } catch (error) {
    console.error('ERRO REAL PDF >>>', error);

    return res.status(500).json({
      success: false,
      message: error.message
    });

  } finally {
  
    if (parser) {
      await parser.destroy();
    }
  }
};

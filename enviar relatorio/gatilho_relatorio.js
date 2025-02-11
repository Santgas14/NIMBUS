const CONFIG = {
  GOOGLE_DRIVE_FOLDER_ID: "", // 📂 ID da pasta onde o PDF será salvo
  TWILIO_SID: "", // 📞 ID da conta do Twilio
  TWILIO_TOKEN: "", // 🔒 Token do Twilio (tem que esconder isso aí)
  TWILIO_FROM: "whatsapp:+14155238886", // Número mágico do Twilio
  DESTINATARIOS: [ // 📲 Quem recebe a mensagem no WhatsApp
    "whatsapp:"",
    "whatsapp:"",
    "whatsapp:""
  ],
  TIMEZONE: "GMT-3", // ⏳ Fuso horário (para não mandar mensagem na hora errada)
  EMAIL_LOGS: "" // 📧 Para onde os logs são enviados
};

// 📌 Função que calcula a próxima data para rodar o script
function getNextFormOpenDate_(day_in_week, hour) {
  var today = new Date();
  var nextDate = new Date(today);
  var daysUntilNext = (day_in_week - today.getDay() + 7) % 7; // Descobre quantos dias faltam para a próxima quinta

  if (daysUntilNext === 0) daysUntilNext = 7; // Se for hoje, pula para a próxima semana

  nextDate.setDate(today.getDate() + daysUntilNext);
  nextDate.setHours(hour.split(":")[0], hour.split(":")[1], 0, 0); // Define o horário exato

  return nextDate;
}

// 📌 Função PRINCIPAL: Cria o PDF, envia pelo WhatsApp e agenda o próximo envio
function gerarEEnviarRelatorio() {
  let logMensagem = "📌 **Log de Execução** 📅 " + Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "dd/MM/yyyy HH:mm") + "\n\n";

  try {
    var planilha = SpreadsheetApp.getActiveSpreadsheet();
    var idPlanilha = planilha.getId();
    var dataAtual = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy");
    var nomeArquivo = "acompanhamento_de_vagas_" + dataAtual + ".pdf";

    logMensagem += `✅ Planilha acessada com sucesso!\n`;

    // 🔗 URL para exportação da planilha como PDF
    var urlExportacao = `https://docs.google.com/spreadsheets/d/${idPlanilha}/export?format=pdf&portrait=true&size=A4&gridlines=false&printtitle=false&top_margin=0.5&bottom_margin=0.5&left_margin=0.5&right_margin=0.5`;
    var token = ScriptApp.getOAuthToken();

    var resposta = UrlFetchApp.fetch(urlExportacao, {
      headers: { 'Authorization': 'Bearer ' + token }
    });

    var pdfBlob = resposta.getBlob().setName(nomeArquivo);

    logMensagem += `✅ PDF gerado com sucesso: ${nomeArquivo}\n`;

    var pasta;
    try {
      pasta = DriveApp.getFolderById(CONFIG.GOOGLE_DRIVE_FOLDER_ID);
      logMensagem += `✅ Acesso à pasta do Google Drive: OK\n`;
    } catch (e) {
      logMensagem += `🚨 Erro ao acessar a pasta do Google Drive: ${e.toString()}\n`;
      enviarEmailLog("Erro ao gerar relatório", logMensagem);
      return;
    }

    var arquivo = pasta.createFile(pdfBlob);
    arquivo.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
    var urlPublica = `https://drive.google.com/uc?export=download&id=${arquivo.getId()}`;

    logMensagem += `✅ Arquivo salvo no Google Drive com sucesso!\n📩 Link: ${urlPublica}\n`;

    let sucessoWhatsApp = enviarMensagemWhatsApp(urlPublica);

    if (sucessoWhatsApp) {
      logMensagem += `✅ PDF enviado pelo WhatsApp com sucesso! 📲\n`;
    } else {
      logMensagem += `⚠️ Relatório gerado, mas falhou ao enviar pelo WhatsApp.\n`;
    }

  } catch (e) {
    logMensagem += `❌ Erro na execução do script: ${e.toString()}\n`;
  }

  // 📧 **Agora, enviamos o log por e-mail antes de apagar o gatilho**
  enviarEmailLog("Log de Execução: Relatório de Vagas", logMensagem);

  // 🔥 Agora sim, apagamos o gatilho antigo e criamos um novo
  removerGatilhoAntigo(logMensagem);
  criarNovoGatilho(logMensagem);
}

// 📲 Envia mensagem pelo WhatsApp via Twilio
function enviarMensagemWhatsApp(urlArquivo) {
  let sucesso = true;
  
  CONFIG.DESTINATARIOS.forEach(numeroDestino => {
    try {
      var payload = {
        "To": numeroDestino,
        "From": CONFIG.TWILIO_FROM,
        "Body": "Aqui está o acompanhamento de vagas atualizado 📄.",
        "MediaUrl": urlArquivo
      };

      var opcoes = {
        "method": "post",
        "headers": {
          "Authorization": "Basic " + Utilities.base64Encode(CONFIG.TWILIO_SID + ":" + CONFIG.TWILIO_TOKEN)
        },
        "payload": payload,
        "muteHttpExceptions": true
      };

      var resposta = UrlFetchApp.fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${CONFIG.TWILIO_SID}/Messages.json`, 
        opcoes
      );

    } catch (e) {
      sucesso = false;
    }
  });

  return sucesso;
}

// 🔥 Remove GATILHOS ANTIGOS para evitar rodar múltiplas execuções
function removerGatilhoAntigo(logMensagem) {
  var triggers = ScriptApp.getProjectTriggers();
  let count = 0;
  
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() == "gerarEEnviarRelatorio") {
      ScriptApp.deleteTrigger(triggers[i]);
      count++;
    }
  }
  
  if (count > 0) {
    logMensagem += `✅ ${count} gatilho(s) antigo(s) removido(s).\n`;
  } else {
    logMensagem += `⚠️ Nenhum gatilho antigo encontrado para remoção.\n`;
  }
}

// 🔄 Cria um NOVO GATILHO para rodar na próxima quinta-feira às 15:05
function criarNovoGatilho(logMensagem) {
  var existe = ScriptApp.getProjectTriggers().some(trigger => 
    trigger.getHandlerFunction() === "gerarEEnviarRelatorio"
  );

  if (!existe) {
    ScriptApp.newTrigger("gerarEEnviarRelatorio")
       .timeBased()
       .at(getNextFormOpenDate_(4, "15:05")) // 4 = Quinta-feira
       .create();
    logMensagem += "✅ Novo gatilho criado para quinta-feira às 15:05.\n";
  } else {
    logMensagem += "🔄 O gatilho já existe. Nada foi criado.\n";
  }
}

// 📩 Função que envia o log por e-mail
function enviarEmailLog(assunto, mensagem) {
  try {
    MailApp.sendEmail({
      to: CONFIG.EMAIL_LOGS,
      subject: assunto,
      body: mensagem
    });
  } catch (e) {
    Logger.log(`🚨 Falha ao enviar e-mail: ${e.toString()}`);
  }
}

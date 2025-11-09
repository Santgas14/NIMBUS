window.function = function(dummy) {
  try {
    // Cria objeto Date no fuso de São Paulo
    var date = new Date();

    // Formata para ISO 8601 (YYYY-MM-DDTHH:mm:ss±hh:mm)
    // Ajuste para fuso horário de São Paulo (-3h)
    var offsetMs = -3 * 60 * 60 * 1000;
    var localDate = new Date(date.getTime() + offsetMs);
    var isoString = localDate.toISOString().slice(0, 19) + "-03:00";

    return isoString; // Glide entende formato ISO
  } catch (e) {
    console.error("Erro ao gerar data/hora:", e);
    return undefined;
  }
};

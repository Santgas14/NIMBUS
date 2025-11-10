window.function = function () {
    var now = new Date();

    // Horário de Brasília (GMT-3)
    var offset = -3;
    var utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    var brasiliaTime = new Date(utc + (3600000 * offset));

    // Formato YYYY-MM-DD HH:MM:SS
    var dateString = brasiliaTime.toISOString().replace('T', ' ').substring(0, 19);

    return dateString;
}

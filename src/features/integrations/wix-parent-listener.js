/**
 * Cole em Wix Harmony → Configurações → Código personalizado (todas as páginas, body end).
 * Troque APP_ORIGIN pela origem exata do Next.js, sem barra no final.
 * O iframe do formulário deve ter id="codigos-missao-form".
 */
(function () {
  var APP_ORIGIN = "https://SEU-DOMINIO-DA-APP";
  var IFRAME_ID = "codigos-missao-form";

  function isSafePreviewUrl(url) {
    try {
      var parsed = new URL(url);
      var app = new URL(APP_ORIGIN);
      if (parsed.origin !== app.origin) return false;
      if (parsed.protocol !== "https:") return false;
      if (parsed.search || parsed.hash || parsed.username || parsed.password) return false;
      var parts = parsed.pathname.split("/").filter(Boolean);
      return parts.length === 3 && parts[0] === "mapa" && parts[1] === "resultado" && parts[2].length > 8;
    } catch (error) {
      return false;
    }
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== APP_ORIGIN) return;
    var data = event.data;
    if (!data || data.source !== "codigos-missao") return;
    if (data.type === "resize" && typeof data.height === "number") {
      var frame = document.getElementById(IFRAME_ID);
      if (frame) frame.style.height = Math.max(480, Math.round(data.height)) + "px";
      return;
    }
    if (data.type === "chart-ready" && typeof data.redirectUrl === "string" && isSafePreviewUrl(data.redirectUrl)) {
      window.location.href = data.redirectUrl;
    }
  });
})();

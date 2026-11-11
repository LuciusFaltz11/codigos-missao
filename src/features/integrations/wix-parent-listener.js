/**
 * Cole em Wix Harmony → Configurações → Código personalizado (todas as páginas, body end).
 * Troque APP_ORIGIN pela origem exata do Next.js, sem barra no final.
 *
 * O script troca o formulário nativo do Wix pelo iframe da app.
 * 1) Usa a div #comp-mw2gfm71.
 * 2) Se esse id mudar, acha o único formulário da página (mesma estrutura:
 *    nome, data, horário, local, e-mail) e sobe até a div wrapping `comp-*`.
 */
(function () {
  var APP_ORIGIN = "https://SEU-DOMINIO-DA-APP";
  var MOUNT_ID = "comp-mw2gfm71";
  var IFRAME_ID = "codigos-missao-form";
  var FORM_PATH = "/integracoes/wix/formulario-mapa";
  var MARK = "data-codigos-missao-embed";

  function isChartForm(form) {
    var label = (form.getAttribute("aria-label") || "").toLowerCase();
    if (label.indexOf("códigos da missão") !== -1 || label.indexOf("codigos da missao") !== -1) {
      return true;
    }
    function has(type, hook) {
      return Boolean(form.querySelector('[data-field-type="' + type + '"], [data-hook*="' + hook + '"]'));
    }
    return (
      has("CONTACTS_FIRST_NAME", "nome") &&
      has("CONTACTS_BIRTHDATE", "data_de_nascimento") &&
      has("TIME_INPUT", "horario") &&
      has("CONTACTS_ADDRESS", "local_de_nascimento") &&
      (has("CONTACTS_EMAIL", "email") || Boolean(form.querySelector('input[type="email"]')))
    );
  }

  function findMount() {
    var preferred = document.getElementById(MOUNT_ID);
    if (preferred) return preferred;

    var forms = Array.prototype.slice.call(document.querySelectorAll("form"));
    var match = null;
    for (var i = 0; i < forms.length; i += 1) {
      if (isChartForm(forms[i])) {
        match = forms[i];
        break;
      }
    }
    if (!match && forms.length === 1) match = forms[0];
    if (!match) return null;

    var node = match;
    while (node && node !== document.body) {
      if (node.id && node.id.indexOf("comp-") === 0) return node;
      node = node.parentElement;
    }
    return match.closest('[data-hook="Form-wrapper"]') || match.parentElement;
  }

  function createFrame() {
    var iframe = document.createElement("iframe");
    iframe.id = IFRAME_ID;
    iframe.title = "Formulário Códigos da Missão";
    iframe.src = APP_ORIGIN.replace(/\/$/, "") + FORM_PATH;
    iframe.setAttribute("loading", "eager");
    iframe.setAttribute("referrerpolicy", "origin");
    iframe.style.cssText = "display:block;width:100%;max-width:100%;border:0;min-height:480px;background:#f3f3f3;";
    return iframe;
  }

  function mountInto(target) {
    if (!target) return false;
    var existing = target.querySelector("#" + IFRAME_ID);
    if (existing && target.getAttribute(MARK) === "1" && !target.querySelector("form")) return true;
    while (target.firstChild) target.removeChild(target.firstChild);
    target.setAttribute(MARK, "1");
    target.style.minHeight = "480px";
    target.style.width = "100%";
    target.appendChild(createFrame());
    return true;
  }

  function tryMount() {
    return mountInto(findMount());
  }

  function watch(target) {
    if (!target || target.getAttribute(MARK + "-watched") === "1") return;
    target.setAttribute(MARK + "-watched", "1");
    new MutationObserver(function () {
      if (!target.querySelector("#" + IFRAME_ID) || target.querySelector("form")) tryMount();
    }).observe(target, { childList: true, subtree: true });
  }

  function start() {
    var pageObserver = null;
    function done() {
      if (pageObserver) pageObserver.disconnect();
      watch(findMount());
    }
    if (tryMount()) {
      done();
      return;
    }
    var attempts = 0;
    var timer = window.setInterval(function () {
      attempts += 1;
      if (tryMount()) {
        window.clearInterval(timer);
        done();
        return;
      }
      if (attempts > 40) window.clearInterval(timer);
    }, 250);
    pageObserver = new MutationObserver(function () {
      if (tryMount()) {
        window.clearInterval(timer);
        done();
      }
    });
    pageObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

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

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();

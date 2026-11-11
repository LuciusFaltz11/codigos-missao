/**
 * Cole em Wix Harmony → Configurações → Código personalizado (todas as páginas, body end).
 * Troque APP_ORIGIN pela origem exata do Next.js, sem barra no final.
 *
 * O Thunderbolt do Wix re-renderiza o formulário nativo depois do primeiro paint.
 * O script esconde o form nativo, estica a div pai, centraliza o iframe e
 * reabre a prévia no topo da página (não só dentro do iframe).
 */
(function () {
  var APP_ORIGIN = "https://SEU-DOMINIO-DA-APP";
  var MOUNT_ID = "comp-mw2gfm71";
  var IFRAME_ID = "codigos-missao-form";
  var FORM_PATH = "/integracoes/wix/formulario-mapa";
  var MARK = "data-codigos-missao-embed";
  var STYLE_ID = "codigos-missao-embed-style";
  var frame = null;
  var scheduled = false;

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      "[" +
      MARK +
      '="1"]{left:0!important;right:0!important;width:100%!important;max-width:100%!important;' +
      "height:auto!important;overflow:visible!important;transform:none!important;margin-left:auto!important;" +
      "margin-right:auto!important;background:transparent!important;box-shadow:none!important;}" +
      "[" +
      MARK +
      '="1"]>*:not(#' +
      IFRAME_ID +
      "){display:none!important;width:0!important;height:0!important;overflow:hidden!important;" +
      "position:absolute!important;left:-9999px!important;pointer-events:none!important;}" +
      "#" +
      IFRAME_ID +
      "{display:block!important;position:relative!important;z-index:99999!important;width:100%!important;" +
      "max-width:640px!important;margin:0 auto!important;overflow:hidden!important;border:0!important;" +
      "background:transparent!important;}";
    (document.head || document.documentElement).appendChild(style);
  }

  function isChartForm(form) {
    if (!form || form.tagName !== "FORM") return false;
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

  function wrapFromForm(form) {
    var node = form;
    while (node && node !== document.body) {
      if (node.id && node.id.indexOf("comp-") === 0) return node;
      node = node.parentElement;
    }
    return form.closest('[data-hook="Form-wrapper"]') || form.parentElement;
  }

  function findChartForm() {
    var forms = document.querySelectorAll("form");
    var match = null;
    var only = null;
    var count = 0;
    for (var i = 0; i < forms.length; i += 1) {
      count += 1;
      only = forms[i];
      if (isChartForm(forms[i])) {
        match = forms[i];
        break;
      }
    }
    return match || (count === 1 ? only : null);
  }

  function findMount() {
    var form = findChartForm();
    var fromForm = form ? wrapFromForm(form) : null;
    var preferred = document.getElementById(MOUNT_ID);
    if (fromForm && preferred && fromForm !== preferred && !preferred.contains(fromForm)) return fromForm;
    if (preferred) return preferred;
    return fromForm;
  }

  function createFrame() {
    var iframe = document.createElement("iframe");
    iframe.id = IFRAME_ID;
    iframe.title = "Formulário Códigos da Missão";
    iframe.src = APP_ORIGIN.replace(/\/$/, "") + FORM_PATH;
    iframe.setAttribute("loading", "eager");
    iframe.setAttribute("referrerpolicy", "origin");
    iframe.setAttribute("scrolling", "no");
    iframe.style.cssText =
      "display:block;width:100%;max-width:640px;margin:0 auto;border:0;min-height:520px;overflow:hidden;background:transparent;";
    return iframe;
  }

  function getFrame() {
    if (frame && frame.nodeType === 1) return frame;
    frame = document.getElementById(IFRAME_ID);
    if (frame) return frame;
    frame = createFrame();
    return frame;
  }

  function unlockOverflow(slot) {
    var node = slot;
    var hops = 0;
    while (node && hops < 8 && node !== document.body) {
      node.style.setProperty("overflow", "visible", "important");
      node.style.setProperty("overflow-x", "visible", "important");
      node.style.setProperty("overflow-y", "visible", "important");
      node = node.parentElement;
      hops += 1;
    }
  }

  function hideWixChrome(slot) {
    slot.setAttribute(MARK, "1");
    slot.style.setProperty("left", "0", "important");
    slot.style.setProperty("right", "0", "important");
    slot.style.setProperty("width", "100%", "important");
    slot.style.setProperty("max-width", "100%", "important");
    slot.style.setProperty("height", "auto", "important");
    slot.style.setProperty("overflow", "visible", "important");
    slot.style.setProperty("background", "transparent", "important");
    unlockOverflow(slot);
    for (var i = 0; i < slot.children.length; i += 1) {
      var child = slot.children[i];
      if (child.id === IFRAME_ID) continue;
      child.style.setProperty("display", "none", "important");
      child.setAttribute("aria-hidden", "true");
    }
  }

  function sizeFrame(height) {
    var iframe = document.getElementById(IFRAME_ID);
    if (!iframe) return;
    var px = Math.max(520, Math.round(height)) + "px";
    iframe.style.setProperty("height", px, "important");
    iframe.style.setProperty("min-height", px, "important");
    iframe.style.setProperty("overflow", "hidden", "important");
    var slot = iframe.parentElement;
    if (slot) {
      slot.style.setProperty("height", "auto", "important");
      slot.style.setProperty("min-height", px, "important");
    }
  }

  function ensureEmbed() {
    injectStyle();
    var slot = findMount();
    if (!slot) return false;
    hideWixChrome(slot);
    var iframe = getFrame();
    if (iframe.parentNode !== slot) slot.appendChild(iframe);
    return true;
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      ensureEmbed();
    });
  }

  function start() {
    injectStyle();
    ensureEmbed();
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
    window.setInterval(ensureEmbed, 300);
    window.addEventListener("load", ensureEmbed);
    document.addEventListener("visibilitychange", ensureEmbed);
  }

  function previewFromMessage(url) {
    try {
      var parsed = new URL(url);
      var parts = parsed.pathname.split("/").filter(Boolean);
      if (parsed.search || parsed.hash || parsed.username || parsed.password) return null;
      if (parts.length !== 3 || parts[0] !== "mapa" || parts[1] !== "resultado" || parts[2].length <= 8) return null;
      return APP_ORIGIN.replace(/\/$/, "") + "/mapa/resultado/" + parts[2];
    } catch (error) {
      return null;
    }
  }

  function goToPreview(url) {
    try {
      if (window.top && window.top !== window) {
        window.top.location.href = url;
        return;
      }
    } catch (error) {
      // segue no window atual
    }
    window.location.href = url;
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== APP_ORIGIN) return;
    var data = event.data;
    if (!data || data.source !== "codigos-missao") return;
    if (data.type === "resize" && typeof data.height === "number") {
      sizeFrame(data.height);
      return;
    }
    if (data.type === "chart-ready" && typeof data.redirectUrl === "string") {
      var preview = previewFromMessage(data.redirectUrl);
      if (preview) goToPreview(preview);
    }
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();

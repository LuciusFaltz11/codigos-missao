/**
 * Cole em Wix Harmony → Configurações → Código personalizado (todas as páginas, body end).
 * Troque APP_ORIGIN pela origem exata do Next.js, sem barra no final.
 *
 * A div da Wix tem altura fixa no mesh. O iframe precisa ter pelo menos a
 * altura do formulário completo; overflow auto entra só como fallback.
 * O mapa abre em uma nova guia pelo botão no formulário — a página da Wix
 * não navega e não tenta enquadrar a prévia.
 */
(function () {
  var APP_ORIGIN = "https://SEU-DOMINIO-DA-APP";
  var MOUNT_ID = "comp-mw2gfm71";
  var IFRAME_ID = "codigos-missao-form";
  var FORM_PATH = "/integracoes/wix/formulario-mapa";
  var MARK = "data-codigos-missao-embed";
  var STYLE_ID = "codigos-missao-embed-style";
  var MIN_HEIGHT = 960;
  var frame = null;
  var lastHeight = MIN_HEIGHT;
  var scheduled = false;

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      "[" +
      MARK +
      '="1"]{left:0!important;right:0!important;width:100%!important;max-width:100%!important;' +
      "max-height:none!important;overflow:visible!important;transform:none!important;margin-left:auto!important;" +
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
      "max-width:640px!important;max-height:none!important;margin:0 auto!important;overflow:auto!important;border:0!important;" +
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
    iframe.setAttribute("scrolling", "auto");
    iframe.style.cssText =
      "display:block;width:100%;max-width:640px;margin:0 auto;border:0;min-height:" +
      MIN_HEIGHT +
      "px;height:" +
      MIN_HEIGHT +
      "px;overflow:auto;background:transparent;";
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
    while (node && hops < 12 && node !== document.body) {
      node.style.setProperty("overflow", "visible", "important");
      node.style.setProperty("overflow-x", "visible", "important");
      node.style.setProperty("overflow-y", "visible", "important");
      node.style.setProperty("max-height", "none", "important");
      node = node.parentElement;
      hops += 1;
    }
  }

  function sizeFrame(height) {
    lastHeight = Math.max(MIN_HEIGHT, Math.round(height || lastHeight));
    var px = lastHeight + "px";
    var iframe = document.getElementById(IFRAME_ID) || frame;
    if (iframe) {
      iframe.style.setProperty("height", px, "important");
      iframe.style.setProperty("min-height", px, "important");
      iframe.style.setProperty("max-height", "none", "important");
      iframe.style.setProperty("overflow", "auto", "important");
      iframe.setAttribute("scrolling", "auto");
    }
    var slot = iframe && iframe.parentElement ? iframe.parentElement : findMount();
    if (slot) {
      slot.style.setProperty("height", px, "important");
      slot.style.setProperty("min-height", px, "important");
      slot.style.setProperty("max-height", "none", "important");
      slot.style.setProperty("overflow", "visible", "important");
    }
  }

  function hideWixChrome(slot) {
    slot.setAttribute(MARK, "1");
    slot.style.setProperty("left", "0", "important");
    slot.style.setProperty("right", "0", "important");
    slot.style.setProperty("width", "100%", "important");
    slot.style.setProperty("max-width", "100%", "important");
    slot.style.setProperty("max-height", "none", "important");
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

  function ensureEmbed() {
    injectStyle();
    var slot = findMount();
    if (!slot) return false;
    hideWixChrome(slot);
    var iframe = getFrame();
    if (iframe.parentNode !== slot) slot.appendChild(iframe);
    sizeFrame(lastHeight);
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

  window.addEventListener("message", function (event) {
    if (event.origin !== APP_ORIGIN) return;
    var data = event.data;
    if (!data || data.source !== "codigos-missao") return;
    if (data.type === "resize" && typeof data.height === "number") {
      sizeFrame(data.height);
    }
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();

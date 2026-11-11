export const WIX_FORM_MOUNT_ID = "comp-mw2gfm71";
export const WIX_IFRAME_ID = "codigos-missao-form";
export const WIX_FORM_PATH = "/integracoes/wix/formulario-mapa";

export function isWixBirthChartFormMeta(input: {
  ariaLabel?: string | null;
  fieldTypes?: readonly string[];
  dataHooks?: readonly string[];
}) {
  const label = input.ariaLabel ?? "";
  if (/c[óo]digos da miss[ãa]o/i.test(label)) return true;
  const types = new Set(input.fieldTypes ?? []);
  const hooks = (input.dataHooks ?? []).join(" ").toLowerCase();
  const has = (type: string, hookPart: string) => types.has(type) || hooks.includes(hookPart);
  return (
    has("CONTACTS_FIRST_NAME", "nome") &&
    has("CONTACTS_BIRTHDATE", "data_de_nascimento") &&
    has("TIME_INPUT", "horario") &&
    has("CONTACTS_ADDRESS", "local_de_nascimento") &&
    has("CONTACTS_EMAIL", "email")
  );
}

export function resolveWixFormMount(input: {
  preferred?: { id: string } | null;
  forms?: Array<{
    meta: Parameters<typeof isWixBirthChartFormMeta>[0];
    closestComp?: { id: string } | null;
    formWrapper?: { id?: string } | null;
  }>;
}) {
  if (input.preferred?.id) return input.preferred;
  const forms = input.forms ?? [];
  const matched = forms.find((form) => isWixBirthChartFormMeta(form.meta)) ?? (forms.length === 1 ? forms[0] : null);
  if (!matched) return null;
  if (matched.closestComp?.id) return matched.closestComp;
  if (matched.formWrapper) return matched.formWrapper;
  return null;
}

export function iframeSrc(appOrigin: string) {
  return `${appOrigin.replace(/\/$/, "")}${WIX_FORM_PATH}`;
}

export function collectFormMeta(form: Element) {
  const fieldTypes = [...form.querySelectorAll("[data-field-type]")].map((node) => node.getAttribute("data-field-type") ?? "");
  const dataHooks = [...form.querySelectorAll("[data-hook]")].map((node) => node.getAttribute("data-hook") ?? "");
  return {
    ariaLabel: form.getAttribute("aria-label"),
    fieldTypes,
    dataHooks,
  };
}

export function findWixFormMountElement(root: ParentNode = document): HTMLElement | null {
  const preferred = root.querySelector?.(`#${WIX_FORM_MOUNT_ID}`);
  if (preferred instanceof HTMLElement) return preferred;

  const forms = [...root.querySelectorAll("form")];
  const matched =
    forms.find((form) => isWixBirthChartFormMeta(collectFormMeta(form))) ?? (forms.length === 1 ? forms[0] : null);
  if (!matched) return null;

  let node: HTMLElement | null = matched;
  while (node) {
    if (node.id && node.id.indexOf("comp-") === 0) return node;
    node = node.parentElement;
  }
  const wrap = matched.closest('[data-hook="Form-wrapper"]');
  return wrap instanceof HTMLElement ? wrap : matched.parentElement;
}

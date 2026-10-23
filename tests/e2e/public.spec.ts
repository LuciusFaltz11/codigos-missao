import { expect, test } from "@playwright/test";

test("a landing explica o método e não promete destino", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Descubra seus Códigos da Missão" })).toBeVisible();
  await expect(page.getByText("não representam o mapa de uma pessoa")).toBeVisible();
  await expect(page.getByText("Nenhum código determina destino", { exact: false })).toBeVisible();
});

test("o formulário reúne os dados numa tela", async ({ page }) => {
  await page.goto("/mapa");
  await expect(page.getByLabel("Nome")).toBeVisible();
  await expect(page.getByLabel("Ano")).toBeVisible();
  await expect(page.getByLabel("Mês")).toBeVisible();
  await expect(page.getByLabel("Dia")).toBeVisible();
  await expect(page.getByLabel("Hora")).toBeVisible();
  await expect(page.getByLabel("Minuto")).toBeVisible();
  await expect(page.getByLabel("Local de nascimento")).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByRole("button", { name: "Gerar mapa" })).toBeDisabled();
});

test("o retorno de pagamento não trata o navegador como confirmação", async ({ page }) => {
  await page.goto("/pagamento/retorno?outcome=success");
  await expect(page.getByText("ainda não confirma o pagamento")).toBeVisible();
});

test("a metodologia deixa as regras astronômicas como provisórias", async ({ page }) => {
  await page.goto("/metodologia");
  await expect(page.getByText("propostas provisórias")).toBeVisible();
});

test("a home não estoura a largura no mobile", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow).toBe(false);
});

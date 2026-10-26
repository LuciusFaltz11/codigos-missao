"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { birthHours, birthMinutes, birthMonths, birthYears, composeBirthDate, composeBirthTime, daysInMonth } from "@/components/birth-form/birth-fields";
import { CityAutocomplete, type CitySearchStatus } from "@/components/birth-form/city-autocomplete";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";

type TimeOption = { offsetMinutes: number; label: string };

const cityMessages: Record<Exclude<CitySearchStatus, null>, string> = {
  not_configured: "A busca de cidades não está configurada. Nenhuma coordenada será inventada.",
  error: "A busca de cidades falhou. Nenhuma coordenada será inventada.",
  empty: "Nenhuma cidade encontrada. Tente outro nome.",
};

export function BirthWizard() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [cityStatus, setCityStatus] = useState<CitySearchStatus>(null);
  const [options, setOptions] = useState<TimeOption[]>([]);
  const [pending, setPending] = useState(false);
  const [birth, setBirth] = useState({ year: "", month: "", day: "", hour: "", minute: "" });
  const [form, setForm] = useState({
    name: "",
    email: "",
    cityQuery: "",
    cityLabel: "",
    offsetChoice: undefined as number | undefined,
    acceptPrivacy: false,
    marketingOptIn: false,
  });

  function update(partial: Partial<typeof form>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  function updateBirth(partial: Partial<typeof birth>) {
    setBirth((current) => {
      const next = { ...current, ...partial };
      if (next.day && Number(next.day) > daysInMonth(next.year, next.month)) next.day = "";
      return next;
    });
    setOptions([]);
    update({ offsetChoice: undefined });
  }

  async function submit() {
    const date = composeBirthDate(birth.year, birth.month, birth.day);
    const time = composeBirthTime(birth.hour, birth.minute);
    if (!date.ok) {
      toast.error(date.reason === "future" ? "A data de nascimento não pode estar no futuro." : "Essa data não existe.");
      return;
    }
    if (!time) {
      toast.error("Informe a hora e o minuto do nascimento.");
      return;
    }
    if (!form.cityLabel) return;

    setMessage(null);
    setPending(true);
    const response = await fetch("/api/charts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        birthDate: date.value,
        birthTime: time,
        cityQuery: form.cityQuery,
        cityLabel: form.cityLabel,
        offsetChoice: form.offsetChoice,
        acceptPrivacy: form.acceptPrivacy,
        marketingOptIn: form.marketingOptIn,
      }),
    });
    const body = await response.json();
    setPending(false);
    if (body.ok) {
      router.push(`/mapa/resultado/${body.token}`);
      return;
    }
    if (body.code === "ambiguous_time") {
      setOptions(body.options ?? []);
      setMessage(body.message);
      return;
    }
    toast.error(body.message ?? "Não foi possível gerar o mapa.");
  }

  const dayCount = daysInMonth(birth.year, birth.month);
  const days = Array.from({ length: dayCount }, (_, index) => String(index + 1).padStart(2, "0"));
  const cityMessage = cityStatus ? cityMessages[cityStatus] : null;

  return (
    <form
      className="grid gap-5 rounded-3xl border border-border bg-surface p-5 sm:p-6"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <Field label="Nome">
        <Input required value={form.name} onChange={(event) => update({ name: event.target.value })} autoComplete="name" />
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Ano">
          <Select required autoComplete="bday-year" value={birth.year} onChange={(event) => updateBirth({ year: event.target.value })}>
            <option value="">—</option>
            {birthYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Mês">
          <Select required autoComplete="bday-month" value={birth.month} onChange={(event) => updateBirth({ month: event.target.value })}>
            <option value="">—</option>
            {birthMonths.map((month, index) => (
              <option key={month} value={String(index + 1).padStart(2, "0")}>
                {month}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Dia">
          <Select required autoComplete="bday-day" value={birth.day} onChange={(event) => updateBirth({ day: event.target.value })}>
            <option value="">—</option>
            {days.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-2">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hora">
            <Select required value={birth.hour} onChange={(event) => updateBirth({ hour: event.target.value })}>
              <option value="">—</option>
              {birthHours.map((hour) => (
                <option key={hour} value={hour}>
                  {hour}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Minuto">
            <Select required value={birth.minute} onChange={(event) => updateBirth({ minute: event.target.value })}>
              <option value="">—</option>
              {birthMinutes.map((minute) => (
                <option key={minute} value={minute}>
                  {minute}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <p className="text-sm text-muted">A hora exata é necessária para as casas. Sem ela, o mapa não é calculado.</p>
      </div>

      <div className="grid gap-2 text-sm font-medium text-ink">
        <label htmlFor="birth-city">Local de nascimento</label>
        <CityAutocomplete
          id="birth-city"
          ariaLabel="Local de nascimento"
          selectedLabel={form.cityLabel}
          onSelect={(label) => update({ cityQuery: label, cityLabel: label })}
          onStatus={setCityStatus}
        />
        <span className="font-normal text-muted">Ou a metrópole mais próxima. Escolha uma sugestão para confirmar a coordenada.</span>
        {cityMessage ? (
          <p role="alert" className="rounded-xl bg-gold-soft px-3 py-3 font-normal">
            {cityMessage}
          </p>
        ) : null}
      </div>

      <Field label="E-mail">
        <Input required type="email" value={form.email} onChange={(event) => update({ email: event.target.value })} autoComplete="email" />
      </Field>

      {options.length > 0 ? (
        <fieldset className="grid gap-2">
          <legend className="text-sm font-semibold">Qual ocorrência do horário usar?</legend>
          {options.map((option) => (
            <label key={option.offsetMinutes} className="flex gap-2 text-sm">
              <input
                type="radio"
                name="offset"
                checked={form.offsetChoice === option.offsetMinutes}
                onChange={() => update({ offsetChoice: option.offsetMinutes })}
                required
              />
              {option.label}
            </label>
          ))}
        </fieldset>
      ) : null}

      <div className="grid gap-3 text-sm">
        <label className="flex items-start gap-3">
          <input className="mt-1" type="checkbox" checked={form.acceptPrivacy} onChange={(event) => update({ acceptPrivacy: event.target.checked })} required />
          <span>
            Li e aceito a{" "}
            <Link href="/privacidade" className="underline decoration-wine underline-offset-2">
              política de privacidade
            </Link>
            .
          </span>
        </label>
        <label className="flex items-start gap-3">
          <input className="mt-1" type="checkbox" checked={form.marketingOptIn} onChange={(event) => update({ marketingOptIn: event.target.checked })} />
          Quero receber comunicações. Este aceite é opcional.
        </label>
      </div>

      {message ? (
        <p role="alert" className="rounded-xl bg-gold-soft px-3 py-3 text-sm">
          {message}
        </p>
      ) : null}

      <Button className="mx-auto mt-1 min-w-52" type="submit" disabled={pending || !form.cityLabel}>
        Gerar mapa
      </Button>
    </form>
  );
}

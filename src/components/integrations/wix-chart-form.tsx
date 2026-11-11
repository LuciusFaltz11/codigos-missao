"use client";

import { useEffect, useRef, useState } from "react";
import { birthMinutes, birthMonths, birthYears, composeBirthDate, daysInMonth } from "@/components/birth-form/birth-fields";
import { CityAutocomplete, type CitySearchStatus } from "@/components/birth-form/city-autocomplete";
import { TurnstileField } from "@/components/integrations/turnstile-field";
import {
  embedPreviewUrl,
  navigateToPreview,
  postToWixParent,
  wixChartReadyMessage,
  wixResizeMessage,
} from "@/features/integrations/wix-messages";
import { twelveHourHours, twelveHourToBirthTime } from "@/features/integrations/wix-time";
import type { TimeOption } from "@/features/astrology/time";
import "./wix-chart-form.css";

type Birth = { year: string; month: string; day: string; hour: string; minute: string; period: "AM" | "PM" };

const cityMessages: Record<Exclude<CitySearchStatus, null>, string> = {
  not_configured: "A busca de cidades não está configurada. Nenhuma coordenada será inventada.",
  error: "A busca de cidades falhou. Nenhuma coordenada será inventada.",
  empty: "Nenhuma cidade encontrada. Tente outro nome.",
};

export function WixChartForm({
  privacyUrl,
  turnstileSiteKey,
  wixOrigins,
}: {
  privacyUrl: string;
  turnstileSiteKey: string;
  wixOrigins: string[];
}) {
  const rootRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [previewHref, setPreviewHref] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cityStatus, setCityStatus] = useState<CitySearchStatus>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [options, setOptions] = useState<TimeOption[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    cityQuery: "",
    cityLabel: "",
    offsetChoice: undefined as number | undefined,
    acceptPrivacy: false,
  });
  const [birth, setBirth] = useState<Birth>({
    year: "",
    month: "",
    day: "",
    hour: "",
    minute: "",
    period: "AM",
  });

  function update(partial: Partial<typeof form>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  function updateBirth(partial: Partial<Birth>) {
    setBirth((current) => {
      const next = { ...current, ...partial };
      if (next.day && Number(next.day) > daysInMonth(next.year, next.month)) next.day = "";
      return next;
    });
    setOptions([]);
    update({ offsetChoice: undefined });
  }

  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const notify = () => {
      postToWixParent(wixResizeMessage(node.getBoundingClientRect().height + 24), {
        allowedOrigins: wixOrigins,
        referrer: document.referrer,
      });
    };
    notify();
    const observer = new ResizeObserver(notify);
    observer.observe(node);
    return () => observer.disconnect();
  }, [wixOrigins]);

  async function submit() {
    const date = composeBirthDate(birth.year, birth.month, birth.day);
    const time = twelveHourToBirthTime(birth.hour, birth.minute, birth.period);
    if (!date.ok) {
      setError(date.reason === "future" ? "A data de nascimento não pode estar no futuro." : "Essa data não existe.");
      return;
    }
    if (!time) {
      setError("Informe o horário de nascimento.");
      return;
    }
    if (!form.cityLabel) {
      setError("Escolha uma cidade da lista para confirmar o local.");
      return;
    }
    if (!form.acceptPrivacy) {
      setError("O aceite da política de privacidade é necessário.");
      return;
    }
    if (turnstileSiteKey && !turnstileToken) {
      setError("Conclua a verificação antes de gerar o mapa.");
      return;
    }

    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 45_000);
      const response = await fetch("/api/integrations/wix/charts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          birthDate: date.value,
          birthTime: time,
          cityQuery: form.cityQuery,
          cityLabel: form.cityLabel,
          offsetChoice: form.offsetChoice,
          acceptPrivacy: true,
          marketingOptIn: false,
          turnstileToken,
        }),
      });
      window.clearTimeout(timer);
      const body = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            code?: string;
            message?: string;
            redirectUrl?: string;
            options?: TimeOption[];
          }
        | null;
      if (body?.ok && body.redirectUrl) {
        const previewUrl = embedPreviewUrl(body.redirectUrl, window.location.origin);
        if (!previewUrl) {
          setError("O mapa foi gerado, mas o endereço da prévia é inválido.");
          return;
        }
        setPreviewHref(previewUrl);
        setMessage("Sua leitura está pronta. Abrindo a prévia…");
        postToWixParent(wixChartReadyMessage(previewUrl), {
          allowedOrigins: wixOrigins,
          referrer: document.referrer,
        });
        navigateToPreview(previewUrl);
        return;
      }
      if (body?.code === "ambiguous_time") {
        setOptions(body.options ?? []);
        setError(body.message ?? "Este horário acontece duas vezes. Escolha a ocorrência.");
        return;
      }
      setError(body?.message ?? "Não foi possível gerar o mapa.");
    } catch (caught) {
      setError(
        caught instanceof DOMException && caught.name === "AbortError"
          ? "A geração do mapa demorou demais. Tente de novo."
          : "Não foi possível gerar o mapa agora.",
      );
    } finally {
      setPending(false);
    }
  }

  const dayCount = daysInMonth(birth.year, birth.month);
  const days = Array.from({ length: dayCount }, (_, index) => String(index + 1).padStart(2, "0"));
  const cityMessage = cityStatus ? cityMessages[cityStatus] : null;

  return (
    <form
      ref={rootRef}
      className="wix-embed-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        void submit();
      }}
    >
      <div className="wix-field">
        <label className="wix-label" htmlFor="wix-name">
          Nome *
        </label>
        <div className="wix-pill">
          <input
            id="wix-name"
            className="wix-input"
            required
            autoComplete="name"
            value={form.name}
            onChange={(event) => update({ name: event.target.value })}
          />
        </div>
      </div>

      <div className="wix-field">
        <p className="wix-label">Data de nascimento *</p>
        <div className="wix-subrow">
          <div className="wix-subfield">
            <label className="wix-sublabel" htmlFor="wix-day">
              Dia
            </label>
            <div className="wix-pill">
              <select
                id="wix-day"
                className="wix-select"
                required
                autoComplete="bday-day"
                value={birth.day}
                onChange={(event) => updateBirth({ day: event.target.value })}
              >
                <option value=""> </option>
                {days.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="wix-subfield">
            <label className="wix-sublabel" htmlFor="wix-month">
              Mês
            </label>
            <div className="wix-pill">
              <select
                id="wix-month"
                className="wix-select"
                required
                autoComplete="bday-month"
                value={birth.month}
                onChange={(event) => updateBirth({ month: event.target.value })}
              >
                <option value=""> </option>
                {birthMonths.map((month, index) => (
                  <option key={month} value={String(index + 1).padStart(2, "0")}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="wix-subfield">
            <label className="wix-sublabel" htmlFor="wix-year">
              Ano
            </label>
            <div className="wix-pill">
              <select
                id="wix-year"
                className="wix-select"
                required
                autoComplete="bday-year"
                value={birth.year}
                onChange={(event) => updateBirth({ year: event.target.value })}
              >
                <option value=""> </option>
                {birthYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="wix-field">
        <label className="wix-label" htmlFor="wix-hour">
          Horário de nascimento *
        </label>
        <div className="wix-pill wix-time">
          <select
            id="wix-hour"
            className="wix-select"
            required
            aria-label="Hora"
            value={birth.hour}
            onChange={(event) => updateBirth({ hour: event.target.value })}
          >
            <option value="">--</option>
            {twelveHourHours.map((hour) => (
              <option key={hour} value={hour}>
                {hour}
              </option>
            ))}
          </select>
          <span aria-hidden>:</span>
          <select
            className="wix-select"
            required
            aria-label="Minuto"
            value={birth.minute}
            onChange={(event) => updateBirth({ minute: event.target.value })}
          >
            <option value="">--</option>
            {birthMinutes.map((minute) => (
              <option key={minute} value={minute}>
                {minute}
              </option>
            ))}
          </select>
          <select
            className="wix-select"
            required
            aria-label="Período"
            value={birth.period}
            onChange={(event) => updateBirth({ period: event.target.value === "PM" ? "PM" : "AM" })}
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
      </div>
      <p className="wix-hint">A hora exata é necessária para as casas. Sem ela o mapa não é calculado corretamente.</p>

      <div className="wix-field">
        <label className="wix-label" htmlFor="wix-city">
          Local de nascimento *
        </label>
        <CityAutocomplete
          id="wix-city"
          ariaLabel="Local de nascimento"
          selectedLabel={form.cityLabel}
          onSelect={(label) => update({ cityQuery: label, cityLabel: label })}
          onStatus={setCityStatus}
        />
      </div>
      <p className="wix-hint">{cityMessage ?? "Ou a cidade mais próxima."}</p>

      <div className="wix-field">
        <label className="wix-label" htmlFor="wix-email">
          Email *
        </label>
        <div className="wix-pill">
          <input
            id="wix-email"
            className="wix-input"
            required
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => update({ email: event.target.value })}
          />
        </div>
      </div>

      <label className="wix-privacy">
        <input
          type="checkbox"
          checked={form.acceptPrivacy}
          onChange={(event) => update({ acceptPrivacy: event.target.checked })}
          required
        />
        <span>
          Li e aceito a{" "}
          <a href={privacyUrl} target="_blank" rel="noopener noreferrer">
            política de privacidade
          </a>
          .
        </span>
      </label>

      {turnstileSiteKey ? <TurnstileField siteKey={turnstileSiteKey} onToken={setTurnstileToken} /> : null}

      {options.length > 0 ? (
        <fieldset className="wix-dst">
          <legend>Qual ocorrência do horário usar?</legend>
          {options.map((option) => (
            <label key={option.offsetMinutes}>
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

      {error ? (
        <p className="wix-error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="wix-success">
          {message}
          {previewHref ? (
            <>
              {" "}
              <a href={previewHref} target="_top" rel="noopener noreferrer">
                Abrir a prévia
              </a>
            </>
          ) : null}
        </p>
      ) : null}

      <button className="wix-submit" type="submit" disabled={pending || !form.cityLabel}>
        {pending ? "Gerando mapa…" : "Gerar mapa"}
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { CityAutocomplete, type CitySearchStatus } from "@/components/birth-form/city-autocomplete";
import { Input } from "@/components/ui/input";
import { formatCep, normalizeCep } from "@/features/geo/cep";
import { cn } from "@/lib/utils";

export function CityPlaceField({
  cityId,
  selectedLabel,
  cep,
  onCitySelect,
  onCepResolved,
  onUseCitySearch,
  onStatus,
  variant = "default",
}: {
  cityId: string;
  selectedLabel: string;
  cep?: string;
  onCitySelect: (label: string) => void;
  onCepResolved: (input: { cep: string; label: string }) => void;
  onUseCitySearch: () => void;
  onStatus: (status: CitySearchStatus) => void;
  variant?: "default" | "wix";
}) {
  const [usingCep, setUsingCep] = useState(Boolean(cep));
  const [cepInput, setCepInput] = useState(cep ? formatCep(cep) : "");
  const [pending, setPending] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const wix = variant === "wix";

  function openCep() {
    setUsingCep(true);
    setCepError(null);
    onStatus(null);
    onCitySelect("");
  }

  function backToCity() {
    setUsingCep(false);
    setCepInput("");
    setCepError(null);
    onUseCitySearch();
  }

  async function lookup() {
    const digits = normalizeCep(cepInput);
    if (!digits) {
      setCepError("Informe um CEP com 8 dígitos.");
      return;
    }
    setPending(true);
    setCepError(null);
    try {
      const response = await fetch(`/api/geo/cep?cep=${encodeURIComponent(digits)}`);
      const body = (await response.json()) as { status?: string; label?: string | null };
      if (body.status === "not_configured") {
        setCepError("A busca de cidades não está configurada. Nenhuma coordenada será inventada.");
        return;
      }
      if (!response.ok || body.status === "error") {
        setCepError("Não foi possível consultar esse CEP agora.");
        return;
      }
      if (body.status === "empty" || !body.label) {
        setCepError("Não encontramos esse CEP. Confira os 8 dígitos ou use o CEP de uma rua da cidade.");
        return;
      }
      setCepInput(formatCep(digits));
      onCepResolved({ cep: digits, label: body.label });
    } catch {
      setCepError("Não foi possível consultar esse CEP agora.");
    } finally {
      setPending(false);
    }
  }

  if (!usingCep) {
    return (
      <div className={wix ? "wix-city-place" : "grid gap-2"}>
        <CityAutocomplete
          id={cityId}
          ariaLabel="Local de nascimento"
          selectedLabel={selectedLabel}
          onSelect={onCitySelect}
          onStatus={onStatus}
        />
        <button className={wix ? "wix-city-switch" : "w-fit text-left text-sm font-normal text-wine underline-offset-2 hover:underline"} type="button" onClick={openCep}>
          Não encontrou sua cidade?
        </button>
      </div>
    );
  }

  return (
    <div className={wix ? "wix-city-place" : "grid gap-2"}>
      <label className={wix ? "wix-sublabel" : "font-normal text-muted"} htmlFor={`${cityId}-cep`}>
        CEP da cidade de nascimento
      </label>
      <div className={wix ? "wix-cep-row" : "flex flex-wrap gap-2"}>
        {wix ? (
          <span className="wix-pill wix-cep-field">
            <input
              id={`${cityId}-cep`}
              className="wix-input"
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="00000-000"
              value={cepInput}
              onChange={(event) => {
                setCepInput(event.target.value);
                setCepError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void lookup();
                }
              }}
            />
          </span>
        ) : (
          <Input
            id={`${cityId}-cep`}
            className="min-w-40 flex-1"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            value={cepInput}
            onChange={(event) => {
              setCepInput(event.target.value);
              setCepError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void lookup();
              }
            }}
          />
        )}
        <button
          className={wix ? "wix-cep-search" : cn("min-h-11 rounded-xl bg-wine px-4 text-sm font-semibold text-white disabled:opacity-50")}
          type="button"
          disabled={pending}
          onClick={() => void lookup()}
        >
          {pending ? "Buscando…" : "Buscar"}
        </button>
      </div>
      <p className={wix ? "wix-cep-note" : "font-normal text-muted"}>Use um CEP válido da cidade. Qualquer rua do município serve.</p>
      {selectedLabel ? (
        <p className={wix ? "wix-cep-confirmed" : "font-normal text-ink"}>
          Cidade confirmada: {selectedLabel}
        </p>
      ) : null}
      {cepError ? (
        <p role="alert" className={wix ? "wix-error wix-cep-error" : "border-l-2 border-gold bg-canvas px-3 py-3 font-normal"}>
          {cepError}
        </p>
      ) : null}
      <button className={wix ? "wix-city-switch" : "w-fit text-left text-sm font-normal text-wine underline-offset-2 hover:underline"} type="button" onClick={backToCity}>
        Buscar pela cidade
      </button>
    </div>
  );
}

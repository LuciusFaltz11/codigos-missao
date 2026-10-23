"use client";

import { useEffect, useRef } from "react";
import { GeocoderAutocomplete } from "@geoapify/geocoder-autocomplete";
import "@geoapify/geocoder-autocomplete/styles/minimal.css";
import { toAutocompleteFeatures, type CitySuggestion } from "@/features/geo/suggestions";
import "./city-autocomplete.css";

export type CitySearchStatus = "not_configured" | "error" | "empty" | null;

export function CityAutocomplete({
  id,
  ariaLabel,
  selectedLabel,
  onSelect,
  onStatus,
}: {
  id: string;
  ariaLabel: string;
  selectedLabel: string;
  onSelect: (label: string) => void;
  onStatus: (status: CitySearchStatus) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(selectedLabel);
  const onSelectRef = useRef(onSelect);
  const onStatusRef = useRef(onStatus);

  useEffect(() => {
    onSelectRef.current = onSelect;
    onStatusRef.current = onStatus;
  }, [onSelect, onStatus]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const autocomplete = new GeocoderAutocomplete(host, "", {
      placeholder: "Digite a cidade",
      lang: "pt",
      type: "city",
      limit: 5,
      debounceDelay: 250,
      skipIcons: true,
      addDetails: false,
    });
    autocomplete.setSendGeocoderRequestFunc(async (value) => {
      if (value.trim().length < 2) {
        onStatusRef.current(null);
        return toAutocompleteFeatures([]);
      }
      try {
        const response = await fetch(`/api/geo/search?q=${encodeURIComponent(value)}`);
        const body = (await response.json()) as {
          status?: string;
          places?: CitySuggestion[];
        };
        if (body.status === "not_configured") onStatusRef.current("not_configured");
        else if (!response.ok || body.status === "error") onStatusRef.current("error");
        else if (body.status === "empty" || !body.places?.length) onStatusRef.current("empty");
        else onStatusRef.current(null);
        return toAutocompleteFeatures(body.places ?? []);
      } catch {
        onStatusRef.current("error");
        return toAutocompleteFeatures([]);
      }
    });
    autocomplete.on("select", (feature: { properties?: { formatted?: string } } | null) => {
      const label = feature?.properties?.formatted ?? "";
      selectedRef.current = label;
      onSelectRef.current(label);
    });
    autocomplete.on("input", () => {
      if (autocomplete.getValue() === selectedRef.current) return;
      selectedRef.current = "";
      onSelectRef.current("");
      onStatusRef.current(null);
    });
    const input = host.querySelector("input");
    if (input) {
      input.id = id;
      input.setAttribute("aria-label", ariaLabel);
      input.setAttribute("autocomplete", "off");
      input.required = true;
      if (selectedRef.current) autocomplete.setValue(selectedRef.current);
    }
    return () => autocomplete.destroy();
  }, [ariaLabel, id]);

  return <div ref={hostRef} className="city-autocomplete input-shell" />;
}

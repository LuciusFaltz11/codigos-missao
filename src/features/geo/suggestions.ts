export type CitySuggestion = {
  label: string;
  country: string | null;
};

export function toAutocompleteFeatures(places: CitySuggestion[]) {
  return {
    type: "FeatureCollection" as const,
    features: places.map((place) => ({
      type: "Feature" as const,
      properties: {
        formatted: place.label,
        country: place.country,
        result_type: "city",
      },
      geometry: null,
    })),
  };
}

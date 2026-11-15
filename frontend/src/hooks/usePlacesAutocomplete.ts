"use client";

import { useEffect, useRef, useState } from "react";
import { useGoogleMapsScript } from "@/hooks/useGoogleMapsScript";
import type { Place } from "@/app/criar-roteiro/mockPlaces";

interface PlaceDetails {
  displayName?: string | { text?: string };
  formattedAddress?: string;
  location?: { lat(): number; lng(): number };
  fetchFields(options: { fields: string[] }): Promise<void>;
}

interface PlacePrediction {
  placeId?: string;
  text: string | { text?: string; toString(): string };
  toPlace(): PlaceDetails;
}

interface PlacesLibrary {
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions(options: {
      input: string;
      includedRegionCodes: string[];
      sessionToken: unknown;
    }): Promise<{ suggestions: Array<{ placePrediction?: PlacePrediction }> }>;
  };
  AutocompleteSessionToken: new () => unknown;
}

export interface GooglePlaceSuggestion {
  id: string;
  label: string;
  prediction: PlacePrediction;
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export function usePlacesAutocomplete(query: string) {
  const { carregado } = useGoogleMapsScript();
  const sessionToken = useRef<unknown>(null);
  const [suggestions, setSuggestions] = useState<GooglePlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!API_KEY || !carregado || normalizedQuery.length < 3) {
      const clearTimer = window.setTimeout(() => {
        setSuggestions([]);
        setIsSearching(false);
      }, 0);
      return () => window.clearTimeout(clearTimer);
    }

    let active = true;
    const timer = window.setTimeout(() => {
      setIsSearching(true);
      void findPlaces(normalizedQuery, sessionToken).then((results) => {
        if (!active) return;
        setSuggestions(results);
        setIsSearching(false);
      });
    }, 280);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [carregado, query]);

  async function resolveSuggestion(suggestion: GooglePlaceSuggestion): Promise<Place> {
    const place = suggestion.prediction.toPlace();
    await place.fetchFields({ fields: ["displayName", "formattedAddress", "location"] });

    const location = place.location;
    if (!location) {
      throw new Error("Não foi possível obter as coordenadas desse local. Escolha outra sugestão.");
    }

    const displayName = place.displayName;
    const name =
      typeof displayName === "string"
        ? displayName
        : displayName?.text ?? place.formattedAddress ?? suggestion.label;

    sessionToken.current = null;

    return {
      id: `google-${suggestion.id}`,
      name,
      latitude: location.lat(),
      longitude: location.lng(),
      description: place.formattedAddress ?? name,
      categories: ["Google Maps", "Localização"],
      tempoMin: 0,
      distanciaKm: 0,
    };
  }

  return { suggestions, isSearching, resolveSuggestion };
}

async function findPlaces(
  input: string,
  sessionToken: { current: unknown },
): Promise<GooglePlaceSuggestion[]> {
  try {
    const places = (await google.maps.importLibrary("places")) as unknown as PlacesLibrary;
    sessionToken.current ??= new places.AutocompleteSessionToken();
    const response = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input,
      includedRegionCodes: ["br"],
      sessionToken: sessionToken.current,
    });

    return response.suggestions.flatMap(({ placePrediction }) => {
      if (!placePrediction) return [];

      return [{
        id: placePrediction.placeId ?? placePrediction.text.toString(),
        label: placePrediction.text.toString(),
        prediction: placePrediction,
      }];
    });
  } catch {
    return [];
  }
}
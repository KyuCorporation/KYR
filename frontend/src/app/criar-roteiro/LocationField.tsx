"use client";

import { useRef, useState } from "react";
import styles from "./page.module.css";
import { SearchIcon, CheckIcon, WarningIcon } from "./icons";
import { searchPlaces, type Place } from "./mockPlaces";
import { usePlacesAutocomplete, type GooglePlaceSuggestion } from "@/hooks/usePlacesAutocomplete";

export type LocationFieldValue = {
  text: string;
  place: Place | null;
};

type Props = {
  id: string;
  label: string;
  placeholder: string;
  value: LocationFieldValue;
  onChange: (value: LocationFieldValue) => void;
  /** Mostra erro mesmo sem o campo ter sido "tocado" ainda (ex: ao clicar em Gerar roteiro). */
  forceValidate?: boolean;
  errorMessage?: string;
};

export default function LocationField({
  id,
  label,
  placeholder,
  value,
  onChange,
  forceValidate = false,
  errorMessage,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    suggestions: googleSuggestions,
    isSearching,
    resolveSuggestion,
    // Com um lugar já escolhido, o texto do campo é o nome dele: buscar de novo abriria outra sessão de
    // autocomplete no Google (cobrada por requisição) só para mostrar sugestões que ninguém pediu.
  } = usePlacesAutocomplete(value.place ? "" : value.text);

  const suggestions = googleSuggestions.length > 0
    ? googleSuggestions.map((suggestion) => ({
        id: suggestion.id,
        label: suggestion.label,
        googleSuggestion: suggestion,
      }))
    : searchPlaces(value.text).map((place) => ({
        id: place.id,
        label: place.name,
        place,
      }));
  const isValid = value.place !== null;
  const showError = (touched || forceValidate) && !isValid;
  const showValid = isValid;

  const handleChange = (text: string) => {
    // Qualquer edição manual invalida a seleção anterior, até escolher
    // uma sugestão de novo.
    onChange({ text, place: null });
    setSelectionError(null);
    setIsOpen(true);
  };

  const handleSelect = async (suggestion: {
    label: string;
    place?: Place;
    googleSuggestion?: GooglePlaceSuggestion;
  }) => {
    if (suggestion.place) {
      onChange({ text: suggestion.place.name, place: suggestion.place });
      setIsOpen(false);
      setTouched(true);
      return;
    }

    if (!suggestion.googleSuggestion) return;
    setIsResolving(true);
    setSelectionError(null);
    try {
      const place = await resolveSuggestion(suggestion.googleSuggestion);
      onChange({ text: place.name, place });
      setIsOpen(false);
      setTouched(true);
    } catch (error) {
      setSelectionError(
        error instanceof Error ? error.message : "Não foi possível selecionar esse local.",
      );
    } finally {
      setIsResolving(false);
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  const handleBlur = () => {
    // Delay para permitir o onClick da sugestão disparar antes do fechamento.
    blurTimeout.current = setTimeout(() => {
      setIsOpen(false);
      setTouched(true);
    }, 120);
  };

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>

      <div className={styles.autocompleteWrapper}>
        <div
          className={`${styles.inputWrapper} ${
            showError ? styles.inputWrapperError : ""
          } ${showValid ? styles.inputWrapperValid : ""}`}
        >
          <SearchIcon />
          <input
            id={id}
            className={styles.input}
            type="text"
            placeholder={placeholder}
            value={value.text}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isOpen && suggestions.length > 0}
            aria-haspopup="listbox"
            aria-controls={`${id}-suggestions`}
            aria-invalid={showError}
          />
          {showValid && (
            <span className={styles.statusIconValid}>
              <CheckIcon />
            </span>
          )}
          {showError && (
            <span className={styles.statusIconError}>
              <WarningIcon />
            </span>
          )}
        </div>

        {isOpen && (suggestions.length > 0 || isSearching) && (
          <ul className={styles.suggestionList} id={`${id}-suggestions`} role="listbox">
            {isSearching && (
              <li className={styles.suggestionStatus} role="status">Buscando lugares…</li>
            )}
            {suggestions.map((suggestion) => (
              <li key={suggestion.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  className={styles.suggestionItem}
                  onMouseDown={(e) => e.preventDefault()}
                  disabled={isResolving}
                  onClick={() => void handleSelect(suggestion)}
                >
                  <SearchIcon />
                  <span>{suggestion.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showError && (
        <span className={styles.errorText} id={`${id}-error`}>
          <WarningIcon /> {errorMessage ?? "Informe um endereço válido"}
        </span>
      )}
      {selectionError && <span className={styles.errorText} role="alert">{selectionError}</span>}
      {isResolving && <span className={styles.suggestionStatus} role="status">Carregando coordenadas…</span>}
    </div>
  );
}
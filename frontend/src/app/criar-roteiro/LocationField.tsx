"use client";

import { useRef, useState } from "react";
import styles from "./page.module.css";
import { SearchIcon, CheckIcon, WarningIcon } from "./icons";
import { searchPlaces, type Place } from "./mockPlaces";

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
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestions = searchPlaces(value.text);
  const hasText = value.text.trim().length > 0;
  const isValid = value.place !== null;
  const showError = (touched || forceValidate) && hasText && !isValid;
  const showValid = isValid;

  const handleChange = (text: string) => {
    // Qualquer edição manual invalida a seleção anterior, até escolher
    // uma sugestão de novo.
    onChange({ text, place: null });
    setIsOpen(true);
  };

  const handleSelect = (place: Place) => {
    onChange({ text: place.name, place });
    setIsOpen(false);
    setTouched(true);
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

        {isOpen && suggestions.length > 0 && (
          <ul className={styles.suggestionList} role="listbox">
            {suggestions.map((place) => (
              <li key={place.id}>
                <button
                  type="button"
                  className={styles.suggestionItem}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(place)}
                >
                  <SearchIcon />
                  <span>{place.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showError && (
        <span className={styles.errorText}>
          <WarningIcon /> {errorMessage ?? "Informe um endereço válido"}
        </span>
      )}
    </div>
  );
}
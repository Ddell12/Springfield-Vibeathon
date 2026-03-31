"use client";

import { useState } from "react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Input } from "@/shared/components/ui/input";

import { type ICD10Code, searchICD10 } from "../lib/icd10-codes";

interface ICD10PickerProps {
  selected: { code: string; description: string }[];
  onChange: (codes: { code: string; description: string }[]) => void;
  disabled?: boolean;
}

export function ICD10Picker({ selected, onChange, disabled }: ICD10PickerProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const results = searchICD10(query).slice(0, 15);
  const selectedCodes = new Set(selected.map((s) => s.code));

  function handleSelect(code: ICD10Code) {
    if (selectedCodes.has(code.code)) {
      onChange(selected.filter((s) => s.code !== code.code));
    } else {
      onChange([...selected, { code: code.code, description: code.description }]);
    }
  }

  function handleRemove(code: string) {
    onChange(selected.filter((s) => s.code !== code));
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-foreground">
        ICD-10 Diagnosis Codes
      </label>

      {/* Selected codes */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <span
              key={s.code}
              className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
            >
              {s.code}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(s.code)}
                  className="ml-0.5 text-primary/60 transition-colors duration-300 hover:text-primary"
                >
                  <MaterialIcon icon="close" size="xs" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      {!disabled && (
        <div className="relative">
          <Input
            placeholder="Search ICD-10 codes..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="pr-8"
          />
          <MaterialIcon
            icon="search"
            size="sm"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />

          {/* Dropdown */}
          {isOpen && query.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-background shadow-lg">
              {results.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">No codes found</p>
              ) : (
                results.map((code) => (
                  <button
                    key={code.code}
                    type="button"
                    onClick={() => {
                      handleSelect(code);
                      setQuery("");
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors duration-300 hover:bg-muted",
                      selectedCodes.has(code.code) && "bg-primary/5"
                    )}
                  >
                    <span className="font-mono text-xs font-semibold text-primary">
                      {code.code}
                    </span>
                    <span className="text-foreground">{code.description}</span>
                    {selectedCodes.has(code.code) && (
                      <MaterialIcon icon="check" size="xs" className="ml-auto text-primary" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Click-away listener */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[5]"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

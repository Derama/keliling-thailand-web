"use client";

import { useState, useRef, useEffect } from "react";

interface Suggestion {
  formatted: string;
  address_line1: string;
  address_line2: string;
  place_id: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  dark?: boolean;
}

export default function LocationSearch({ value, onChange, placeholder, required, dark }: Props) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (value === "") {
      setQuery("");
      setSuggestions([]);
      setOpen(false);
    }
  }, [value]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    setQuery(text);
    onChange(text);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      try {
        const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
        const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(text)}&filter=countrycode:th&limit=5&apiKey=${apiKey}`;
        const res = await fetch(url, { signal: abortRef.current.signal });
        const data = await res.json();
        const results: Suggestion[] = (data.features ?? []).map(
          (f: { properties: Suggestion }) => f.properties
        );
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Geoapify error:", err);
          setSuggestions([]);
          setOpen(false);
        }
      } finally {
        setLoading(false);
      }
    }, 350);
  }

  function handleSelect(s: Suggestion) {
    const text = s.formatted;
    setQuery(text);
    onChange(text);
    setSuggestions([]);
    setOpen(false);
  }

  function handleClear() {
    setQuery("");
    onChange("");
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <span className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${dark ? "text-white/40" : "text-gray-400"}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </span>
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className={`w-full rounded-xl pl-9 pr-8 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C518] focus:border-transparent transition-colors ${
            dark
              ? "border border-white/20 bg-white/10 text-white placeholder-white/40"
              : "border border-gray-200 focus:border-[#F5C518] focus:ring-[#F5C518]/20"
          }`}
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="w-4 h-4 animate-spin text-[#F5C518]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </span>
        )}
        {!loading && query && (
          <button
            type="button"
            onClick={handleClear}
            className={`absolute right-3 top-1/2 -translate-y-1/2 ${dark ? "text-white/40 hover:text-white/70" : "text-gray-400 hover:text-gray-600"}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 z-[9999] mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          {suggestions.map((s, i) => (
            <li key={s.place_id || i}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent input blur before click registers
                  handleSelect(s);
                }}
                className="w-full text-left px-4 py-3 hover:bg-[#F5C518]/10 transition-colors border-b border-gray-100 last:border-0"
              >
                <div className="text-sm font-medium text-gray-900 truncate">
                  {s.address_line1 || s.formatted}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {s.address_line2}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

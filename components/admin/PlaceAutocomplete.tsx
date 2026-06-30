"use client";

import { useEffect, useRef, useState } from "react";
import { inputCls } from "@/components/admin/ui";

interface Suggestion {
  name: string;
  label: string;
}

/**
 * Pickup-location field with Thailand place suggestions from /api/places
 * (OpenStreetMap Nominatim). Free typing is always allowed — the dropdown only
 * suggests. Picking a suggestion fills the field with its short name.
 */
export default function PlaceAutocomplete({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // Set when the user just picked / typed exactly a suggestion, so we don't
  // immediately re-query and reopen the dropdown for that same string.
  const skipNext = useRef(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    const q = value.trim();
    let cancelled = false;
    // Run everything through the debounce timer so no state is set
    // synchronously during the effect (avoids cascading renders).
    const t = setTimeout(() => {
      if (cancelled) return;
      if (q.length < 3) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      fetch(`/api/places?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          const results: Suggestion[] = Array.isArray(d?.results)
            ? d.results
            : [];
          setSuggestions(results);
          setOpen(results.length > 0);
        })
        .catch(() => !cancelled && setSuggestions([]))
        .finally(() => !cancelled && setLoading(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [value]);

  // Close on outside click.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(s: Suggestion) {
    skipNext.current = true;
    onChange(s.name);
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder={placeholder}
        autoComplete="off"
        className={inputCls}
      />
      {open && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {suggestions.map((s, i) => (
            <li key={`${s.label}-${i}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                <span className="font-medium text-[#1B2A4A]">{s.name}</span>
                <span className="block truncate text-xs text-gray-400">
                  {s.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {loading && value.trim().length >= 3 && (
        <span className="absolute right-3 top-2.5 text-xs text-gray-400">
          …
        </span>
      )}
    </div>
  );
}

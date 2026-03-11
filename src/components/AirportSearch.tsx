"use client";

import { useState, useEffect, useRef } from "react";

interface Airport {
  iataCode: string;
  name: string;
  city: string | null;
  country: string | null;
}

interface Props {
  label: string;
  value: Airport | null;
  onChange: (airport: Airport | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function AirportSearch({ label, value, onChange, placeholder = "City or IATA code", disabled }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Airport[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) { setResults([]); setOpen(false); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/airports?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.airports ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
  }, [query]);

  function select(airport: Airport) {
    onChange(airport);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function clear() {
    onChange(null);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs text-gray-400 mb-1">{label}</label>

      {value ? (
        // Selected state
        <div className="flex items-center gap-2 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2">
          <span className="font-mono font-bold text-blue-400 text-sm">{value.iataCode}</span>
          <span className="text-sm text-gray-200 flex-1 truncate">
            {value.city ?? value.name}
          </span>
          {!disabled && (
            <button
              type="button"
              onClick={clear}
              className="text-gray-500 hover:text-gray-300 text-lg leading-none"
              aria-label="Clear"
            >
              ×
            </button>
          )}
        </div>
      ) : (
        // Search input
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
          {loading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
              …
            </span>
          )}
        </div>
      )}

      {/* Dropdown */}
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto">
          {results.map((airport) => (
            <li key={airport.iataCode}>
              <button
                type="button"
                onMouseDown={() => select(airport)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-800 text-left transition-colors"
              >
                <span className="font-mono font-bold text-blue-400 w-10 shrink-0 text-sm">
                  {airport.iataCode}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-gray-100 truncate">
                    {airport.city ?? airport.name}
                  </span>
                  <span className="block text-xs text-gray-500 truncate">
                    {airport.name}{airport.country ? ` · ${airport.country}` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !loading && results.length === 0 && query.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-500">
          No airports found
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AirportSearch } from "@/components/AirportSearch";

interface Airport {
  iataCode: string;
  name: string;
  city: string | null;
  country: string | null;
}

type TripType = "roundtrip" | "oneway";
type WatchMode = "fixed" | "flexible";
type Cabin = "ECONOMY" | "BUSINESS" | "FIRST";

const INTERVAL_OPTIONS = [
  { label: "Every 6 hours", value: 6 },
  { label: "Every 12 hours", value: 12 },
  { label: "Every 24 hours", value: 24 },
  { label: "Every 48 hours", value: 48 },
];

const CABIN_OPTIONS: { label: string; value: Cabin }[] = [
  { label: "Economy", value: "ECONOMY" },
  { label: "Business", value: "BUSINESS" },
  { label: "First", value: "FIRST" },
];

export default function NewWatchPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Route
  const [origin, setOrigin] = useState<Airport | null>(null);
  const [destination, setDestination] = useState<Airport | null>(null);

  // Trip type & mode
  const [tripType, setTripType] = useState<TripType>("roundtrip");
  const [mode, setMode] = useState<WatchMode>("fixed");

  // Fixed dates
  const [depDate, setDepDate] = useState("");
  const [retDate, setRetDate] = useState("");

  // Flexible ranges
  const [depFrom, setDepFrom] = useState("");
  const [depTo, setDepTo] = useState("");
  const [retFrom, setRetFrom] = useState("");
  const [retTo, setRetTo] = useState("");

  // Common
  const [pax, setPax] = useState(1);
  const [cabin, setCabin] = useState<Cabin>("ECONOMY");
  const [fetchIntervalH, setFetchIntervalH] = useState(12);
  const [alertMinDrop, setAlertMinDrop] = useState("");

  // Auto-generate name from route
  function autoName() {
    if (!origin || !destination) return "";
    const dates = mode === "fixed"
      ? (depDate ? ` ${depDate.slice(5)}` : "")
      : (depFrom ? ` ${depFrom.slice(5)}–${(depTo || depFrom).slice(5)}` : "");
    return `${origin.iataCode}→${destination.iataCode}${dates}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!origin || !destination) {
      setError("Please select origin and destination airports.");
      return;
    }

    const body: Record<string, unknown> = {
      name: autoName(),
      origin: origin.iataCode,
      destination: destination.iataCode,
      mode,
      pax,
      cabin,
      fetchIntervalH,
      ...(alertMinDrop !== "" ? { alertMinDrop: Number(alertMinDrop) } : {}),
    };

    if (mode === "fixed") {
      if (!depDate) { setError("Departure date is required."); return; }
      body.depDate = depDate;
      body.retDate = tripType === "roundtrip" ? (retDate || null) : null;
    } else {
      if (!depFrom || !depTo) { setError("Departure window (from/to) is required."); return; }
      body.depFrom = depFrom;
      body.depTo = depTo;
      if (tripType === "roundtrip") {
        body.retFrom = retFrom || null;
        body.retTo = retTo || null;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/watches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create watch.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-gray-400 hover:text-gray-200 text-sm"
        >
          ← Back
        </button>
        <h1 className="text-lg font-semibold">New Watch</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Route */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-medium text-gray-300">Route</h2>
          <div className="grid grid-cols-2 gap-3">
            <AirportSearch label="From" value={origin} onChange={setOrigin} placeholder="e.g. Portland" />
            <AirportSearch label="To" value={destination} onChange={setDestination} placeholder="e.g. Chisinau" />
          </div>
        </div>

        {/* Trip type & mode */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-medium text-gray-300">Trip type</h2>
          <div className="flex gap-2">
            <ToggleButton active={tripType === "roundtrip"} onClick={() => setTripType("roundtrip")}>
              Round trip
            </ToggleButton>
            <ToggleButton active={tripType === "oneway"} onClick={() => setTripType("oneway")}>
              One way
            </ToggleButton>
          </div>

          <div className="flex gap-2 pt-1">
            <ToggleButton active={mode === "fixed"} onClick={() => setMode("fixed")}>
              Fixed dates
            </ToggleButton>
            <ToggleButton active={mode === "flexible"} onClick={() => setMode("flexible")}>
              Flexible range
            </ToggleButton>
          </div>
        </div>

        {/* Dates */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-medium text-gray-300">Dates</h2>

          {mode === "fixed" ? (
            <div className="grid grid-cols-2 gap-3">
              <DateField label="Departure" value={depDate} onChange={setDepDate} required />
              {tripType === "roundtrip" && (
                <DateField label="Return" value={retDate} onChange={setRetDate} />
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <DateField label="Depart from" value={depFrom} onChange={setDepFrom} required />
                <DateField label="Depart to" value={depTo} onChange={setDepTo} required />
              </div>
              {tripType === "roundtrip" && (
                <div className="grid grid-cols-2 gap-3">
                  <DateField label="Return from" value={retFrom} onChange={setRetFrom} />
                  <DateField label="Return to" value={retTo} onChange={setRetTo} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Passengers & cabin */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-medium text-gray-300">Passengers & cabin</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Passengers</label>
              <select
                value={pax}
                onChange={(e) => setPax(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <option key={n} value={n}>{n} {n === 1 ? "passenger" : "passengers"}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Cabin</label>
              <select
                value={cabin}
                onChange={(e) => setCabin(e.target.value as Cabin)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                {CABIN_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Check interval */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-medium text-gray-300">Check interval</h2>
          <div className="flex flex-wrap gap-2">
            {INTERVAL_OPTIONS.map((o) => (
              <ToggleButton
                key={o.value}
                active={fetchIntervalH === o.value}
                onClick={() => setFetchIntervalH(o.value)}
              >
                {o.label}
              </ToggleButton>
            ))}
          </div>
        </div>

        {/* Alert */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-medium text-gray-300">Price alert <span className="text-gray-500">(optional)</span></h2>
          <p className="text-xs text-gray-500">Notify me via Telegram when price drops by at least $ from the first recorded price. Leave empty for any drop.</p>
          <input
            type="number"
            min="0"
            step="1"
            value={alertMinDrop}
            onChange={(e) => setAlertMinDrop(e.target.value)}
            placeholder="e.g. 50 (default: any drop)"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm px-1">{error}</p>
        )}

        {/* Preview name */}
        {origin && destination && (
          <p className="text-xs text-gray-500 px-1">
            Watch name: <span className="text-gray-300">{autoName()}</span>
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !origin || !destination}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg px-4 py-2.5 font-medium text-sm transition-colors"
        >
          {submitting ? "Creating…" : "Create watch"}
        </button>
      </form>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
        active
          ? "bg-blue-600 text-white"
          : "bg-gray-800 text-gray-400 hover:text-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

function DateField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">
        {label}{required && <span className="text-gray-600"> *</span>}
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 [color-scheme:dark]"
      />
    </div>
  );
}

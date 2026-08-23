import { useEffect, useState } from "react";
import type { Sighting } from "../types";
import { fromLocalInputValue, toLocalInputValue } from "../lib/format";

const dataUrl = `${import.meta.env.BASE_URL}data.json`;

type SaveState = "idle" | "saving" | "saved" | "error";

/** Parses "lat, lng" text (e.g. "37.234, -177.1222") into validated numbers. */
function parseCoord(text: string): { lat: number; lng: number } | null {
  const parts = text.split(",");
  if (parts.length !== 2) return null;
  const latText = parts[0].trim();
  const lngText = parts[1].trim();
  if (latText === "" || lngText === "") return null;
  const lat = Number(latText);
  const lng = Number(lngText);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

const formatCoord = (row: Sighting): string => `${row.lat}, ${row.lng}`;

export default function AdminPage() {
  const [rows, setRows] = useState<Sighting[] | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [coordDrafts, setCoordDrafts] = useState<Record<number, string>>({});

  useEffect(() => {
    let cancelled = false;
    fetch(dataUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ sightings: Sighting[] }>;
      })
      .then((data) => {
        if (!cancelled) setRows(data.sightings ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setRows([]);
          setMessage(`Failed to load data.json — ${err instanceof Error ? err.message : err}`);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateRow = (index: number, patch: Partial<Sighting>) => {
    setRows((prev) =>
      prev ? prev.map((row, i) => (i === index ? { ...row, ...patch } : row)) : prev,
    );
  };

  const updateCoord = (index: number, text: string) => {
    const parsed = parseCoord(text);
    if (parsed) {
      setCoordDrafts((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
      updateRow(index, parsed);
    } else {
      setCoordDrafts((prev) => ({ ...prev, [index]: text }));
    }
  };

  const addRow = () => {
    setRows((prev) => [
      ...(prev ?? []),
      { time: new Date().toISOString(), lat: 0, lng: 0, label: "" },
    ]);
    setCoordDrafts({});
  };

  const deleteRow = (index: number) => {
    setRows((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
    setCoordDrafts({});
  };

  const save = async () => {
    if (!rows) return;
    setSaveState("saving");
    setMessage("");
    try {
      const payload = {
        sightings: rows.map((r) => ({
          time: r.time,
          lat: r.lat,
          lng: r.lng,
          ...(r.label && r.label.trim() !== "" ? { label: r.label.trim() } : {}),
        })),
      };
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (res.ok) {
        setSaveState("saved");
        setMessage(`Saved ${payload.sightings.length} sightings to data.json. Refresh the map page to see changes.`);
      } else {
        setSaveState("error");
        setMessage(
          body?.error
            ? `Rejected: ${body.error}`
            : "Saving is only available when running locally with `bun run dev` (static hosts have no write API).",
        );
      }
    } catch (err) {
      setSaveState("error");
      setMessage(
        `Could not reach /api/data (${err instanceof Error ? err.message : err}). Saving is local-only.`,
      );
    }
  };

  if (!rows) return <div className="page-status">Loading&hellip;</div>;

  return (
    <main className="admin-layout">
      <div className="admin-toolbar">
        <button type="button" onClick={addRow}>
          + Add sighting
        </button>
        <button type="button" className="primary" onClick={save} disabled={saveState === "saving"}>
          {saveState === "saving" ? "Saving…" : "Save to data.json"}
        </button>
        <span className={`save-state ${saveState === "error" ? "error-text" : ""}`}>{message}</span>
      </div>

      <p className="admin-hint">
        Rows are sorted by time automatically when displayed. Editing writes <code>public/data.json</code>{" "}
        and works only while running locally via <code>bun run dev</code>.
      </p>

      <table className="admin-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Label</th>
            <th>Time (local)</th>
            <th>Lat, Lng</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>
                <input
                  type="text"
                  value={row.label ?? ""}
                  onChange={(e) => updateRow(i, { label: e.target.value })}
                  placeholder="optional label"
                />
              </td>
              <td>
                <input
                  type="datetime-local"
                  value={toLocalInputValue(row.time)}
                  onChange={(e) => updateRow(i, { time: fromLocalInputValue(e.target.value) })}
                />
              </td>
              <td>
                <input
                  type="text"
                  value={coordDrafts[i] ?? formatCoord(row)}
                  onChange={(e) => updateCoord(i, e.target.value)}
                  placeholder="37.234, -177.1222"
                  className={
                    coordDrafts[i] !== undefined && !parseCoord(coordDrafts[i])
                      ? "invalid-input"
                      : undefined
                  }
                />
              </td>
              <td>
                <button type="button" onClick={() => deleteRow(i)} aria-label={`Delete row ${i + 1}`}>
                  &times;
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

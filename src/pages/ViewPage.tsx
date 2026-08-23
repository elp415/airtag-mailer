import { useEffect, useMemo, useState } from "react";
import MapView from "../components/MapView";
import TimelineSlider from "../components/TimelineSlider";
import { buildLegs, sortSightings } from "../lib/geo";
import type { Sighting } from "../types";

const dataUrl = `${import.meta.env.BASE_URL}data.json`;

export default function ViewPage() {
  const [sightings, setSightings] = useState<Sighting[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(dataUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ sightings: Sighting[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        const sorted = sortSightings(data.sightings ?? []);
        setSightings(sorted);
        setCount(sorted.length);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const legs = useMemo(() => buildLegs(sightings ?? []), [sightings]);

  if (error) {
    return <div className="page-status">Failed to load data.json — {error}</div>;
  }
  if (!sightings) {
    return <div className="page-status">Loading sightings&hellip;</div>;
  }

  const visibleSightings = sightings.slice(0, count);
  const visibleLegs = legs.slice(0, Math.max(0, count - 1));

  return (
    <main className="view-layout">
      <MapView sightings={visibleSightings} legs={visibleLegs} />
      <TimelineSlider
        total={sightings.length}
        count={count}
        onChange={setCount}
        visibleSightings={visibleSightings}
        visibleLegs={visibleLegs}
      />
    </main>
  );
}

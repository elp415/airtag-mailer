import type { Leg, Sighting } from "../types";
import { formatDateTime, formatDuration } from "../lib/format";

interface Props {
  total: number;
  count: number;
  onChange: (count: number) => void;
  visibleSightings: Sighting[];
  visibleLegs: Leg[];
}

export default function TimelineSlider({ total, count, onChange, visibleSightings, visibleLegs }: Props) {
  const last = visibleSightings[visibleSightings.length - 1];
  const leg = visibleLegs[visibleLegs.length - 1];

  return (
    <div className="timeline">
      <div className="timeline-controls">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, count - 1))}
          disabled={count <= 1}
          aria-label="Previous sighting"
        >
          &larr;
        </button>
        <input
          type="range"
          min={1}
          max={total}
          step={1}
          value={count}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Timeline position"
        />
        <button
          type="button"
          onClick={() => onChange(Math.min(total, count + 1))}
          disabled={count >= total}
          aria-label="Next sighting"
        >
          &rarr;
        </button>
      </div>

      <div className="timeline-meta">
        <span className="timeline-count">
          {count} / {total} sightings
        </span>
        {leg && (
          <span className={`mode-badge ${leg.mode}`}>
            {leg.mode === "air" ? "AIR" : "GROUND"} {Math.round(leg.speedMph)} mph
          </span>
        )}
      </div>

      {last && (
        <div className="timeline-detail">
          <strong>{last.label || `(${last.lat.toFixed(4)}, ${last.lng.toFixed(4)})`}</strong>
          <span>{formatDateTime(last.time)}</span>
          {leg && (
            <span className="timeline-leg">
              {Math.round(leg.distanceMiles)} mi in {formatDuration(leg.hours)} from{" "}
              {leg.from.label || "previous sighting"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

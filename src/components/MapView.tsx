import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Leg, Sighting } from "../types";
import { formatDateTime, formatDuration } from "../lib/format";

interface Props {
  sightings: Sighting[];
  legs: Leg[];
}

const MODE_COLOR: Record<Leg["mode"], string> = {
  air: "#dc2626",
  ground: "#2563eb",
};

function popupHtml(s: Sighting): string {
  const label = s.label ? `<strong>${escapeHtml(s.label)}</strong><br/>` : "";
  return `${label}${formatDateTime(s.time)}<br/><span style="color:#64748b">${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}</span>`;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export default function MapView({ sightings, legs }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerRef.current;
    if (!map || !group) return;

    group.clearLayers();

    for (const leg of legs) {
      const color = MODE_COLOR[leg.mode];
      L.polyline(
        [
          [leg.from.lat, leg.from.lng],
          [leg.to.lat, leg.to.lng],
        ],
        {
          color,
          weight: leg.mode === "air" ? 3 : 2.5,
          opacity: 0.85,
          dashArray: leg.mode === "air" ? "8 8" : undefined,
        },
      ).addTo(group);

      const icon = L.divIcon({
        className: "arrow-icon",
        html:
          `<svg width="18" height="18" viewBox="0 0 24 24" ` +
          `style="transform: rotate(${leg.bearingDeg}deg)">` +
          `<path d="M12 2 L20 21 L12 16 L4 21 Z" fill="${color}" stroke="#fff" stroke-width="1.5"/></svg>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      L.marker([leg.midLat, leg.midLng], {
        icon,
        interactive: false,
        keyboard: false,
      }).addTo(group);
    }

    for (const s of sightings) {
      L.circleMarker([s.lat, s.lng], {
        radius: 6,
        color: "#ffffff",
        weight: 2,
        fillColor: "#0f172a",
        fillOpacity: 1,
      })
        .bindPopup(popupHtml(s))
        .addTo(group);
    }

    if (sightings.length === 1) {
      map.setView([sightings[0].lat, sightings[0].lng], 13);
    } else if (sightings.length > 1) {
      map.fitBounds(L.latLngBounds(sightings.map((s) => [s.lat, s.lng] as [number, number])), {
        padding: [40, 40],
        maxZoom: 13,
      });
    }
  }, [sightings, legs]);

  return (
    <div className="map-wrap">
      <div ref={containerRef} className="map-canvas" />
      <div className="legend">
        <div className="legend-row">
          <span className="legend-line air" /> Air travel &gt; 110 mph
        </div>
        <div className="legend-row">
          <span className="legend-line ground" /> Ground
        </div>
      </div>
      {legs.length > 0 && (
        <div className="map-summary">
          {legs.length} legs &middot;{" "}
          {formatDuration(legs.reduce((acc, l) => acc + l.hours, 0))} elapsed
        </div>
      )}
    </div>
  );
}

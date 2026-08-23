import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(rootDir, "public", "data.json");

interface RawSighting {
  time?: unknown;
  lat?: unknown;
  lng?: unknown;
  label?: unknown;
}

function validateSightings(input: unknown): string {
  if (typeof input !== "object" || input === null || !("sightings" in input)) {
    return 'Expected a JSON object with a "sightings" array.';
  }
  const sightings = (input as { sightings: unknown }).sightings;
  if (!Array.isArray(sightings)) {
    return '"sightings" must be an array.';
  }
  for (let i = 0; i < sightings.length; i++) {
    const s = sightings[i] as RawSighting;
    if (typeof s !== "object" || s === null) return `Sighting ${i} must be an object.`;
    if (typeof s.time !== "string" || Number.isNaN(new Date(s.time).getTime())) {
      return `Sighting ${i}: "time" must be an ISO date string.`;
    }
    if (typeof s.lat !== "number" || s.lat < -90 || s.lat > 90) {
      return `Sighting ${i}: "lat" must be a number between -90 and 90.`;
    }
    if (typeof s.lng !== "number" || s.lng < -180 || s.lng > 180) {
      return `Sighting ${i}: "lng" must be a number between -180 and 180.`;
    }
    if (s.label !== undefined && typeof s.label !== "string") {
      return `Sighting ${i}: "label" must be a string if present.`;
    }
  }
  return "";
}

// Dev-only middleware: POST /api/data writes public/data.json.
// On a static host this endpoint simply does not exist.
function adminApiPlugin(): Plugin {
  return {
    name: "admin-api",
    configureServer(server) {
      server.middlewares.use("/api/data", (req, res, next) => {
        if (req.method !== "POST") {
          next();
          return;
        }
        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", () => {
          try {
            const body = Buffer.concat(chunks).toString("utf-8");
            let parsed: unknown;
            try {
              parsed = JSON.parse(body);
            } catch {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Invalid JSON." }));
              return;
            }
            const error = validateSightings(parsed);
            if (error) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error }));
              return;
            }
            fs.writeFileSync(DATA_FILE, JSON.stringify(parsed, null, 2) + "\n");
            const count = (parsed as { sightings: unknown[] }).sightings.length;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true, count }));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: String(err) }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), adminApiPlugin()],
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
  },
  preview: {
    host: "0.0.0.0",
    allowedHosts: true,
  },
});

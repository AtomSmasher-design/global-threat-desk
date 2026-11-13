// Global Threat Desk collector.
// Runs on a GitHub Actions schedule. It reads every source that a phone browser cannot
// read directly (no CORS headers), and publishes the untouched replies to the `live`
// branch as JSON. The desk reads those files from raw.githubusercontent.com, which any
// browser can read, so the dashboard no longer depends on free public relays.
//
// The source list is taken from the desk's own HTML file(s) in this repository, so a new
// version of the desk is collected automatically without editing this script.

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const OUT = process.argv[2] || "out";
const REPO_RAW = "https://raw.githubusercontent.com/" + (process.env.GITHUB_REPOSITORY || "AtomSmasher-design/global-threat-desk") + "/live/";
const UA = "GlobalThreatDesk-collector/1.0 (+https://github.com/AtomSmasher-design/global-threat-desk)";
const MAX_TEXT = 6_000_000;
const CARRY_MS = 24 * 3600e3;

// Hosts a browser can already read directly. The desk reads these itself.
const DIRECT = ["environment.data.gov.uk", "data.elexon.co.uk", "raw.githubusercontent.com", "earthquake.usgs.gov",
  "eonet.gsfc.nasa.gov", "en.wikipedia.org", "api.open-meteo.com", "geocoding-api.open-meteo.com", "api.postcodes.io",
  "services.nvd.nist.gov"];
// Sources the dashboard tiles use. Kept in a small file so the Brief loads fast.
const DASH_HOSTS = ["www.gov.uk", "www.metoffice.gov.uk", "flood-warning.naturalresources.wales", "beta.sepa.scot", "www.sepa.org.uk"];

const FEED_KINDS = "rss|metwarn|gdelt|wikievents|syswarn|gbmix|gbfreq|kev|usgs|eonet|floods|nvd|plannedtests";
const gdeltUrl = q => "https://api.gdeltproject.org/api/v2/doc/doc?query=" + encodeURIComponent(q) + "&mode=artlist&maxrecords=250&format=json&sort=datedesc&timespan=3d";

function sourcesFromDesk() {
  const urls = new Set(), gdelt = new Set();
  for (const name of readdirSync(".").filter(f => /\.html$/i.test(f))) {
    const html = readFileSync(name, "utf8");
    for (const line of html.split("\n")) {
      if (!new RegExp('\\bkind"?\\s*:\\s*"(' + FEED_KINDS + ')"').test(line) && !/relay:\s*true/.test(line)) continue;
      for (const m of line.matchAll(/"?(?:url|fallback)"?\s*:\s*"(https:[^"]+)"/g)) urls.add(m[1]);
    }
    for (const m of html.matchAll(/gdeltUrl\('((?:[^'\\]|\\.)*)'\)/g)) gdelt.add(gdeltUrl(m[1]));
  }
  const keep = [...urls].filter(u => { try { return !DIRECT.includes(new URL(u).hostname); } catch { return false; } });
  return { plain: keep.sort(), gdelt: [...gdelt] };
}

async function grab(url, ms = 25000) {
  const at = new Date().toISOString();
  try {
    const r = await fetch(url, { headers: { "user-agent": UA, accept: "*/*" }, redirect: "follow", signal: AbortSignal.timeout(ms) });
    const text = await r.text();
    if (!r.ok) return { ok: false, status: r.status, at, error: "HTTP " + r.status };
    if (text.length > MAX_TEXT) return { ok: false, status: r.status, at, error: "too large" };
    if (!text.trim()) return { ok: false, status: r.status, at, error: "empty reply" };
    return { ok: true, status: r.status, at, text };
  } catch (e) {
    return { ok: false, status: 0, at, error: String((e && (e.cause?.code || e.name || e.message)) || e).slice(0, 120) };
  }
}

async function previous(file) {
  try {
    const r = await fetch(REPO_RAW + file + "?t=" + Date.now(), { headers: { "user-agent": UA }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) return {};
    const j = await r.json();
    return j && typeof j.entries === "object" ? j.entries : {};
  } catch { return {}; }
}

async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
}

const { plain, gdelt } = sourcesFromDesk();
const [prevDash, prevFeeds] = await Promise.all([previous("dash.json"), previous("feeds.json")]);
const results = new Map();
(await pool(plain, 6, grab)).forEach((r, k) => results.set(plain[k], r));
for (const u of gdelt) { // GDELT allows one request every five seconds
  let r = await grab(u, 30000);
  if (r.ok && /one every|limit requests/i.test(r.text.slice(0, 300))) { await new Promise(s => setTimeout(s, 7000)); r = await grab(u, 30000); }
  if (r.ok && /one every|limit requests/i.test(r.text.slice(0, 300))) r = { ok: false, status: 429, at: r.at, error: "GDELT rate limit" };
  results.set(u, r);
  await new Promise(s => setTimeout(s, 6500));
}

const now = Date.now(), dash = {}, feeds = {}, status = {};
for (const [url, r] of results) {
  const isDash = DASH_HOSTS.includes(new URL(url).hostname);
  const prev = (isDash ? prevDash : prevFeeds)[url];
  let entry = r;
  if (!r.ok && prev && prev.ok && typeof prev.text === "string" && now - Date.parse(prev.at) < CARRY_MS) {
    entry = { ...prev, carried: true, lastError: r.error };
  }
  (isDash ? dash : feeds)[url] = entry;
  status[url] = { ok: r.ok, status: r.status, at: r.at, error: r.error || "", bytes: r.text ? r.text.length : 0, carried: !!entry.carried };
}

const generatedAt = new Date().toISOString();
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "dash.json"), JSON.stringify({ generatedAt, entries: dash }));
writeFileSync(join(OUT, "feeds.json"), JSON.stringify({ generatedAt, entries: feeds }));
writeFileSync(join(OUT, "status.json"), JSON.stringify({ generatedAt, sources: status }, null, 1));
const okCount = [...results.values()].filter(r => r.ok).length;
console.log(`Collected ${okCount}/${results.size} sources at ${generatedAt}`);
for (const [u, s] of Object.entries(status)) if (!s.ok) console.log("FAILED", s.status, s.error, u);

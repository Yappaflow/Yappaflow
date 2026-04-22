"use client";

/**
 * /studio/new-reference — agency-facing surface for the design-reference pipeline.
 *
 * Flow (single scrolling surface, no wizard):
 *   1. Paste/edit agency chat transcript   → Classify
 *   2. Review + tweak the structured brief  → Search references
 *   3. Pick 4 references (structure / typography / motion / palette)
 *   4. Pick a target platform               → Build site
 *   5. Review generated files inline, download (client-side zip)
 *
 * Errors are surfaced inline. Long-running calls show a steady spinner because
 * search_references fires 8 Playwright extractions — can easily take 60s+.
 */

import { useMemo, useState } from "react";
import {
  classify,
  searchReferencesApi,
  buildSiteApi,
  type Brief,
  type RankedReference,
  type BuildResponse,
} from "@/lib/reference-api";

const PLATFORMS = ["html", "shopify", "wordpress", "ikas", "webflow"] as const;

type SlotKey = "structure" | "typography" | "motion" | "palette";

export default function NewReferencePage() {
  const [transcript, setTranscript] = useState<string>(
    "Luxury men's grooming ecommerce. Editorial hero, generous whitespace, Helvetica-ish type, muted earth tones, restrained motion. Launching on Shopify.",
  );
  const [brief, setBrief] = useState<Brief | null>(null);
  const [references, setReferences] = useState<RankedReference[]>([]);
  const [selection, setSelection] = useState<Record<SlotKey, number | null>>({
    structure: null,
    typography: null,
    motion: null,
    palette: null,
  });
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>("shopify");
  const [build, setBuild] = useState<BuildResponse | null>(null);
  const [activeFile, setActiveFile] = useState<string | null>(null);

  const [state, setState] = useState<{ busy: boolean; label?: string; error?: string }>({
    busy: false,
  });

  async function runClassify() {
    setState({ busy: true, label: "Classifying transcript…" });
    setBrief(null);
    setReferences([]);
    setBuild(null);
    try {
      const out = await classify(transcript);
      setBrief(out.brief);
      if (out.brief.preferred_platform) setPlatform(out.brief.preferred_platform);
    } catch (err) {
      setState({ busy: false, error: (err as Error).message });
      return;
    }
    setState({ busy: false });
  }

  async function runSearch() {
    if (!brief) return;
    setState({ busy: true, label: "Searching + extracting references (can take ~60s)…" });
    setReferences([]);
    setSelection({ structure: null, typography: null, motion: null, palette: null });
    setBuild(null);
    try {
      const out = await searchReferencesApi(brief, 8);
      setReferences(out.references);
      // auto-assign sensible defaults
      if (out.references[0]) {
        setSelection({
          structure: 0,
          typography: Math.min(1, out.references.length - 1),
          motion: Math.min(2, out.references.length - 1),
          palette: Math.min(3, out.references.length - 1),
        });
      }
    } catch (err) {
      setState({ busy: false, error: (err as Error).message });
      return;
    }
    setState({ busy: false });
  }

  async function runBuild() {
    if (!brief) return;
    const slots = selection;
    const missing = (["structure", "typography", "motion", "palette"] as SlotKey[]).filter(
      (k) => slots[k] === null,
    );
    if (missing.length) {
      setState({ busy: false, error: `Missing picks for: ${missing.join(", ")}` });
      return;
    }
    setState({ busy: true, label: `Building ${platform} site…` });
    setBuild(null);
    try {
      const out = await buildSiteApi({
        brief,
        platform,
        selection: {
          structure: references[slots.structure!].dna,
          typography: references[slots.typography!].dna,
          motion: references[slots.motion!].dna,
          palette: references[slots.palette!].dna,
        },
      });
      setBuild(out);
      setActiveFile(out.files[0]?.path ?? null);
    } catch (err) {
      setState({ busy: false, error: (err as Error).message });
      return;
    }
    setState({ busy: false });
  }

  const activeContent = useMemo(() => {
    if (!build || !activeFile) return "";
    return build.files.find((f) => f.path === activeFile)?.content ?? "";
  }, [build, activeFile]);

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white/90 font-sans">
      <div className="mx-auto max-w-5xl px-6 py-12 space-y-12">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">Yappaflow Studio</p>
          <h1 className="text-3xl font-semibold tracking-tight">Reference-driven build</h1>
          <p className="text-sm text-white/60">
            Paste an agency brief. We classify it, surface real-world references, let you assemble
            a design DNA from their best parts, and emit a platform-ready project.
          </p>
        </header>

        {state.error && (
          <div className="rounded border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {state.error}
          </div>
        )}

        {/* 1. Transcript */}
        <section className="space-y-3">
          <h2 className="text-sm uppercase tracking-wider text-white/50">1. Transcript</h2>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={6}
            className="w-full rounded border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/90 focus:border-white/30 focus:outline-none"
            placeholder="Paste the agency chat transcript or brief here."
          />
          <button
            onClick={runClassify}
            disabled={state.busy || !transcript.trim()}
            className="rounded bg-[#FF6B35] px-4 py-2 text-sm font-medium text-white hover:bg-[#FF8052] disabled:opacity-50"
          >
            {state.busy && state.label?.startsWith("Classifying") ? state.label : "Classify brief"}
          </button>
        </section>

        {/* 2. Brief */}
        {brief && (
          <section className="space-y-3">
            <h2 className="text-sm uppercase tracking-wider text-white/50">2. Brief</h2>
            <BriefView brief={brief} onChange={setBrief} />
            <button
              onClick={runSearch}
              disabled={state.busy}
              className="rounded bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-50"
            >
              {state.busy && state.label?.startsWith("Searching") ? state.label : "Search references"}
            </button>
          </section>
        )}

        {/* 3. References */}
        {references.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm uppercase tracking-wider text-white/50">
              3. References — pick one per slot
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {references.map((r, i) => (
                <ReferenceCard
                  key={r.url + i}
                  index={i}
                  ref={r}
                  selection={selection}
                  onPick={(slot) =>
                    setSelection((prev) => ({ ...prev, [slot]: prev[slot] === i ? null : i }))
                  }
                />
              ))}
            </div>
          </section>
        )}

        {/* 4. Platform + build */}
        {references.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm uppercase tracking-wider text-white/50">4. Platform</h2>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`rounded border px-3 py-1.5 text-xs uppercase tracking-wider ${
                    platform === p
                      ? "border-[#FF6B35] bg-[#FF6B35]/10 text-[#FF6B35]"
                      : "border-white/15 text-white/60 hover:text-white"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={runBuild}
              disabled={state.busy}
              className="rounded bg-[#FF6B35] px-4 py-2 text-sm font-medium text-white hover:bg-[#FF8052] disabled:opacity-50"
            >
              {state.busy && state.label?.startsWith("Building") ? state.label : "Build site"}
            </button>
          </section>
        )}

        {/* 5. Output */}
        {build && (
          <section className="space-y-3">
            <h2 className="text-sm uppercase tracking-wider text-white/50">
              5. Output — {build.platform} ({build.files.length} files)
            </h2>
            <p className="text-sm text-white/70">{build.summary}</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
              <ul className="rounded border border-white/10 bg-black/40 p-2 text-xs font-mono max-h-[70vh] overflow-auto">
                {build.files.map((f) => (
                  <li key={f.path}>
                    <button
                      className={`w-full text-left px-2 py-1 rounded hover:bg-white/5 ${
                        activeFile === f.path ? "bg-white/10 text-white" : "text-white/70"
                      }`}
                      onClick={() => setActiveFile(f.path)}
                    >
                      {f.path}
                    </button>
                  </li>
                ))}
              </ul>
              <pre className="rounded border border-white/10 bg-black/60 p-4 text-xs font-mono overflow-auto max-h-[70vh] whitespace-pre-wrap">
                {activeContent}
              </pre>
            </div>
            <ul className="list-disc pl-5 text-sm text-white/60 space-y-1">
              {build.nextSteps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
            <button
              onClick={() => downloadAsZip(build)}
              className="rounded bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
            >
              Download as .zip
            </button>
          </section>
        )}
      </div>
    </main>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

function BriefView({ brief, onChange }: { brief: Brief; onChange: (b: Brief) => void }) {
  function set<K extends keyof Brief>(k: K, v: Brief[K]) {
    onChange({ ...brief, [k]: v });
  }
  return (
    <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
      <TextField label="Industry" value={brief.industry} onChange={(v) => set("industry", v)} />
      <TextField label="Subcategory" value={brief.subcategory} onChange={(v) => set("subcategory", v)} />
      <TextField label="Audience" value={brief.audience} onChange={(v) => set("audience", v)} />
      <TextField label="Tone" value={brief.tone} onChange={(v) => set("tone", v)} />
      <TextField label="Palette" value={brief.palette_character} onChange={(v) => set("palette_character", v)} />
      <TextField label="Motion" value={brief.motion_ambition} onChange={(v) => set("motion_ambition", v)} />
      <TextField
        label="Grid archetype"
        value={brief.grid_archetype}
        onChange={(v) => set("grid_archetype", v as Brief["grid_archetype"])}
      />
      <TextField
        label="Content model"
        value={brief.content_model.join(", ")}
        onChange={(v) =>
          set(
            "content_model",
            v
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
      />
    </div>
  );
}

function TextField(props: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-xs uppercase tracking-widest text-white/40">
      {props.label}
      <input
        type="text"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="mt-1 block w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/90 focus:border-white/30 focus:outline-none"
      />
    </label>
  );
}

const SLOTS: Array<{ key: SlotKey; label: string; explanation: string }> = [
  { key: "structure", label: "Structure", explanation: "Grid, sections, content architecture" },
  { key: "typography", label: "Typography", explanation: "Font stack, scale" },
  { key: "motion", label: "Motion", explanation: "Transitions, scroll feel" },
  { key: "palette", label: "Palette", explanation: "Colors, CSS tokens" },
];

function ReferenceCard({
  index,
  ref,
  selection,
  onPick,
}: {
  index: number;
  ref: RankedReference;
  selection: Record<SlotKey, number | null>;
  onPick: (slot: SlotKey) => void;
}) {
  const activeSlots = SLOTS.filter((s) => selection[s.key] === index).map((s) => s.label);
  return (
    <div className="rounded border border-white/10 bg-black/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <a
            href={ref.url}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-sm font-medium text-white hover:underline"
          >
            {ref.url}
          </a>
          <p className="text-xs text-white/50">
            concept {ref.conceptScore.toFixed(2)} · craft {ref.craftScore.toFixed(2)} · pareto{" "}
            {ref.paretoRank}
          </p>
        </div>
        {activeSlots.length > 0 && (
          <span className="shrink-0 rounded bg-[#FF6B35]/10 px-2 py-1 text-xs uppercase tracking-wider text-[#FF6B35]">
            {activeSlots.join(" · ")}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SLOTS.map((slot) => {
          const selected = selection[slot.key] === index;
          return (
            <button
              key={slot.key}
              onClick={() => onPick(slot.key)}
              title={slot.explanation}
              className={`rounded border px-2 py-1 text-xs ${
                selected
                  ? "border-[#FF6B35] bg-[#FF6B35]/10 text-[#FF6B35]"
                  : "border-white/15 text-white/60 hover:text-white"
              }`}
            >
              Use for {slot.label.toLowerCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── client-side zip helper ─────────────────────────────────────────────
//
// Keeps the page self-contained (no JSZip import). Uses a minimal "store"-mode
// (no compression) zip writer. For >100 text files this is plenty — a proper
// zip with deflate can be added when the output includes binary assets.

async function downloadAsZip(build: BuildResponse) {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  function crc32(buf: Uint8Array): number {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = c ^ buf[i];
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function writeHeader(name: string, data: Uint8Array, crc: number) {
    const nameBytes = encoder.encode(name);
    const local = new Uint8Array(30 + nameBytes.length + data.length);
    const dv = new DataView(local.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true); // version
    dv.setUint16(6, 0, true); // flags
    dv.setUint16(8, 0, true); // method 0 = store
    dv.setUint16(10, 0, true); // time
    dv.setUint16(12, 0, true); // date
    dv.setUint32(14, crc, true);
    dv.setUint32(18, data.length, true);
    dv.setUint32(22, data.length, true);
    dv.setUint16(26, nameBytes.length, true);
    dv.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    local.set(data, 30 + nameBytes.length);

    const centralEntry = new Uint8Array(46 + nameBytes.length);
    const cdv = new DataView(centralEntry.buffer);
    cdv.setUint32(0, 0x02014b50, true);
    cdv.setUint16(4, 20, true);
    cdv.setUint16(6, 20, true);
    cdv.setUint16(8, 0, true);
    cdv.setUint16(10, 0, true);
    cdv.setUint16(12, 0, true);
    cdv.setUint16(14, 0, true);
    cdv.setUint32(16, crc, true);
    cdv.setUint32(20, data.length, true);
    cdv.setUint32(24, data.length, true);
    cdv.setUint16(28, nameBytes.length, true);
    cdv.setUint16(30, 0, true);
    cdv.setUint16(32, 0, true);
    cdv.setUint16(34, 0, true);
    cdv.setUint16(36, 0, true);
    cdv.setUint32(38, 0, true);
    cdv.setUint32(42, offset, true);
    centralEntry.set(nameBytes, 46);

    chunks.push(local);
    central.push(centralEntry);
    offset += local.length;
  }

  for (const f of build.files) {
    const data = encoder.encode(f.content);
    writeHeader(f.path, data, crc32(data));
  }

  const centralSize = central.reduce((n, c) => n + c.length, 0);
  const centralStart = offset;
  for (const c of central) {
    chunks.push(c);
    offset += c.length;
  }

  const end = new Uint8Array(22);
  const edv = new DataView(end.buffer);
  edv.setUint32(0, 0x06054b50, true);
  edv.setUint16(4, 0, true);
  edv.setUint16(6, 0, true);
  edv.setUint16(8, build.files.length, true);
  edv.setUint16(10, build.files.length, true);
  edv.setUint32(12, centralSize, true);
  edv.setUint32(16, centralStart, true);
  edv.setUint16(20, 0, true);
  chunks.push(end);

  const blob = new Blob(chunks as BlobPart[], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `yappaflow-${build.platform}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

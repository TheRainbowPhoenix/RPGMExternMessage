// translate-qwen.ts
// Translate missing English entries in CSV using the Qwen3 Coder WebDev Space (no API key required).
import { parse, stringify } from "jsr:@std/csv";

const DEFAULT_BATCH_SIZE = 8;
const BASE_URL = "https://qwen-qwen3-coder-webdev.hf.space";
const JAPANESE_PATTERN =
  /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;
let qwenPrimed = false;
const POLL_RETRIES = 5;

type ExternRow = {
  key: string;
  jp?: string;
  en?: string;
  zh?: string;
  kr?: string;
  notes?: string;
};

type PluginRow = {
  original: string;
  translated?: string;
};

type Dataset =
  | { type: "extern"; rows: ExternRow[] }
  | { type: "plugin"; rows: PluginRow[] };

function hasJapanese(text: string | undefined): boolean {
  return !!text && JAPANESE_PATTERN.test(text);
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = Array.from(
    { length: b.length + 1 },
    (_, i) => [i],
  );
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[b.length][a.length];
}

function loadDataset(csvText: string): Dataset {
  const raw = parse(csvText, { skipFirstRow: false }) as string[][];
  if (raw.length === 0) throw new Error("CSV is empty");
  const header = raw[0].map((c) => String(c).toLowerCase());

  if (header.includes("original") && header.includes("translated")) {
    const rows = parse(csvText, {
      columns: ["original", "translated"],
      skipFirstRow: true,
    }) as PluginRow[];
    return { type: "plugin", rows };
  }

  const rows = parse(csvText, {
    columns: ["key", "jp", "en", "zh", "kr", "notes"],
    skipFirstRow: true,
  }) as ExternRow[];
  return { type: "extern", rows };
}

function serializeDataset(dataset: Dataset): string {
  if (dataset.type === "plugin") {
    return stringify(dataset.rows, {
      columns: ["original", "translated"],
      headers: ["original", "translated"],
    });
  }
  return stringify(dataset.rows, {
    columns: ["key", "jp", "en", "zh", "kr", "notes"],
    headers: ["key", "日本語", "English", "中文", "한국어", "タグ説明"],
  });
}

function selectSourceText(row: ExternRow | PluginRow, type: Dataset["type"]) {
  if (type === "plugin") {
    return (row as PluginRow).original;
  }
  const extern = row as ExternRow;
  return extern.jp?.trim() || extern.key?.trim();
}

function selectEnglish(row: ExternRow | PluginRow, type: Dataset["type"]) {
  return type === "plugin"
    ? (row as PluginRow).translated
    : (row as ExternRow).en;
}

function setEnglish(
  row: ExternRow | PluginRow,
  type: Dataset["type"],
  value: string,
) {
  if (type === "plugin") {
    (row as PluginRow).translated = value;
  } else {
    (row as ExternRow).en = value;
  }
}

function batch<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }
  return groups;
}

function buildPrompt(originals: string[]): string {
  const mapping = Object.fromEntries(originals.map((o) => [o, ""]));
  const baseInstruction =
    "Translate Japanese to short, simple English. Keep keys exactly the same and respond ONLY with JSON mapping of original->translation. Do not add commentary.";
  return `${baseInstruction}\n${JSON.stringify(mapping, null, 2)}`;
}

async function fetchJob(
  path: string,
  data: unknown[],
): Promise<string | Record<string, unknown>> {
  const res = await fetch(`${BASE_URL}/gradio_api/call/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  if (!res.ok) {
    throw new Error(`Qwen request failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  if (json?.event_id) return json.event_id as string;
  return json;
}

async function runEndpoint(path: string, data: unknown[] = []): Promise<void> {
  const result = await fetchJob(path, data);
  if (typeof result === "string") {
    await pollJob(path, result);
  }
}

async function pollJob(path: string, eventId: string): Promise<unknown> {
  for (let attempt = 1; attempt <= POLL_RETRIES; attempt++) {
    const res = await fetch(
      `${BASE_URL}/gradio_api/call/${path}/${eventId}`,
    );
    const buffer = await res.text();
    if (!res.ok) {
      throw new Error(`Qwen poll failed: ${res.status} ${buffer}`);
    }

    const objects = buffer.match(/\{[\s\S]*?\}/g) ?? [];
    for (const obj of objects) {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(obj);
      } catch {
        continue;
      }

      if (
        parsed.status === "FAILED"
      ) {
        throw new Error(`Qwen job failed: ${buffer}`);
      }

      if (parsed.data) {
        return parsed.data;
      }

      if (
        parsed.status === "COMPLETE" || parsed.status === "FINISHED" ||
        parsed.__type__ || typeof parsed.open === "boolean"
      ) {
        // status-only update; continue polling
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
  }

  throw new Error(
    "Qwen poll stream ended without usable data after retries.",
  );
}

function extractJsonMap(text: string): Record<string, string> {
  const match = text.match(/{[\s\S]*}/);
  if (!match) throw new Error("No JSON object found in Qwen response");
  const parsed = JSON.parse(match[0]);
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Qwen response JSON is not an object");
  }
  return parsed as Record<string, string>;
}

async function translateBatch(
  originals: string[],
): Promise<Record<string, string>> {
  if (!qwenPrimed) {
    await runEndpoint("open_modal_3");
    await runEndpoint("lambda_4");
    qwenPrimed = true;
  }

  const payload = buildPrompt(originals);
  const maybeEvent = await fetchJob("generate_code", [payload, ""]);

  let data: unknown;
  if (typeof maybeEvent === "string") {
    data = await pollJob("generate_code", maybeEvent);
  } else if (Array.isArray((maybeEvent as { data?: unknown }).data)) {
    data = (maybeEvent as { data: unknown[] }).data;
  } else {
    data = maybeEvent;
  }

  const text = Array.isArray(data) ? String(data[0]) : String(data ?? "");
  return extractJsonMap(text);
}

function findBestMatch(
  target: string,
  candidates: string[],
): { key: string; distance: number } | null {
  let best: { key: string; distance: number } | null = null;
  for (const key of candidates) {
    const distance = levenshteinDistance(target, key);
    if (best === null || distance < best.distance) {
      best = { key, distance };
    }
  }
  return best;
}

async function main() {
  const [inputPath, outputPathArg] = Deno.args;
  if (!inputPath) {
    console.log(
      "Usage: deno run -A translate-qwen.ts <input.csv> [output.csv]",
    );
    Deno.exit(1);
  }

  const outputPath = outputPathArg ?? inputPath;
  const batchSize = Number(Deno.env.get("QWEN_BATCH_SIZE")) ||
    DEFAULT_BATCH_SIZE;

  const dataset = loadDataset(await Deno.readTextFile(inputPath));
  const pending = dataset.rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => {
      const source = selectSourceText(row, dataset.type);
      const en = selectEnglish(row, dataset.type);
      return !en?.trim() && hasJapanese(source);
    });

  if (pending.length === 0) {
    console.log("No rows require translation.");
    return;
  }

  let translatedCount = 0;
  for (const group of batch(pending, batchSize)) {
    const originals = group.map(({ row }) =>
      selectSourceText(row, dataset.type)!
    );
    const translations = await translateBatch(originals);

    for (const { row } of group) {
      const source = selectSourceText(row, dataset.type)!;
      if (translations[source]) {
        setEnglish(row, dataset.type, translations[source]);
        translatedCount++;
        continue;
      }

      const best = findBestMatch(source, Object.keys(translations));
      if (!best) continue;
      const tolerance = Math.max(1, Math.floor(source.length * 0.1));
      if (best.distance <= tolerance) {
        setEnglish(row, dataset.type, translations[best.key]);
        translatedCount++;
      }
    }
  }

  await Deno.writeTextFile(outputPath, serializeDataset(dataset));
  console.log(
    `Translated ${translatedCount} entries out of ${pending.length}. Saved to ${outputPath}.`,
  );
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    Deno.exit(1);
  });
}

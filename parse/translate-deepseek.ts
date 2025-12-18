// translate-deepseek.ts
// Translate missing English entries in CSV using the DeepSeek API.
import { parse, stringify } from "jsr:@std/csv";

const DEFAULT_BATCH_SIZE = 15;
const JAPANESE_PATTERN =
  /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;

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

async function translateBatch(
  originals: string[],
  apiKey: string,
  apiUrl: string,
  model: string,
): Promise<Record<string, string>> {
  const messages = [
    {
      role: "system",
      content:
        "Translate each provided Japanese string into concise English. Return ONLY a JSON object mapping each original string to its English translation.",
    },
    {
      role: "user",
      content: JSON.stringify(
        Object.fromEntries(originals.map((o) => [o, ""])),
        null,
        2,
      ),
    },
  ];

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`DeepSeek request failed: ${response.status} ${body}`);
  }

  const { choices } = await response.json();
  const content = choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No content returned from DeepSeek");
  }

  return JSON.parse(content) as Record<string, string>;
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
      "Usage: deno run -A translate-deepseek.ts <input.csv> [output.csv]",
    );
    Deno.exit(1);
  }

  const outputPath = outputPathArg ?? inputPath;
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!apiKey) throw new Error("Set DEEPSEEK_API_KEY in the environment.");
  const apiUrl = Deno.env.get("DEEPSEEK_API_URL") ??
    "https://api.deepseek.com/v1/chat/completions";
  const model = Deno.env.get("DEEPSEEK_MODEL") ?? "deepseek-chat";
  const batchSize = Number(Deno.env.get("DEEPSEEK_BATCH_SIZE")) ||
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
    const translations = await translateBatch(
      originals,
      apiKey,
      apiUrl,
      model,
    );

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

// plugins-text.ts
// Extracts Japanese strings from plugins.js into a CSV and applies translations back.
import { parse as parseCsv, stringify } from "jsr:@std/csv";

const JAPANESE_PATTERN =
  /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;

interface TranslationRow {
  original: string;
  translated: string;
}

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeStringLiteral(content: string): string | null {
  try {
    return JSON.parse(
      `"${content.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
    );
  } catch {
    return null;
  }
}

function encodeForPluginsFile(value: string): string {
  return JSON.stringify(value).slice(1, -1);
}

function hasJapanese(text: string): boolean {
  return JAPANESE_PATTERN.test(text);
}

async function readExistingTranslations(
  csvPath: string,
): Promise<Map<string, string>> {
  const existing = new Map<string, string>();

  try {
    const csvText = await Deno.readTextFile(csvPath);
    const records = parseCsv(csvText, {
      columns: ["original", "translated"],
      skipFirstRow: true,
    }) as TranslationRow[];

    for (const row of records) {
      if (!row.original) continue;
      existing.set(row.original, row.translated ?? "");
    }
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }
  }

  return existing;
}

async function extractJapaneseStrings(
  pluginsPath: string,
  csvPath: string,
) {
  const content = await Deno.readTextFile(pluginsPath);
  const seen = new Set<string>();
  const matches = content.matchAll(/"((?:\\.|[^"\\])*)"/g);

  for (const match of matches) {
    const rawContent = match[1];
    const decoded = decodeStringLiteral(rawContent);
    if (!decoded || !hasJapanese(decoded)) continue;
    seen.add(decoded);
  }

  if (seen.size === 0) {
    console.log("No Japanese strings found in plugins file.");
    return;
  }

  const existing = await readExistingTranslations(csvPath);

  const rows = Array.from(seen)
    .sort((a, b) => a.localeCompare(b))
    .map((original) => ({
      original,
      translated: existing.get(original) ?? "",
    }));

  const csvOutput = stringify(rows, {
    columns: ["original", "translated"],
    headers: ["original", "translated"],
  });

  await Deno.writeTextFile(csvPath, csvOutput);
  console.log(
    `Extracted ${rows.length} unique Japanese strings to ${csvPath}.`,
  );
}

function sortTranslations(
  translations: TranslationRow[],
): TranslationRow[] {
  return translations
    .filter((row) => row.original && row.translated)
    .sort((a, b) => b.original.length - a.original.length);
}

async function loadTranslations(csvPath: string): Promise<TranslationRow[]> {
  const csvText = await Deno.readTextFile(csvPath);
  const records = parseCsv(csvText, {
    columns: ["original", "translated"],
    skipFirstRow: true,
  }) as TranslationRow[];

  return records;
}

async function applyTranslations(
  pluginsPath: string,
  csvPath: string,
) {
  const translations = sortTranslations(await loadTranslations(csvPath));

  if (translations.length === 0) {
    console.log("No translations with both columns filled.");
    return;
  }

  let content = await Deno.readTextFile(pluginsPath);
  let totalReplacements = 0;
  const missing: string[] = [];

  for (const { original, translated } of translations) {
    const search = encodeForPluginsFile(original);
    const replacement = encodeForPluginsFile(translated);
    const pattern = new RegExp(`"${escapeForRegex(search)}"`, "g");
    const matches = content.match(pattern)?.length ?? 0;

    if (matches === 0) {
      missing.push(original);
      continue;
    }

    content = content.replace(pattern, `"${replacement}"`);
    totalReplacements += matches;
  }

  if (totalReplacements === 0) {
    console.log("No matching strings from CSV were found in plugins file.");
    return;
  }

  await Deno.writeTextFile(pluginsPath, content);
  console.log(`Applied ${totalReplacements} replacements to ${pluginsPath}.`);

  if (missing.length > 0) {
    console.log(
      `Skipped ${missing.length} entries that were not present in ${pluginsPath}.`,
    );
  }
}

function printUsage() {
  console.log(
    "Usage:\n" +
      "  deno run -A plugins-text.ts extract [pluginsPath] [csvPath]\n" +
      "  deno run -A plugins-text.ts apply [pluginsPath] [csvPath]\n\n" +
      "Defaults:\n" +
      "  pluginsPath: ../js/plugins.js\n" +
      "  csvPath: plugins_text.csv",
  );
}

async function main() {
  const [command, pluginsPathArg, csvPathArg] = Deno.args;
  const pluginsPath = pluginsPathArg ?? "../js/plugins.js";
  const csvPath = csvPathArg ?? "plugins_text.csv";

  if (command === "extract") {
    await extractJapaneseStrings(pluginsPath, csvPath);
  } else if (command === "apply") {
    await applyTranslations(pluginsPath, csvPath);
  } else {
    printUsage();
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    Deno.exit(1);
  });
}

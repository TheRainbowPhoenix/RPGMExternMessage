// plugins-text-check.ts
// Quick sanity checker: extracts Japanese-only chunks from plugins.js and
// verifies they all exist in plugins_text.csv.
import { parse } from "jsr:@std/csv";

const JAPANESE_PATTERN =
  /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;
const JAPANESE_SEGMENT =
  /[\\/\-\+\s0-9％%！？!?、。，．｡…～〜ー（）()「」『』【】［］〔〕〈〉《》｛｝＜＞≪≫・：；＝=_’'…。、・ー\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]+/gu;

function hasJapanese(text: string): boolean {
  return JAPANESE_PATTERN.test(text);
}

function collectJapanese(text: string): Set<string> {
  const results = new Set<string>();
  for (const match of text.matchAll(JAPANESE_SEGMENT)) {
    const candidate = match[0].trim();
    if (candidate && hasJapanese(candidate)) {
      results.add(candidate);
    }
  }
  return results;
}

async function main() {
  const pluginsPath = Deno.args[0] ?? "../js/plugins.js";
  const csvPath = Deno.args[1] ?? "plugins_text.csv";

  const pluginText = await Deno.readTextFile(pluginsPath);
  const fromPlugins = collectJapanese(pluginText);

  const csvText = await Deno.readTextFile(csvPath);
  const records = parse(csvText, {
    columns: ["original", "translated"],
    skipFirstRow: true,
  }) as Array<{ original: string }>;
  const fromCsv = new Set(
    records.map((r) => (r.original ?? "").trim()).filter(Boolean),
  );

  const missing: string[] = [];
  for (const text of fromPlugins) {
    if (!fromCsv.has(text)) {
      missing.push(text);
    }
  }

  console.log(
    `Found ${fromPlugins.size} unique Japanese chunks in ${pluginsPath}.`,
  );
  console.log(`CSV contains ${fromCsv.size} originals.`);

  if (missing.length === 0) {
    console.log("All plugin strings are present in the CSV.");
    return;
  }

  console.log(`Missing ${missing.length} entries from CSV:`);
  missing.slice(0, 50).forEach((t, i) => console.log(`${i + 1}. ${t}`));
  if (missing.length > 50) {
    console.log("... (truncated)");
  }
  Deno.exit(1);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    Deno.exit(1);
  });
}

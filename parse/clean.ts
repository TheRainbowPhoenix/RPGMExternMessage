// clean-csv.ts
import { parse, stringify } from "jsr:@std/csv";

function cleanTranslatedText(text: string): string {
  // Cleanup implementation from previous answer
  let cleaned = text.replace(/^"/g, '').replace(/"$/g, ''); // remove start and end 
  cleaned = cleaned.replace(/❤️|💘|💝|💖|💗|💓|💞|💕|💟|💔|❣️|💌|🖤|💙|💚|💛|💜|🧡/g, '❤');
  cleaned = cleaned.replace(
    /[\u{1F600}-\u{1F64F}\u{1F910}-\u{1F92F}\u{1F970}-\u{1F976}\u{1F9D0}-\u{1F9DF}]/gu, 
    ''
  );
  return cleaned;
}

async function cleanCSV(inputPath: string, outputPath: string) {
  // Read input CSV
  const csvText = await Deno.readTextFile(inputPath);
  const records = parse(csvText, {
    columns: ["key", "jp", "en", "zh", "kr", "notes"],
    skipFirstRow: true
  });

  // Process records
  const cleanedRecords = records.map(record => ({
    ...record,
    en: record.en ? cleanTranslatedText(record.en) : record.en
  }));

  // Write cleaned CSV
  const outputText = stringify(cleanedRecords, {
    columns: ["key", "jp", "en", "zh", "kr", "notes"],
    headers: ["key", "日本語", "English", "中文", "한국어", "タグ説明"]
  });

  await Deno.writeTextFile(outputPath, outputText);
  console.log(`Cleaned ${cleanedRecords.length} records`);
}

// Run with: deno run --allow-read --allow-write clean-csv.ts
if (import.meta.main) {
  const input = "ExternMessage_Auto.csv";
  const output = "ExternMessage_AutoClean.csv";
  await cleanCSV(input, output);
}
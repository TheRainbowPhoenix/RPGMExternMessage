// text-extractor.ts
import { 
  MapData, 
  MapEvent, 
  EventPage, 
  parseMapData, 
  CommonEvent, 
  parseCommonEventsData, 
  EventCommand,
  DataTroop,
  parseTroopsData
} from "./structs.ts";

// Add these new interfaces to your structs.ts file if they don't exist
interface DataActor {
    id: number;
    name: string;
    note: string;
    battlerName: string;
    characterIndex: number;
    characterName: string;
    classId: number;
    equips: number[];
    faceIndex: number;
    faceName: string;
    traits: any[]; // Replace with proper trait interface if needed
    initialLevel: number;
    maxLevel: number;
    nickname: string;
    profile: string;
}

interface DataItem {
    id: number;
    name: string;
    note: string;
    description: string;
    iconIndex: number;
    itypeId: number;
    price: number;
}

interface DataSkill {
    id: number;
    name: string;
    note: string;
    message1: string;
    message2: string;
    messageType: number;
    mpCost: number;
    requiredWtypeId1: number;
    requiredWtypeId2: number;
    stypeId: number;
    tpCost: number;
}

interface DataEnemy {
    id: number;
    name: string;
    note: string;
    actions: any[]; // Replace with proper action interface if needed
    battlerHue: number;
    battlerName: string;
    dropItems: any[]; // Replace with proper drop item interface if needed
    exp: number;
    traits: any[]; // Replace with proper trait interface if needed
    gold: number;
    params: number[];
}

// Parsing functions for these new types
function parseDataActor(raw: any): DataActor {
    return {
        id: Number(raw.id),
        name: String(raw.name || ""),
        note: String(raw.note || ""),
        battlerName: String(raw.battlerName || ""),
        characterIndex: Number(raw.characterIndex || 0),
        characterName: String(raw.characterName || ""),
        classId: Number(raw.classId || 1),
        equips: Array.isArray(raw.equips) ? raw.equips.map(Number) : [],
        faceIndex: Number(raw.faceIndex || 0),
        faceName: String(raw.faceName || ""),
        traits: Array.isArray(raw.traits) ? raw.traits : [],
        initialLevel: Number(raw.initialLevel || 1),
        maxLevel: Number(raw.maxLevel || 99),
        nickname: String(raw.nickname || ""),
        profile: String(raw.profile || "")
    };
}

function parseDataItem(raw: any): DataItem {
    return {
        id: Number(raw.id),
        name: String(raw.name || ""),
        note: String(raw.note || ""),
        description: String(raw.description || ""),
        iconIndex: Number(raw.iconIndex || 0),
        itypeId: Number(raw.itypeId || 1),
        price: Number(raw.price || 0)
    };
}

function parseDataSkill(raw: any): DataSkill {
    return {
        id: Number(raw.id),
        name: String(raw.name || ""),
        note: String(raw.note || ""),
        message1: String(raw.message1 || ""),
        message2: String(raw.message2 || ""),
        messageType: Number(raw.messageType || 0),
        mpCost: Number(raw.mpCost || 0),
        requiredWtypeId1: Number(raw.requiredWtypeId1 || 0),
        requiredWtypeId2: Number(raw.requiredWtypeId2 || 0),
        stypeId: Number(raw.stypeId || 0),
        tpCost: Number(raw.tpCost || 0)
    };
}

function parseDataEnemy(raw: any): DataEnemy {
    return {
        id: Number(raw.id),
        name: String(raw.name || ""),
        note: String(raw.note || ""),
        actions: Array.isArray(raw.actions) ? raw.actions : [],
        battlerHue: Number(raw.battlerHue || 0),
        battlerName: String(raw.battlerName || ""),
        dropItems: Array.isArray(raw.dropItems) ? raw.dropItems : [],
        exp: Number(raw.exp || 0),
        traits: Array.isArray(raw.traits) ? raw.traits : [],
        gold: Number(raw.gold || 0),
        params: Array.isArray(raw.params) ? raw.params : []
    };
}

async function readExistingTexts(csvPath: string): Promise<Set<string>> {
  const existing = new Set<string>();
  try {
    const content = await Deno.readTextFile(csvPath);
    const lines = content.split("\n");
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("{") || trimmed.startsWith(",日本語")) continue;
      
      const text = trimmed.split(",")[0]
        .replace(/^"+|"+$/g, "") // Remove surrounding quotes
        .trim();
      if (text) existing.add(text);
    }
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) throw err;
  }
  return existing;
}

function extractCommentsFromParameters(parameters: unknown[]): string[] {
  const texts: string[] = [];
  
  for (const param of parameters) {
    if (typeof param === 'string') {
      // Look for this._comments[0].push("text") pattern (unescaped in JSON)
      const commentPattern = /this\._comments\[0\]\.push\(\"((?:[^\"\\]|\\.)*?)\"\)/g;
      let match;
      while ((match = commentPattern.exec(param)) !== null) {
        const extractedText = match[1];
        if (extractedText.trim()) {
          texts.push(extractedText);
        }
      }
      
      // Also look for comments[1] if needed
      const commentPattern2 = /this\._comments\[1\]\.push\(\"((?:[^\"\\]|\\.)*?)\"\)/g;
      let match2;
      while ((match2 = commentPattern2.exec(param)) !== null) {
        const extractedText = match2[1];
        if (extractedText.trim()) {
          texts.push(extractedText);
        }
      }
    }
  }
  
  return texts;
}

function extractListTexts(list: EventCommand[]): string[] {
  const texts: string[] = [];
  
  for (const cmd of list) {
    // Extract from parameters of any command (not just text commands)
    const paramTexts = extractCommentsFromParameters(cmd.parameters);
    texts.push(...paramTexts);
  }
  
  return texts;
}

async function processMap(
  mapPath: string,
  existing: Set<string>,
  globalTextRegistry: Set<string>
) {
  const newEntries: string[] = [];
  const mapMatch = mapPath.match(/Map(\d+)\.json/);
  const mapId = parseInt(mapMatch?.[1] || "0");
  
  try {
    const json = await Deno.readTextFile(mapPath);
    const map = parseMapData(json);

    for (const event of map.events.filter((e): e is MapEvent => !!e)) {
      for (let pageIdx = 0; pageIdx < event.pages.length; pageIdx++) {
        const page = event.pages[pageIdx];
        
        const texts = extractListTexts(page.list);
        
        const mapSpecificEntries: string[] = [];

        texts.forEach(t => {
          if (!existing.has(t) && !globalTextRegistry.has(t)) {
            mapSpecificEntries.push(`"${t}",,,,,`);
            globalTextRegistry.add(t);
          }
        });

        if (mapSpecificEntries.length > 0) {
          newEntries.push("", `${mapId}:${event.name}:${pageIdx},,,,,`);
          newEntries.push(...mapSpecificEntries);
        }
      }
    }
  } catch (err) {
    console.error(`Error processing ${mapPath}:`, err);
  }

  return newEntries;
}

/**
 * Processes CommonEvents.json to extract texts
 */
async function processCommonEvents(
  commonEventsPath: string,
  existing: Set<string>,
  globalTextRegistry: Set<string>
) {
    const newEntries: string[] = [];

    try {
        const json = await Deno.readTextFile(commonEventsPath);
        const commonEvents = parseCommonEventsData(json);

        for (const event of commonEvents.filter((e): e is CommonEvent => !!e)) {
            const texts = extractListTexts(event.list); // Use generalized function
            const eventSpecificEntries: string[] = [];

            texts.forEach(t => {
                if (!existing.has(t) && !globalTextRegistry.has(t)) {
                    eventSpecificEntries.push(`"${t}",,,,,`);
                    globalTextRegistry.add(t);
                }
            });

            if (eventSpecificEntries.length > 0) {
                // Tag format: CE<EventId>:<EventName>
                newEntries.push("", `CE${event.id}:${event.name},,,,,`);
                newEntries.push(...eventSpecificEntries);
            }
        }

    } catch (err) {
        if (!(err instanceof Deno.errors.NotFound)) {
            console.error(`Error processing ${commonEventsPath}:`, err);
        }
    }

    return newEntries;
}

/**
 * Processes Troops.json to extract texts
 */
async function processTroops(
  troopsPath: string,
  existing: Set<string>,
  globalTextRegistry: Set<string>
) {
    const newEntries: string[] = [];

    try {
        const json = await Deno.readTextFile(troopsPath);
        const troops = parseTroopsData(json);

        for (const troop of troops.filter((t): t is DataTroop => !!t)) {
            for (const page of troop.pages) {
                const texts = extractListTexts(page.list);
                const troopSpecificEntries: string[] = [];

                texts.forEach(t => {
                    if (!existing.has(t) && !globalTextRegistry.has(t)) {
                        troopSpecificEntries.push(`"${t}",,,,,`);
                        globalTextRegistry.add(t);
                    }
                });

                if (troopSpecificEntries.length > 0) {
                    // Tag format: BT<TroopId>:<TroopName>
                    newEntries.push("", `BT${troop.id}:${troop.name},,,,,`);
                    newEntries.push(...troopSpecificEntries);
                }
            }
        }

    } catch (err) {
        if (!(err instanceof Deno.errors.NotFound)) {
            console.error(`Error processing ${troopsPath}:`, err);
        }
    }

    return newEntries;
}

// Function to extract notes from data files
async function extractNotesFromDataFile(filePath: string, dataType: string): Promise<Record<string, string>> {
    const notesMap: Record<string, string> = {};
    
    try {
        const content = await Deno.readTextFile(filePath);
        const data = JSON.parse(content);
        
        if (Array.isArray(data)) {
            for (const item of data) {
                if (item && typeof item === 'object' && item.note) {
                    const key = `${dataType}_${item.id || 'unknown'}`;
                    notesMap[key] = item.note;
                }
            }
        }
    } catch (err) {
        console.error(`Error processing ${filePath}:`, err);
    }
    
    return notesMap;
}

// Function to extract all notes from various data files
async function extractAllNotes(outputPath: string = "notes_map.json") {
    const allNotes: Record<string, string> = {};
    
    // Process different data files
    const dataFiles = [
        { path: "Actors.json", type: "Actor" },
        { path: "Classes.json", type: "Class" },
        { path: "Enemies.json", type: "Enemy" },
        { path: "Items.json", type: "Item" },
        { path: "Skills.json", type: "Skill" },
        { path: "Weapons.json", type: "Weapon" },
        { path: "Armors.json", type: "Armor" },
        { path: "States.json", type: "State" },
        { path: "Tilesets.json", type: "Tileset" },
        { path: "Animations.json", type: "Animation" },
        { path: "System.json", type: "System" },
        { path: "MapInfos.json", type: "MapInfo" },
    ];
    
    for (const file of dataFiles) {
        try {
            const content = await Deno.readTextFile(file.path);
            const data = JSON.parse(content);
            
            if (Array.isArray(data)) {
                for (const item of data) {
                    if (item && typeof item === 'object' && item.note) {
                        const key = `${file.type}_${item.id || 'unknown'}`;
                        allNotes[key] = item.note;
                    }
                }
            }
        } catch (err) {
            // File might not exist, continue
            console.log(`File not found or error processing ${file.path}:`, err.message);
        }
    }
    
    // Write to JSON file
    await Deno.writeTextFile(outputPath, JSON.stringify(allNotes, null, 2));
    console.log(`Extracted ${Object.keys(allNotes).length} notes to ${outputPath}`);
    
    // Print first few entries
    const entries = Object.entries(allNotes);
    console.log("First few extracted notes:");
    for (let i = 0; i < Math.min(10, entries.length); i++) {
        console.log(`${i + 1}: ${entries[i][0]}: "${entries[i][1].substring(0, 50)}..."`);
    }
}

// New function to extract all comments and save to translation map
async function extractAllComments(outputPath: string = "translation_map.json") {
  const allComments: Record<string, string> = {};
  const processedTexts = new Set<string>();

  // Process CommonEvents.json
  try {
    const json = await Deno.readTextFile("CommonEvents.json");
    const commonEvents = parseCommonEventsData(json);

    for (const event of commonEvents.filter((e): e is CommonEvent => !!e)) {
      const texts = extractListTexts(event.list);
      for (const text of texts) {
        if (!processedTexts.has(text)) {
          allComments[text] = text; // Default to same text
          processedTexts.add(text);
        }
      }
    }
  } catch (err) {
    console.error("Error processing CommonEvents.json:", err);
  }

  // Process Troops.json
  try {
    const json = await Deno.readTextFile("Troops.json");
    const troops = parseTroopsData(json);

    for (const troop of troops.filter((t): t is DataTroop => !!t)) {
      for (const page of troop.pages) {
        const texts = extractListTexts(page.list);
        for (const text of texts) {
          if (!processedTexts.has(text)) {
            allComments[text] = text; // Default to same text
            processedTexts.add(text);
          }
        }
      }
    }
  } catch (err) {
    console.error("Error processing Troops.json:", err);
  }

  // Process all Map*.json files
  for await (const dirEntry of Deno.readDir(".")) {
    if (dirEntry.name.startsWith("Map") && dirEntry.name.endsWith(".json")) {
      try {
        const json = await Deno.readTextFile(dirEntry.name);
        const map = parseMapData(json);

        for (const event of map.events.filter((e): e is MapEvent => !!e)) {
          for (const page of event.pages) {
            const texts = extractListTexts(page.list);
            for (const text of texts) {
              if (!processedTexts.has(text)) {
                allComments[text] = text; // Default to same text
                processedTexts.add(text);
              }
            }
          }
        }
      } catch (err) {
        console.error(`Error processing ${dirEntry.name}:`, err);
      }
    }
  }

  // Write to JSON file
  await Deno.writeTextFile(outputPath, JSON.stringify(allComments, null, 2));
  console.log(`Extracted ${Object.keys(allComments).length} unique comments to ${outputPath}`);
  
  // Print first few entries
  const entries = Object.entries(allComments);
  console.log("First few extracted comments:");
  for (let i = 0; i < Math.min(10, entries.length); i++) {
    console.log(`${i + 1}: "${entries[i][0]}"`);
  }
}

async function main() {
  const args = Deno.args;
  
  if (args.includes("--extract-comments")) {
    // Just extract comments to translation map
    await extractAllComments();
  } else if (args.includes("--extract-notes")) {
    // Extract notes from data files
    await extractAllNotes();
  } else {
    // Original functionality
    const CSV_PATH = "ExternMessage.csv";
    const EXISTING_TEXTS = await readExistingTexts(CSV_PATH);
    const GLOBAL_TEXT_REGISTRY = new Set<string>(EXISTING_TEXTS);
    const newEntries: string[] = [];
    
    // Process CommonEvents.json
    const commonEntries = await processCommonEvents(
        "CommonEvents.json",
        EXISTING_TEXTS,
        GLOBAL_TEXT_REGISTRY
    );
    newEntries.push(...commonEntries);

    // Process Troops.json
    const troopEntries = await processTroops(
        "Troops.json",
        EXISTING_TEXTS,
        GLOBAL_TEXT_REGISTRY
    );
    newEntries.push(...troopEntries);

    // Process all Map*.json files
    for await (const dirEntry of Deno.readDir(".")) {
      if (dirEntry.name.startsWith("Map") && dirEntry.name.endsWith(".json")) {
        const entries = await processMap(
          dirEntry.name,
          EXISTING_TEXTS,
          GLOBAL_TEXT_REGISTRY
        );
        newEntries.push(...entries);
      }
    }

    if (newEntries.length === 0) {
      console.log("No new texts found");
      return;
    }

    let csvHeader = "";
    if (!await Deno.stat(CSV_PATH).catch(() => null)) {
      csvHeader = ",日本語,English,中文,한국語,,タグ説明\n";
    }

    await Deno.writeTextFile(
      CSV_PATH,
      csvHeader + newEntries.join("\n") + "\n",
      { append: true }
    );

    console.log(`Added ${newEntries.filter(l => l.startsWith('"')).length} new unique texts`);
  }
}

main().catch(console.error);
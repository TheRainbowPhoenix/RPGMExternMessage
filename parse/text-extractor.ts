// text-extractor.ts
import {
  MapData,
  MapEvent,
  EventPage,
  parseMapData,
  CommonEvent,
  parseCommonEventsData,
  EventCommand,
  parseTroopsData,
  DataTroop,
  parseActorsData,
  parseItemsData,
  parseSkillsData,
  parseEnemiesData,
  DataActor,
  DataItem,
  DataSkill,
  DataEnemy,
} from "./structs.ts";



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

function extractPageTexts(page: EventPage): string[] {
  return extractListTexts(page.list);
}

function registerText(
  text: unknown,
  existing: Set<string>,
  globalTextRegistry: Set<string>,
  bucket: string[],
) {
  if (typeof text !== "string") return;
  const t = text.trim();
  if (!t) return;
  if (existing.has(t) || globalTextRegistry.has(t)) return;

  bucket.push(`"${t}",,,,,`);
  globalTextRegistry.add(t);
}


/**
 * Extracts all text messages (command code 101 followed by 401s)
 * and choice texts (command code 102, parameters[0] = array of choices)
 * from a list of EventCommands.
 */
function extractListTexts(list: EventCommand[]): string[] {
  const texts: string[] = [];
  let i = 0;

  while (i < list.length) {
    const cmd = list[i];

    if (cmd.code === 101) {
      // Show Text: collect all following 401 lines
      i++;
      while (i < list.length && list[i].code === 401) {
        const text = String(list[i].parameters[0]).trim();
        if (text) texts.push(text);
        i++;
      }
    } else if (cmd.code === 102) {
      // Show Choices: first parameter is an array of choice strings
      const choices = cmd.parameters?.[0];
      if (Array.isArray(choices)) {
        for (const choice of choices) {
          const text = String(choice).trim();
          if (text) texts.push(text);
        }
      }
      i++;
    } else {
      i++;
    }
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
      for (let pageIdx = 0; pageIdx < troop.pages.length; pageIdx++) {
        const page = troop.pages[pageIdx];
        const texts = extractListTexts(page.list);
        const pageEntries: string[] = [];

        for (const t of texts) {
          registerText(t, existing, globalTextRegistry, pageEntries);
        }

        if (pageEntries.length > 0) {
          // Tag format: TR<TroopId>:<TroopName>:P<PageIndex>
          newEntries.push("", `TR${troop.id}:${troop.name}:P${pageIdx},,,,,`);
          newEntries.push(...pageEntries);
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


async function processActors(
  actorsPath: string,
  existing: Set<string>,
  globalTextRegistry: Set<string>
) {
  const newEntries: string[] = [];

  try {
    const json = await Deno.readTextFile(actorsPath);
    const actors = parseActorsData(json);

    for (const actor of actors.filter((a): a is DataActor => !!a)) {
      const actorEntries: string[] = [];

      // Fields to extract from actors
      const candidates = [
        actor.name,
        actor.nickname,
        actor.profile,
        actor.note,
      ];

      for (const t of candidates) {
        registerText(t, existing, globalTextRegistry, actorEntries);
      }

      if (actorEntries.length > 0) {
        // Tag format: ACTOR<Id>:<Name>
        newEntries.push("", `ACTOR${actor.id}:${actor.name},,,,,`);
        newEntries.push(...actorEntries);
      }
    }
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
      console.error(`Error processing ${actorsPath}:`, err);
    }
  }

  return newEntries;
}


async function processItems(
  itemsPath: string,
  existing: Set<string>,
  globalTextRegistry: Set<string>
) {
  const newEntries: string[] = [];

  try {
    const json = await Deno.readTextFile(itemsPath);
    const items = parseItemsData(json);

    for (const item of items.filter((i): i is DataItem => !!i)) {
      const itemEntries: string[] = [];

      const candidates = [
        item.name,
        item.description,
        item.note,
      ];

      for (const t of candidates) {
        registerText(t, existing, globalTextRegistry, itemEntries);
      }

      if (itemEntries.length > 0) {
        // Tag format: ITEM<Id>:<Name>
        newEntries.push("", `ITEM${item.id}:${item.name},,,,,`);
        newEntries.push(...itemEntries);
      }
    }
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
      console.error(`Error processing ${itemsPath}:`, err);
    }
  }

  return newEntries;
}


async function processSkills(
  skillsPath: string,
  existing: Set<string>,
  globalTextRegistry: Set<string>
) {
  const newEntries: string[] = [];

  try {
    const json = await Deno.readTextFile(skillsPath);
    const skills = parseSkillsData(json);

    for (const skill of skills.filter((s): s is DataSkill => !!s)) {
      const skillEntries: string[] = [];

      const candidates = [
        skill.name,
        skill.message1,
        skill.message2,
        skill.note,
      ];

      for (const t of candidates) {
        registerText(t, existing, globalTextRegistry, skillEntries);
      }

      if (skillEntries.length > 0) {
        // Tag format: SKILL<Id>:<Name>
        newEntries.push("", `SKILL${skill.id}:${skill.name},,,,,`);
        newEntries.push(...skillEntries);
      }
    }
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
      console.error(`Error processing ${skillsPath}:`, err);
    }
  }

  return newEntries;
}


async function processEnemies(
  enemiesPath: string,
  existing: Set<string>,
  globalTextRegistry: Set<string>
) {
  const newEntries: string[] = [];

  try {
    const json = await Deno.readTextFile(enemiesPath);
    const enemies = parseEnemiesData(json);

    for (const enemy of enemies.filter((e): e is DataEnemy => !!e)) {
      const enemyEntries: string[] = [];

      const candidates = [
        enemy.name,
        enemy.note,
      ];

      for (const t of candidates) {
        registerText(t, existing, globalTextRegistry, enemyEntries);
      }

      if (enemyEntries.length > 0) {
        // Tag format: ENEMY<Id>:<Name>
        newEntries.push("", `ENEMY${enemy.id}:${enemy.name},,,,,`);
        newEntries.push(...enemyEntries);
      }
    }
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
      console.error(`Error processing ${enemiesPath}:`, err);
    }
  }

  return newEntries;
}

async function processSystem(
  systemPath: string,
  existing: Set<string>,
  globalTextRegistry: Set<string>
) {
  const newEntries: string[] = [];

  try {
    const json = await Deno.readTextFile(systemPath);
    const sys = JSON.parse(json);

    // Helper to push a group of texts under one tag
    function pushGroup(tag: string, texts: unknown[]) {
      const group: string[] = [];
      for (const t of texts) {
        registerText(t, existing, globalTextRegistry, group);
      }
      if (group.length > 0) {
        newEntries.push("", `${tag},,,,,`);
        newEntries.push(...group);
      }
    }

    // --- Simple single-string fields ---
    if (typeof sys.gameTitle === "string") {
      pushGroup("SYS:gameTitle", [sys.gameTitle]);
    }
    if (typeof sys.currencyUnit === "string") {
      pushGroup("SYS:currencyUnit", [sys.currencyUnit]);
    }

    // --- Simple string-array fields (skip first empty element where applicable) ---
    if (Array.isArray(sys.armorTypes)) {
      pushGroup("SYS:armorTypes", sys.armorTypes.slice(1)); // index 0 is ""
    }
    if (Array.isArray(sys.equipTypes)) {
      pushGroup("SYS:equipTypes", sys.equipTypes.slice(1));
    }
    if (Array.isArray(sys.weaponTypes)) {
      pushGroup("SYS:weaponTypes", sys.weaponTypes.slice(1));
    }
    if (Array.isArray(sys.elements)) {
      pushGroup("SYS:elements", sys.elements.slice(1));
    }
    if (Array.isArray(sys.skillTypes)) {
      pushGroup("SYS:skillTypes", sys.skillTypes.slice(1));
    }

    if (Array.isArray(sys.switches)) {
      pushGroup("SYS:switches", sys.switches.slice(1));
    }
    if (Array.isArray(sys.variables)) {
      pushGroup("SYS:variables", sys.variables.slice(1));
    }

    // --- terms.basic / commands / params ---
    const terms = sys.terms ?? {};

    if (Array.isArray(terms.basic)) {
      pushGroup("SYS:terms.basic", terms.basic);
    }
    if (Array.isArray(terms.commands)) {
      // filter out nulls
      pushGroup(
        "SYS:terms.commands",
        terms.commands.filter((c: unknown) => typeof c === "string"),
      );
    }
    if (Array.isArray(terms.params)) {
      pushGroup("SYS:terms.params", terms.params);
    }

    // --- terms.messages.{key} ---
    if (terms.messages && typeof terms.messages === "object") {
      const messages = terms.messages as Record<string, unknown>;
      for (const [key, value] of Object.entries(messages)) {
        if (typeof value !== "string") continue;
        pushGroup(`SYS:terms.messages.${key}`, [value]);
      }
    }
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
      console.error(`Error processing ${systemPath}:`, err);
    }
  }

  return newEntries;
}



async function main() {
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

  // Process Troops (battle events)
  const troopEntries = await processTroops(
    "Troops.json",
    EXISTING_TEXTS,
    GLOBAL_TEXT_REGISTRY
  );
  newEntries.push(...troopEntries);

  // Process Database-type files
  const actorEntries = await processActors(
    "Actors.json",
    EXISTING_TEXTS,
    GLOBAL_TEXT_REGISTRY
  );
  newEntries.push(...actorEntries);

  const itemEntries = await processItems(
    "Items.json",
    EXISTING_TEXTS,
    GLOBAL_TEXT_REGISTRY
  );
  newEntries.push(...itemEntries);

  const skillEntries = await processSkills(
    "Skills.json",
    EXISTING_TEXTS,
    GLOBAL_TEXT_REGISTRY
  );
  newEntries.push(...skillEntries);

  const enemyEntries = await processEnemies(
    "Enemies.json",
    EXISTING_TEXTS,
    GLOBAL_TEXT_REGISTRY
  );
  newEntries.push(...enemyEntries);

  // Process System.json (global settings / terms)
  const systemEntries = await processSystem(
    "System.json",
    EXISTING_TEXTS,
    GLOBAL_TEXT_REGISTRY
  );
  newEntries.push(...systemEntries);

  // Process Map*.json events
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
    csvHeader = "日本語,English,中文,한국語,,タグ説明\n";
  }

  await Deno.writeTextFile(
    CSV_PATH,
    csvHeader + newEntries.join("\n") + "\n",
    { append: true }
  );

  console.log(
    `Added ${
      newEntries.filter(l => l.startsWith('"')).length
    } new unique texts`
  );
}

main().catch(console.error);
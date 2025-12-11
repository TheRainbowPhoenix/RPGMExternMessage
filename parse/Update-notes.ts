// update-notes.ts
import { parseTroopsData, parseCommonEventsData, parseMapData } from "./structs.ts";

interface NoteEntry {
  [key: string]: string;
}

async function loadNotesMap(notesFilePath: string): Promise<NoteEntry> {
  try {
    const content = await Deno.readTextFile(notesFilePath);
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error loading notes map from ${notesFilePath}:`, err);
    return {};
  }
}

async function updateDataFileWithNotes(filePath: string, notesMap: NoteEntry, dataType: string) {
  try {
    const content = await Deno.readTextFile(filePath);
    const data = JSON.parse(content);
    
    if (Array.isArray(data)) {
      let updated = false;
      
      for (const item of data) {
        if (item && typeof item === 'object' && item.id !== undefined) {
          const key = `${dataType}_${item.id}`;
          if (notesMap[key]) {
            item.note = notesMap[key];
            updated = true;
            console.log(`Updated note for ${key}`);
          }
        }
      }
      
      if (updated) {
        await Deno.writeTextFile(filePath, JSON.stringify(data, null, 2));
        console.log(`Updated ${filePath}`);
      } else {
        console.log(`No updates needed for ${filePath}`);
      }
    }
  } catch (err) {
    console.error(`Error updating ${filePath}:`, err);
  }
}

async function updateAllDataFiles(notesFilePath: string = "notes_map.json") {
  const notesMap = await loadNotesMap(notesFilePath);
  
  if (Object.keys(notesMap).length === 0) {
    console.log("No notes to update");
    return;
  }
  
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
  ];
  
  for (const file of dataFiles) {
    await updateDataFileWithNotes(file.path, notesMap, file.type);
  }
}

// Function to update notes in event data (maps, common events, troops)
async function updateEventDataNotes(notesFilePath: string = "notes_map.json") {
  const notesMap = await loadNotesMap(notesFilePath);
  
  // Update CommonEvents.json
  try {
    const commonEventsContent = await Deno.readTextFile("CommonEvents.json");
    const commonEvents = JSON.parse(commonEventsContent);
    
    let updated = false;
    for (const event of commonEvents) {
      if (event && typeof event === 'object' && event.id !== undefined) {
        const key = `CommonEvent_${event.id}`;
        if (notesMap[key]) {
          event.note = notesMap[key];
          updated = true;
          console.log(`Updated note for CommonEvent_${event.id}`);
        }
      }
    }
    
    if (updated) {
      await Deno.writeTextFile("CommonEvents.json", JSON.stringify(commonEvents, null, 2));
      console.log("Updated CommonEvents.json");
    }
  } catch (err) {
    console.error("Error updating CommonEvents.json:", err);
  }
  
  // Update Troops.json
  try {
    const troopsContent = await Deno.readTextFile("Troops.json");
    const troops = JSON.parse(troopsContent);
    
    let updated = false;
    for (const troop of troops) {
      if (troop && typeof troop === 'object' && troop.id !== undefined) {
        const key = `Troop_${troop.id}`;
        if (notesMap[key]) {
          troop.note = notesMap[key];
          updated = true;
          console.log(`Updated note for Troop_${troop.id}`);
        }
      }
    }
    
    if (updated) {
      await Deno.writeTextFile("Troops.json", JSON.stringify(troops, null, 2));
      console.log("Updated Troops.json");
    }
  } catch (err) {
    console.error("Error updating Troops.json:", err);
  }
  
  // Update Maps
  for await (const dirEntry of Deno.readDir(".")) {
    if (dirEntry.name.startsWith("Map") && dirEntry.name.endsWith(".json")) {
      try {
        const mapContent = await Deno.readTextFile(dirEntry.name);
        const map = JSON.parse(mapContent);
        
        let updated = false;
        
        // Update map note
        const mapKey = `Map_${dirEntry.name.replace('Map', '').replace('.json', '')}`;
        if (notesMap[mapKey]) {
          map.note = notesMap[mapKey];
          updated = true;
          console.log(`Updated note for Map ${mapKey}`);
        }
        
        // Update event notes
        if (Array.isArray(map.events)) {
          for (const event of map.events) {
            if (event && typeof event === 'object' && event.id !== undefined) {
              const eventKey = `Event_${event.id}`;
              if (notesMap[eventKey]) {
                event.note = notesMap[eventKey];
                updated = true;
                console.log(`Updated note for Event_${event.id} in ${dirEntry.name}`);
              }
            }
          }
        }
        
        if (updated) {
          await Deno.writeTextFile(dirEntry.name, JSON.stringify(map, null, 2));
          console.log(`Updated ${dirEntry.name}`);
        }
      } catch (err) {
        console.error(`Error updating ${dirEntry.name}:`, err);
      }
    }
  }
}

async function main() {
  const args = Deno.args;
  
  if (args.includes("--update-data")) {
    // Update notes in data files (Actors, Classes, etc.)
    await updateAllDataFiles();
  } else if (args.includes("--update-events")) {
    // Update notes in event data (Maps, CommonEvents, Troops)
    await updateEventDataNotes();
  } else if (args.includes("--update-all")) {
    // Update all files
    await updateAllDataFiles();
    await updateEventDataNotes();
  } else {
    console.log("Usage:");
    console.log("  --update-data    Update notes in data files (Actors, Classes, etc.)");
    console.log("  --update-events  Update notes in event files (Maps, CommonEvents, Troops)");
    console.log("  --update-all     Update all files");
  }
}

main().catch(console.error);
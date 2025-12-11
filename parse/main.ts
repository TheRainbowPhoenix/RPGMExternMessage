// main.ts
import { MapEvent, parseMapData } from "./structs.ts";

function displayEventPages(event: MapEvent, mapId: number) {
    console.log(`\n=== Event ${event.id} @ (${event.x},${event.y}) ===`);
    console.log(`Name: "${event.name}"${event.note ? ` [Note: ${event.note}]` : ''}`);
    console.log(`Pages: ${event.pages.length}`);
  
    event.pages.forEach((page, index) => {
      const conditions = [
        page.conditions.switch1Valid && `SWITCH ${page.conditions.switch1Id} ON`,
        page.conditions.switch2Valid && `SWITCH ${page.conditions.switch2Id} ON`,
        page.conditions.variableValid && `VARIABLE ${page.conditions.variableId} >= ${page.conditions.variableValue}`,
        page.conditions.selfSwitchValid && `SELF SWITCH ${mapId},${event.id},${page.conditions.selfSwitchCh}`,
        page.conditions.itemValid && `ITEM #${page.conditions.itemId} REQUIRED`,
        page.conditions.actorValid && `ACTOR #${page.conditions.actorId} IN PARTY`
      ].filter(Boolean);
  
      const movementTypes = ["Fixed", "Random", "Approach", "Custom"];
      const moveSpeeds = [
        "x8 Slower", "x4 Slower", "x2 Slower", 
        "Normal", "x2 Faster", "x4 Faster"
      ];
      const moveFrequencies = ["Lowest", "Lower", "Normal", "Higher", "Highest"];
      const triggers = ["Action Button", "Player Touch", "Event Touch", "Autorun", "Parallel"];
      const priorities = ["Below", "Same", "Above"];
  
      console.log(`\nPage ${index + 1}:`);
      console.log("----------------------------");
      console.log(`Conditions: ${conditions.join(', ') || 'None'}`);
      console.log(`Movement Type: ${movementTypes[page.autonomousMovement.moveType]}`);
      console.log(`Move Speed: ${moveSpeeds[page.autonomousMovement.moveSpeed - 1]}`);
      console.log(`Move Frequency: ${moveFrequencies[page.autonomousMovement.moveFrequency - 1]}`);
      console.log(`Move Commands: ${page.autonomousMovement.moveRoute.list.length}`);
      console.log(`Trigger: ${triggers[page.trigger]}`);
      console.log(`Priority: ${priorities[page.priorityType]}`);
      console.log(`Options:`);
      console.log(`- Walking Animation: ${page.options.walkAnime ? 'Yes' : 'No'}`);
      console.log(`- Stepping Animation: ${page.options.stepAnime ? 'Yes' : 'No'}`);
      console.log(`- Direction Fix: ${page.options.directionFix ? 'Yes' : 'No'}`);
      console.log(`- Pass-Through: ${page.options.through ? 'Yes' : 'No'}`);
      console.log(`Commands: ${page.list.length} instructions`);
      console.log("----------------------------");
    });
  }

async function countMapEvents(mapPath: string) {
  try {
    // Read and parse the map file
    const jsonText = await Deno.readTextFile(mapPath);
    const mapData = parseMapData(jsonText);

    // Count non-null events (filter out the initial null)
    const eventCount = mapData.events.filter(e => e !== null).length;

    console.log(`Map contains ${eventCount} events`);
    console.log("Event IDs:", mapData.events.filter(e => e !== null).map(e => e!.id));

    mapData.events.filter(Boolean).forEach(event => {
        displayEventPages(event, mapData.id); 
    });


  } catch (error) {
    console.error("Error processing map file:", error);
  }
}

// Execute with required read permission
// Run with: deno run --allow-read main.ts
await countMapEvents("./data/Map022.json");
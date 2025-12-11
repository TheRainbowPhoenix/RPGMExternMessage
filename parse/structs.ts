/**
 * Represents Background Music (BGM) configuration
 */
export interface BGM {
  name: string;
  pan: number;
  pitch: number;
  volume: number;
}

/**
 * Represents Background Sound (BGS) configuration
 */
export interface BGS {
  name: string;
  pan: number;
  pitch: number;
  volume: number;
}

/**
 * Represents a game event
 */
export interface MapEvent {
  id: number;
  name: string;
  note: string;
  pages: EventPage[];
  x: number;
  y: number;
}

/**
 * Represents a game map configuration
 */
export interface MapData {
  autoplayBgm: boolean;
  autoplayBgs: boolean;
  battleback1Name: string;
  battleback2Name: string;
  bgm: BGM;
  bgs: BGS;
  disableDashing: boolean;
  displayName: string;
  encounterList: number[];
  encounterStep: number;
  height: number;
  note: string;
  parallaxLoopX: boolean;
  parallaxLoopY: boolean;
  parallaxName: string;
  parallaxShow: boolean;
  parallaxSx: number;
  parallaxSy: number;
  scrollType: number;
  specifyBattleback: boolean;
  tilesetId: number;
  width: number;
  data: number[];
  events: Array<Event | null>;
}

// structs.ts

/**
 * Event activation conditions
 */
export interface EventConditions {
  actorId: number;
  actorValid: boolean;
  itemId: number;
  itemValid: boolean;
  selfSwitchCh: string;
  selfSwitchValid: boolean;
  switch1Id: number;
  switch1Valid: boolean;
  switch2Id: number;
  switch2Valid: boolean;
  variableId: number;
  variableValid: boolean;
  variableValue: number;
}

/**
 * Event character image configuration
 */
export interface EventImage {
  characterName: string;
  characterIndex: number;
  direction: number;
  pattern: number;
  tileId: number;
}

/**
 * Move route command
 */
export interface MoveCommand {
  code: number;
  parameters: unknown[];
}

/**
 * Event movement route
 */
export interface MoveRoute {
  list: MoveCommand[];
  repeat: boolean;
  skippable: boolean;
  wait: boolean;
}

/**
 * Event command (list item)
 */
export interface EventCommand {
  code: number;
  indent: number;
  parameters: unknown[];
}

/**
 * Complete event page definition
 */
export interface EventPage {
  conditions: EventConditions;
  autonomousMovement: AutonomousMovement;
  image: EventImage;
  list: EventCommand[];
  options: EventOptions;
  priorityType: number;
  trigger: number;
}
// export interface EventPage {
//   conditions: EventConditions;
//   directionFix: boolean;
//   image: EventImage;
//   list: EventCommand[];
//   moveFrequency: number;
//   moveRoute: MoveRoute;
//   moveSpeed: number;
//   moveType: number;
//   priorityType: number;
//   stepAnime: boolean;
//   through: boolean;
//   trigger: number;
//   walkAnime: boolean;
// }

/**
 * Autonomous movement configuration for events
 */
export interface AutonomousMovement {
  moveType: number;
  moveRoute: MoveRoute;
  moveSpeed: number;
  moveFrequency: number;
}
/**
 * Visual/behavioral options for events
 */
export interface EventOptions {
  walkAnime: boolean;
  stepAnime: boolean;
  directionFix: boolean;
  through: boolean;
}

export interface Member {
  enemyId: number;
  x: number;
  y: number;
  hidden: boolean;
}

export interface BattleConditions {
  actorHp: number;
  actorId: number;
  actorValid: boolean;
  enemyHp: number;
  enemyIndex: number;
  enemyValid: boolean;
  switchId: number;
  switchValid: boolean;
  turnA: number;
  turnB: number;
  turnEnding: boolean;
  turnValid: boolean;
}

export interface TroopPage {
  conditions: BattleConditions;
  list: EventCommand[];
  span: number;
}

export interface DataTroop {
  id: number;
  members: Member[];
  name: string;
  pages: TroopPage[];
}

export interface DataActor {
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
  traits: any[]; // TODO: Replace with proper trait interface
  initialLevel: number;
  maxLevel: number;
  nickname: string;
  profile: string;
}

export interface DataItem {
  id: number;
  name: string;
  note: string;
  description: string;
  iconIndex: number;
  itypeId: number;
  price: number;
}

export interface DataSkill {
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

export interface DataEnemy {
  id: number;
  name: string;
  note: string;
  actions: any[]; // TODO: Replace with proper action interface
  battlerHue: number;
  battlerName: string;
  dropItems: any[]; // TODO: Replace with proper drop item interface
  exp: number;
  traits: any[]; // TODO: Replace with proper trait interface
  gold: number;
  params: number[];
}

export type TroopsData = Array<DataTroop | null>;
export type ActorsData = Array<DataActor | null>;
export type ItemsData = Array<DataItem | null>;
export type SkillsData = Array<DataSkill | null>;
export type EnemiesData = Array<DataEnemy | null>;

/**
 * Represents a Common Event
 */
export interface CommonEvent {
  id: number;
  /**
   * The list of event commands
   */
  list: EventCommand[];
  name: string;
  /**
   * The ID of the switch that activates the Common Event (if Trigger is 1 or 2)
   */
  switchId: number;
  /**
   * 0: None, 1: Autorun, 2: Parallel
   */
  trigger: number;
}

/**
 * Parses raw JSON data into a structured Event object
 * @param rawEvent Raw event data from JSON
 * @returns Structured Event object
 */
export function parseEvent(rawEvent: any): MapEvent {
  if (!rawEvent || typeof rawEvent !== "object") {
    throw new Error("Invalid event data");
  }

  return {
    id: Number(rawEvent.id),
    name: String(rawEvent.name || ""),
    note: String(rawEvent.note || ""),
    pages: Array.isArray(rawEvent.pages)
      ? rawEvent.pages.map((e: any) => (e ? parseEventPage(e) : null))
      : [],
    x: Number(rawEvent.x || 0),
    y: Number(rawEvent.y || 0),
  };
}

/**
 * Parses raw JSON data into a structured MapData object
 * @param jsonString JSON string containing map data
 * @returns Structured MapData object
 */
export function parseMapData(jsonString: string): MapData {
  const rawData = JSON.parse(jsonString);

  return {
    autoplayBgm: Boolean(rawData.autoplayBgm),
    autoplayBgs: Boolean(rawData.autoplayBgs),
    battleback1Name: String(rawData.battleback1Name || ""),
    battleback2Name: String(rawData.battleback2Name || ""),
    bgm: {
      name: String(rawData.bgm?.name || ""),
      pan: Number(rawData.bgm?.pan || 0),
      pitch: Number(rawData.bgm?.pitch || 100),
      volume: Number(rawData.bgm?.volume || 90),
    },
    bgs: {
      name: String(rawData.bgs?.name || ""),
      pan: Number(rawData.bgs?.pan || 0),
      pitch: Number(rawData.bgs?.pitch || 100),
      volume: Number(rawData.bgs?.volume || 90),
    },
    disableDashing: Boolean(rawData.disableDashing),
    displayName: String(rawData.displayName || ""),
    encounterList: Array.isArray(rawData.encounterList)
      ? rawData.encounterList.map(Number)
      : [],
    encounterStep: Number(rawData.encounterStep || 30),
    height: Number(rawData.height || 0),
    note: String(rawData.note || ""),
    parallaxLoopX: Boolean(rawData.parallaxLoopX),
    parallaxLoopY: Boolean(rawData.parallaxLoopY),
    parallaxName: String(rawData.parallaxName || ""),
    parallaxShow: Boolean(rawData.parallaxShow),
    parallaxSx: Number(rawData.parallaxSx || 0),
    parallaxSy: Number(rawData.parallaxSy || 0),
    scrollType: Number(rawData.scrollType || 0),
    specifyBattleback: Boolean(rawData.specifyBattleback),
    tilesetId: Number(rawData.tilesetId || 0),
    width: Number(rawData.width || 0),
    data: Array.isArray(rawData.data) ? rawData.data.map(Number) : [],
    events: Array.isArray(rawData.events)
      ? rawData.events.map((e: any) => (e ? parseEvent(e) : null))
      : [],
  };
}

// Parsing functions
export function parseConditions(raw: any): EventConditions {
  return {
    actorId: Number(raw.actorId),
    actorValid: Boolean(raw.actorValid),
    itemId: Number(raw.itemId),
    itemValid: Boolean(raw.itemValid),
    selfSwitchCh: String(raw.selfSwitchCh),
    selfSwitchValid: Boolean(raw.selfSwitchValid),
    switch1Id: Number(raw.switch1Id),
    switch1Valid: Boolean(raw.switch1Valid),
    switch2Id: Number(raw.switch2Id),
    switch2Valid: Boolean(raw.switch2Valid),
    variableId: Number(raw.variableId),
    variableValid: Boolean(raw.variableValid),
    variableValue: Number(raw.variableValue),
  };
}

export function parseImage(raw: any): EventImage {
  return {
    characterName: String(raw.characterName),
    characterIndex: Number(raw.characterIndex),
    direction: Number(raw.direction),
    pattern: Number(raw.pattern),
    tileId: Number(raw.tileId),
  };
}

export function parseMoveRoute(raw: any): MoveRoute {
  return {
    list: Array.isArray(raw.list)
      ? raw.list.map((c: any) => ({
          code: Number(c.code),
          parameters: Array.isArray(c.parameters) ? c.parameters : [],
        }))
      : [],
    repeat: Boolean(raw.repeat),
    skippable: Boolean(raw.skippable),
    wait: Boolean(raw.wait),
  };
}

export function parseEventCommand(raw: any): EventCommand {
  return {
    code: Number(raw.code),
    indent: Number(raw.indent),
    parameters: Array.isArray(raw.parameters) ? raw.parameters : [],
  };
}

export function parseEventPage(raw: any): EventPage {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid event data");
  }

  return {
    conditions: parseConditions(raw.conditions),
    autonomousMovement: {
      moveType: Number(raw.moveType),
      moveRoute: parseMoveRoute(raw.moveRoute),
      moveSpeed: Number(raw.moveSpeed),
      moveFrequency: Number(raw.moveFrequency),
    },
    image: parseImage(raw.image),
    list: Array.isArray(raw.list) ? raw.list.map(parseEventCommand) : [],
    options: {
      walkAnime: Boolean(raw.walkAnime),
      stepAnime: Boolean(raw.stepAnime),
      directionFix: Boolean(raw.directionFix),
      through: Boolean(raw.through),
    },
    priorityType: Number(raw.priorityType),
    trigger: Number(raw.trigger),
  };
}

/**
 * Parses raw JSON data into a structured CommonEvent object
 * @param rawCommonEvent Raw common event data from JSON
 * @returns Structured CommonEvent object
 */
export function parseCommonEvent(rawCommonEvent: any): CommonEvent {
  if (!rawCommonEvent || typeof rawCommonEvent !== "object") {
    throw new Error("Invalid common event data");
  }

  // RPG Maker Common Events list items sometimes include a 'collapsed' property
  // which we can ignore for basic parsing, but it's good to note.

  return {
    id: Number(rawCommonEvent.id),
    name: String(rawCommonEvent.name || ""),
    switchId: Number(rawCommonEvent.switchId || 0),
    trigger: Number(rawCommonEvent.trigger || 0),
    list: Array.isArray(rawCommonEvent.list)
      ? rawCommonEvent.list.map(parseEventCommand)
      : [],
  };
}
export type CommonEventsData = Array<CommonEvent | null>;

/**
 * Parses raw JSON data into a structured CommonEventsData array
 * @param jsonString JSON string containing CommonEvents data
 * @returns Structured CommonEventsData array
 */
export function parseCommonEventsData(jsonString: string): CommonEventsData {
  const rawData = JSON.parse(jsonString);

  if (!Array.isArray(rawData)) {
    throw new Error("Invalid common events data: Expected an array");
  }

  // CommonEvents.json is an array where the first element is null,
  // and subsequent elements are the common events (1-indexed).
  return rawData.map((rawEvent, index) => {
    if (index === 0 || !rawEvent) {
      return null; // Keep null at index 0 and for any empty entries
    }
    try {
      return parseCommonEvent(rawEvent);
    } catch (e) {
      console.error(`Error parsing Common Event at index ${index}:`, e);
      return null; // Or throw, depending on desired error handling
    }
  });
}

export function parseBattleConditions(raw: any): BattleConditions {
  return {
    actorHp: Number(raw.actorHp || 50),
    actorId: Number(raw.actorId || 1),
    actorValid: Boolean(raw.actorValid),
    enemyHp: Number(raw.enemyHp || 50),
    enemyIndex: Number(raw.enemyIndex || 0),
    enemyValid: Boolean(raw.enemyValid),
    switchId: Number(raw.switchId || 1),
    switchValid: Boolean(raw.switchValid),
    turnA: Number(raw.turnA || 0),
    turnB: Number(raw.turnB || 0),
    turnEnding: Boolean(raw.turnEnding),
    turnValid: Boolean(raw.turnValid),
  };
}

export function parseMember(raw: any): Member {
  return {
    enemyId: Number(raw.enemyId),
    x: Number(raw.x),
    y: Number(raw.y),
    hidden: Boolean(raw.hidden),
  };
}

export function parseTroopPage(raw: any): TroopPage {
  return {
    conditions: parseBattleConditions(raw.conditions),
    list: Array.isArray(raw.list) ? raw.list.map(parseEventCommand) : [],
    span: Number(raw.span || 0),
  };
}

export function parseDataTroop(rawTroop: any): DataTroop {
  if (!rawTroop || typeof rawTroop !== "object") {
    throw new Error("Invalid troop data");
  }

  return {
    id: Number(rawTroop.id),
    name: String(rawTroop.name || ""),
    members: Array.isArray(rawTroop.members)
      ? rawTroop.members.map(parseMember)
      : [],
    pages: Array.isArray(rawTroop.pages)
      ? rawTroop.pages.map(parseTroopPage)
      : [],
  };
}

export function parseTroopsData(jsonString: string): TroopsData {
  const rawData = JSON.parse(jsonString);

  if (!Array.isArray(rawData)) {
    throw new Error("Invalid troops data: Expected an array");
  }

  // Troops.json is an array where the first element is null,
  // and subsequent elements are the troops (1-indexed).
  return rawData.map((rawTroop, index) => {
    if (index === 0 || !rawTroop) {
      return null; // Keep null at index 0 and for any empty entries
    }
    try {
      return parseDataTroop(rawTroop);
    } catch (e) {
      console.error(`Error parsing Troop at index ${index}:`, e);
      return null; // Or throw, depending on desired error handling
    }
  });
}

// Parsing functions for these new types
export function parseDataActor(raw: any): DataActor {
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

export function parseDataItem(raw: any): DataItem {
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

export function parseDataSkill(raw: any): DataSkill {
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

export function parseDataEnemy(raw: any): DataEnemy {
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

export function parseActorsData(jsonString: string): ActorsData {
  const rawData = JSON.parse(jsonString);
  if (!Array.isArray(rawData)) {
    throw new Error("Invalid actors data: Expected an array");
  }
  return rawData.map((raw, index) => {
    if (index === 0 || !raw) return null;
    try {
      return parseDataActor(raw);
    } catch (e) {
      console.error(`Error parsing Actor at index ${index}:`, e);
      return null;
    }
  });
}

export function parseItemsData(jsonString: string): ItemsData {
  const rawData = JSON.parse(jsonString);
  if (!Array.isArray(rawData)) {
    throw new Error("Invalid items data: Expected an array");
  }
  return rawData.map((raw, index) => {
    if (index === 0 || !raw) return null;
    try {
      return parseDataItem(raw);
    } catch (e) {
      console.error(`Error parsing Item at index ${index}:`, e);
      return null;
    }
  });
}

export function parseSkillsData(jsonString: string): SkillsData {
  const rawData = JSON.parse(jsonString);
  if (!Array.isArray(rawData)) {
    throw new Error("Invalid skills data: Expected an array");
  }
  return rawData.map((raw, index) => {
    if (index === 0 || !raw) return null;
    try {
      return parseDataSkill(raw);
    } catch (e) {
      console.error(`Error parsing Skill at index ${index}:`, e);
      return null;
    }
  });
}

export function parseEnemiesData(jsonString: string): EnemiesData {
  const rawData = JSON.parse(jsonString);
  if (!Array.isArray(rawData)) {
    throw new Error("Invalid enemies data: Expected an array");
  }
  return rawData.map((raw, index) => {
    if (index === 0 || !raw) return null;
    try {
      return parseDataEnemy(raw);
    } catch (e) {
      console.error(`Error parsing Enemy at index ${index}:`, e);
      return null;
    }
  });
}

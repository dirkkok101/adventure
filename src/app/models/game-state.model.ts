export interface GameState {
    currentScene: string;
    inventory: { [key: string]: boolean };
    flags: { [key: string]: boolean };
    score: number;
    moves: number;
    knownObjects: Set<string>;
    containers: { [key: string]: string[] }; // Maps container IDs to their contents
    gameOver: boolean;
    gameWon: boolean;
    maxScore: number; // Track maximum possible score
    turns: number; // Track number of turns for time-based events
    light: boolean; // Global light state
    trophies: string[]; // List of earned trophies/achievements
}

export interface Scene {
    id: string;
    name: string;
    region: string;
    light?: boolean; // Whether the scene has natural light
    visited?: boolean; // Whether the scene has been visited before
    descriptions: {
        default: string;
        dark?: string;
        visited?: string; // Description for when you've been here before
        states?: { [key: string]: string };
    };
    objects?: { [key: string]: SceneObject };
    exits?: SceneExit[];
    onEnter?: SceneInteraction;
    onExit?: SceneInteraction;
}

export interface SceneObject {
    id: string;
    name: string;
    descriptions: {
        default: string;
        empty?: string;
        contents?: string; // For containers, how to list contents
        examine?: string; // Detailed examination description
        states?: { [key: string]: string };
    };
    visibleOnEntry?: boolean;
    canTake?: boolean;
    usable?: boolean;
    weight?: number;
    isContainer?: boolean;
    isOpen?: boolean; // Whether container is open
    isLocked?: boolean; // Whether container is locked
    capacity?: number;
    contents?: string[];
    isTreasure?: boolean; // Whether this is a treasure for trophy case
    providesLight?: boolean; // Whether object provides light when on
    interactions?: { [key: string]: SceneInteraction };
    scoring?: {
        drop?: number; // Score for dropping in the right place
        take?: number; // Score for taking the object
        use?: number; // Score for using the object correctly
        containerTargets?: { // Specific containers that give points when object is placed in them
            [containerId: string]: number;
        };
    };
}

export interface SceneExit {
    direction: string;
    targetScene: string;
    description: string;
    requiredFlags?: string[];
    failureMessage?: string;
    score?: number; // Score for discovering new areas
    oneWay?: boolean; // Whether you can return this way
}

export interface SceneInteraction {
    message: string;
    states?: { [key: string]: string };
    requiredFlags?: string[];
    grantsFlags?: string[];
    removesFlags?: string[];
    failureMessage?: string;
    revealsObjects?: string[];
    score?: number;
    addToInventory?: string[]; // Items to add to inventory
    removeFromInventory?: string[]; // Items to remove from inventory
    addToContainer?: { // Items to add to containers
        containerId: string;
        itemIds: string[];
    };
    removeFromContainer?: { // Items to remove from containers
        containerId: string;
        itemIds: string[];
    };
    turnsToComplete?: number; // How many turns this action takes
    requiresLight?: boolean; // Whether this action needs light
    providesLight?: boolean; // Whether this action provides light
}

export interface GameCommand {
    verb: string;
    object?: string;
    target?: string;
    preposition?: string;
    originalInput: string;
    indirect?: string; // For commands like "put X in Y", Y is indirect
}

export interface CommandResponse {
    success: boolean;
    message: string;
    incrementTurn: boolean;
}

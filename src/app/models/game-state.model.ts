export interface GameState {
    currentScene: string;
    inventory: { [key: string]: boolean };
    flags: { [key: string]: boolean };
    score: number;
    moves: number;
    knownObjects: Set<string>;
    gameOver: boolean;
    gameWon: boolean;
}

export interface Scene {
    id: string;
    name: string;
    region: string;
    light?: boolean;
    descriptions: {
        default: string;
        dark?: string;
        states?: { [key: string]: string };
    };
    objects?: { [key: string]: SceneObject };
    exits?: SceneExit[];
    onEnter?: SceneInteraction;
}

export interface SceneObject {
    id: string;
    name: string;
    descriptions: {
        default: string;
        empty?: string;
        states?: { [key: string]: string };
    };
    visibleOnEntry?: boolean;
    canTake?: boolean;
    usable?: boolean;
    weight?: number;
    isContainer?: boolean;
    capacity?: number;
    contents?: string[];
    interactions?: { [key: string]: SceneInteraction };
}

export interface SceneExit {
    direction: string;
    targetScene: string;
    description: string;
    requiredFlags?: string[];
    failureMessage?: string;
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
}

export interface GameCommand {
    verb: string;
    object?: string;
    target?: string;
    preposition?: string;
    originalInput: string;
}

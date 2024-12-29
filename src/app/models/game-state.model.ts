export interface GameState {
    currentScene: string;
    inventory: string[];
    flags: string[];
    score: number;
    moves: number;
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
    failureMessage?: string;
    requiredFlags?: string[];
    grantsFlags?: string[];
    removesFlags?: string[];
    revealsObjects?: string[];
    states?: { [key: string]: string };
    score?: number;
    modifiesContainer?: {
        action: 'add' | 'remove';
        items: string[];
    };
    grantsCommands?: string[];
}

export interface GameCommand {
    verb: string;
    object?: string;
    target?: string;
    preposition?: string;
    originalInput: string;
}

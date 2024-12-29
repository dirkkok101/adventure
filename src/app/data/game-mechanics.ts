import { GameState, SceneInteraction } from '../models/game-state.model';

export const verbSynonyms: { [key: string]: string[] } = {
    'look': ['l', 'examine', 'x', 'search', 'inspect'],
    'take': ['get', 'grab', 'pick'],
    'drop': ['put', 'place', 'set'],
    'inventory': ['i', 'inv'],
    'use': ['activate', 'operate'],
    'open': ['unlock'],
    'close': ['shut', 'lock'],
    'go': ['move', 'walk', 'run', 'g'],
    'north': ['n'],
    'south': ['s'],
    'east': ['e'],
    'west': ['w'],
    'up': ['u'],
    'down': ['d']
};

export const compoundActions: { 
    [key: string]: {
        requires?: string[],
        actions: string[],
        score?: number
    }
} = {
    'walk around house': {
        actions: ['west', 'north', 'east', 'south'],
        score: 5
    },
    'fill bottle with water': {
        requires: ['hasBottle', 'pumpPrimed'],
        actions: ['put bottle under pump', 'pump water'],
        score: 5
    },
    'climb through window': {
        requires: ['windowOpen'],
        actions: ['enter window'],
        score: 5
    },
    'light lantern': {
        requires: ['hasLantern'],
        actions: ['turn on lantern'],
        score: 10
    }
};

export const scoringEvents: { [key: string]: number } = {
    // Basic exploration
    'openMailbox': 2,
    'getLeaflet': 3,
    'enterHouse': 10,
    'findTrapDoor': 5,
    'openTrapDoor': 5,
    'enterCellar': 10,
    'reachAttic': 10,

    // Puzzle solutions
    'lightLantern': 10,
    'fillBottle': 5,
    'solveWindowPuzzle': 8,
    'moveRug': 5,
    'tieRope': 10,
    'primeWaterPump': 5,

    // Treasure collection
    'getTrophy': 20,
    'getSword': 15,
    'getJewels': 25,
    'getCoin': 10,

    // Penalties
    'breakWindow': -5,
    'dieByGrue': -10,
    'fallFromHeight': -10
};

export const maxPossibleScore = Object.values(scoringEvents)
    .filter(score => score > 0)
    .reduce((a, b) => a + b, 0);

export function checkRequiredFlags(gameState: GameState, requiredFlags: string[]): boolean {
    return requiredFlags.every(flag => gameState.flags.includes(flag));
}

export function processCompoundAction(
    action: string,
    gameState: GameState
): { possible: boolean; actions: string[] } {
    const compound = compoundActions[action];
    if (!compound) {
        return { possible: false, actions: [] };
    }

    if (compound.requires) {
        const allRequirementsMet = checkRequiredFlags(gameState, compound.requires);
        if (!allRequirementsMet) {
            return { possible: false, actions: [] };
        }
    }

    return { possible: true, actions: compound.actions };
}

export function processInteraction(interaction: SceneInteraction, gameState: GameState): string {
    if (interaction.requiredFlags && !checkRequiredFlags(gameState, interaction.requiredFlags)) {
        return interaction.failureMessage || 'You cannot do that.';
    }

    if (interaction.grantsFlags) {
        gameState.flags.push(...interaction.grantsFlags);
    }

    if (interaction.score) {
        gameState.score += interaction.score;
    }

    return interaction.message;
}

export function normalizeVerb(input: string): string {
    // First check if it's a direct match
    if (verbSynonyms[input]) {
        return input;
    }

    // Then check synonyms
    for (const [mainVerb, synonyms] of Object.entries(verbSynonyms)) {
        if (synonyms.includes(input)) {
            return mainVerb;
        }
    }

    return input;
}

import { GameState, SceneInteraction, Scene, SceneObject } from '../models/game-state.model';

export const verbSynonyms: { [key: string]: string[] } = {
    'look': ['l', 'search'],
    'examine': ['x', 'inspect', 'check'],
    'inventory': ['i', 'inv'],
    'take': ['get', 'grab', 'pick'],
    'drop': ['put', 'place'],
    'use': ['activate', 'operate'],
    'open': ['unlock'],
    'close': ['shut']
};

export function processCommand(command: string, gameState: GameState, currentScene: Scene): string {
    const words = command.toLowerCase().split(' ');
    const verb = words[0];

    switch (verb) {
        case 'look':
        case 'l':
            return lookAround(currentScene, gameState);
        case 'inventory':
        case 'i':
            return showInventory(gameState);
        case 'take':
        case 'get':
            if (words.length < 2) return "What do you want to take?";
            return takeObject(words.slice(1).join(' '), gameState, currentScene);
        case 'drop':
            if (words.length < 2) return "What do you want to drop?";
            return dropObject(words.slice(1).join(' '), gameState, currentScene);
        case 'examine':
        case 'x':
            if (words.length < 2) return "What do you want to examine?";
            return examineObject(words.slice(1).join(' '), gameState, currentScene);
        default:
            return "I don't understand that command.";
    }
}

function lookAround(scene: Scene, gameState: GameState): string {
    let description = scene.descriptions.default;

    // Check for state-specific descriptions
    if (scene.descriptions.states) {
        for (const [flagCombo, stateDesc] of Object.entries(scene.descriptions.states)) {
            const flags = flagCombo.split(',');
            if (flags.every(flag => {
                if (flag.startsWith('!')) {
                    return !gameState.flags[flag.substring(1)];
                }
                return !!gameState.flags[flag];
            })) {
                description = stateDesc;
                break;
            }
        }
    }

    // List visible objects
    const visibleObjects = Object.values(scene.objects || {})
        .filter(obj => obj.visibleOnEntry || gameState.knownObjects.has(obj.id))
        .map(obj => getObjectDescription(obj, gameState));

    if (visibleObjects.length > 0) {
        description += '\n\n' + visibleObjects.join('\n');
    }

    return description;
}

function showInventory(gameState: GameState): string {
    const items = Object.entries(gameState.inventory)
        .filter(([_, value]) => value)
        .map(([key, _]) => key);

    return items.length > 0 ? 
        `You are carrying:\n${items.join('\n')}` : 
        'You are empty-handed.';
}

function takeObject(objectName: string, gameState: GameState, scene: Scene): string {
    const object = scene.objects?.[objectName];
    if (!object) {
        return `You don't see any ${objectName} here.`;
    }

    if (!object.canTake) {
        return `You can't take the ${object.name}.`;
    }

    gameState.inventory[objectName] = true;
    return `Taken.`;
}

function dropObject(objectName: string, gameState: GameState, scene: Scene): string {
    if (!gameState.inventory[objectName]) {
        return `You don't have the ${objectName}.`;
    }

    const object = Object.values(scene.objects || {})
        .find(obj => obj.id === objectName);

    if (!object) {
        return `You can't drop the ${objectName} here.`;
    }

    gameState.inventory[objectName] = false;
    return `Dropped.`;
}

function examineObject(objectName: string, gameState: GameState, scene: Scene): string {
    const object = scene.objects?.[objectName];
    if (!object) {
        if (gameState.inventory[objectName]) {
            return `You don't have the ${objectName}.`;
        }
        return `You don't see any ${objectName} here.`;
    }

    if (object.interactions && object.interactions['examine']) {
        return handleInteraction(object.interactions['examine'], gameState);
    }

    return getObjectDescription(object, gameState);
}

function getObjectDescription(object: SceneObject, gameState: GameState): string {
    if (object.descriptions.states) {
        for (const [flag, stateDesc] of Object.entries(object.descriptions.states)) {
            if (gameState.flags[flag]) {
                return stateDesc;
            }
        }
    }

    return object.descriptions.default;
}

export function handleInteraction(interaction: SceneInteraction, gameState: GameState): string {
    // Check required flags first
    if (interaction.requiredFlags) {
        for (const flag of interaction.requiredFlags) {
            if (flag.startsWith('!')) {
                const actualFlag = flag.substring(1);
                if (gameState.flags[actualFlag]) {
                    return interaction.failureMessage || "You can't do that right now.";
                }
            } else {
                if (!gameState.flags[flag]) {
                    return interaction.failureMessage || "You can't do that right now.";
                }
            }
        }
    }

    // Grant flags
    if (interaction.grantsFlags) {
        for (const flag of interaction.grantsFlags) {
            gameState.flags[flag] = true;
        }
    }

    // Remove flags
    if (interaction.removesFlags) {
        for (const flag of interaction.removesFlags) {
            delete gameState.flags[flag];
        }
    }

    // Add score if specified
    if (interaction.score) {
        gameState.score += interaction.score;
    }

    // Reveal objects if specified
    if (interaction.revealsObjects) {
        for (const objectId of interaction.revealsObjects) {
            gameState.knownObjects.add(objectId);
        }
    }

    // Return state-specific message if applicable
    if (interaction.states) {
        for (const [flag, message] of Object.entries(interaction.states)) {
            if (gameState.flags[flag]) {
                return message;
            }
        }
    }

    return interaction.message;
}

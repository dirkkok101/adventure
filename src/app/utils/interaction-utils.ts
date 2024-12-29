import { GameState, SceneInteraction } from '../models/game-state.model';

export function processInteraction(interaction: SceneInteraction, state: GameState): string {
    // Add any granted flags
    if (interaction.grantsFlags) {
        interaction.grantsFlags.forEach(flag => {
            if (!state.flags.includes(flag)) {
                state.flags.push(flag);
            }
        });
    }

    // Remove any specified flags
    if (interaction.removesFlags) {
        state.flags = state.flags.filter(flag => !interaction.removesFlags!.includes(flag));
    }

    // Add score if specified
    if (interaction.score) {
        state.score += interaction.score;
    }

    // Return the interaction message
    if (interaction.states) {
        // Check if any state-specific message applies
        for (const [flag, message] of Object.entries(interaction.states)) {
            if (state.flags.includes(flag)) {
                return message;
            }
        }
    }
    return interaction.message;
}

export function checkRequiredFlags(state: GameState, requiredFlags: string[]): boolean {
    return requiredFlags.every(flag => {
        if (flag.startsWith('!')) {
            // Flag should NOT be present
            return !state.flags.includes(flag.slice(1));
        } else {
            // Flag should be present
            return state.flags.includes(flag);
        }
    });
}

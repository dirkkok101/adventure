import { GameState } from "../../../models"';

export function processInteraction(state: GameState, interaction: SceneInteraction): void {
    // Grant flags
    if (interaction.grantsFlags) {
        for (const flag of interaction.grantsFlags) {
            state.flags[flag] = true;
        }
    }

    // Remove flags
    if (interaction.removesFlags) {
        for (const flag of interaction.removesFlags) {
            delete state.flags[flag];
        }
    }

    // Add score if specified
    if (interaction.score) {
        state.score += interaction.score;
    }
}

export function checkRequiredFlags(state: GameState, requiredFlags: string[]): boolean {
    return requiredFlags.every(flag => {
        if (flag.startsWith('!')) {
            return !state.flags[flag.substring(1)];
        }
        return !!state.flags[flag];
    });
}

import { Injectable } from '@angular/core';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { SceneInteraction } from '../../models/game-state.model';
import { FlagMechanicsService } from './flag-mechanics.service';
import { InventoryMechanicsService } from './inventory-mechanics.service';
import { ProgressMechanicsService } from './progress-mechanics.service';
import { GameTextService } from '../game-text.service';

@Injectable({
    providedIn: 'root'
})
export class StateMechanicsService {
    constructor(
        private gameState: GameStateService,
        private sceneService: SceneService,
        private flagMechanics: FlagMechanicsService,
        private inventoryMechanics: InventoryMechanicsService,
        private progressMechanics: ProgressMechanicsService,
        private gameText: GameTextService
    ) {}

    handleInteraction(object: SceneObject, verb: string): { success: boolean; message: string } {
        const state = this.gameState.getCurrentState();
        const interaction = object.interactions?.[verb];

        if (!interaction) {
            return { success: false, message: `You can't ${verb} that.` };
        }

        // Check required flags
        if (interaction.requiredFlags && !this.flagMechanics.checkFlags(interaction.requiredFlags)) {
            return { success: false, message: interaction.failureMessage || "You can't do that." };
        }

        // Check if light is required and present
        if (interaction.requiresLight && !this.gameState.getCurrentState().light) {
            return { success: false, message: "It's too dark to do that." };
        }

        // Handle inventory changes
        if (interaction.addToInventory) {
            interaction.addToInventory.forEach(itemId => {
                this.inventoryMechanics.addToInventory(itemId);
            });
        }

        if (interaction.removeFromInventory) {
            interaction.removeFromInventory.forEach(itemId => {
                this.inventoryMechanics.removeFromInventory(itemId);
            });
        }

        // Handle flag changes
        if (interaction.grantsFlags) {
            interaction.grantsFlags.forEach(flag => {
                this.flagMechanics.setFlag(flag);
            });
        }

        if (interaction.removesFlags) {
            interaction.removesFlags.forEach(flag => {
                this.flagMechanics.removeFlag(flag);
            });
        }

        // Handle score
        if (interaction.score) {
            this.progressMechanics.addScore(interaction.score);
        }

        // Handle light state
        if (interaction.providesLight !== undefined) {
            this.gameState.setLight(interaction.providesLight);
        }

        // Handle revealed objects
        if (interaction.revealsObjects) {
            interaction.revealsObjects.forEach(objectId => {
                this.gameState.updateState(state => ({
                    ...state,
                    knownObjects: new Set([...state.knownObjects, objectId])
                }));
            });
        }

        return { success: true, message: this.getStateBasedDescription(interaction, interaction.message) };
    }

    getStateBasedDescription(object: { states?: { [key: string]: string } }, defaultDesc: string): string {
        const state = this.gameState.getCurrentState();
        
        if (!object.states) {
            return defaultDesc;
        }

        // Find matching state description
        for (const [flagCombo, desc] of Object.entries(object.states)) {
            const flags = flagCombo.split(',');
            const matches = flags.every(flag => {
                if (flag.startsWith('!')) {
                    return !state.flags[flag.substring(1)];
                }
                return state.flags[flag];
            });

            if (matches) {
                return desc;
            }
        }

        return defaultDesc;
    }

    checkRequiredFlags(flags: string[]): boolean {
        return this.flagMechanics.checkFlags(flags);
    }
}

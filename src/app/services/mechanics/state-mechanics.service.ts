import { Injectable } from '@angular/core';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { SceneInteraction, SceneObject } from '../../models/game-state.model';
import { FlagMechanicsService } from './flag-mechanics.service';
import { InventoryMechanicsService } from './inventory-mechanics.service';
import { ProgressMechanicsService } from './progress-mechanics.service';
import { GameTextService } from '../game-text.service';
import { LightMechanicsService } from './light-mechanics.service';
import { ScoreMechanicsService } from './score-mechanics.service';

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
        private lightMechanics: LightMechanicsService,
        private scoreMechanics: ScoreMechanicsService,
        private gameText: GameTextService
    ) {}

    async handleInteraction(object: SceneObject, verb: string): Promise<{ success: boolean; message: string }> {
        const interaction = object.interactions?.[verb];

        if (!interaction) {
            return { success: false, message: `You can't ${verb} that.` };
        }

        // Check required flags
        if (interaction.requiredFlags && !await this.checkRequiredFlags(interaction.requiredFlags)) {
            return { success: false, message: interaction.failureMessage || "You can't do that." };
        }

        // Check if light is required and present
        if (interaction.requiresLight && !this.lightMechanics.isLightPresent()) {
            return { success: false, message: "It's too dark to do that." };
        }

        // Handle inventory changes
        if (interaction.addToInventory) {
            for (const itemId of interaction.addToInventory) {
                await this.inventoryMechanics.addToInventory(itemId);
            }
        }

        if (interaction.removeFromInventory) {
            for (const itemId of interaction.removeFromInventory) {
                await this.inventoryMechanics.removeFromInventory(itemId);
            }
        }

        // Handle flag changes
        if (interaction.grantsFlags) {
            for (const flag of interaction.grantsFlags) {
                await this.flagMechanics.setFlag(flag);
            }
        }

        if (interaction.removesFlags) {
            for (const flag of interaction.removesFlags) {
                await this.flagMechanics.removeFlag(flag);
            }
        }

        // Handle score
        if (interaction.score) {
            this.scoreMechanics.addScore(interaction.score);
        }

        // Handle light state
        if (interaction.providesLight !== undefined) {
            const result = this.lightMechanics.handleLightSource(object.id, interaction.providesLight);
            if (!result.success) {
                return result;
            }
        }

        // Handle revealed objects
        if (interaction.revealsObjects) {
            for (const objectId of interaction.revealsObjects) {
                this.flagMechanics.setFlag(`revealed_${objectId}`);
            }
        }

        return { 
            success: true, 
            message: await this.getStateBasedDescription(interaction, interaction.message) 
        };
    }

    async getStateBasedDescription(object: { states?: { [key: string]: string } }, defaultDesc: string): Promise<string> {
        if (!object.states) {
            return defaultDesc;
        }

        // Find matching state description
        for (const [flagCombo, desc] of Object.entries(object.states)) {
            const flags = flagCombo.split(',');
            const matches = await Promise.all(flags.map(async flag => {
                if (flag.startsWith('!')) {
                    return !await this.flagMechanics.hasFlag(flag.substring(1));
                }
                return await this.flagMechanics.hasFlag(flag);
            }));

            if (matches.every(m => m)) {
                return desc;
            }
        }

        return defaultDesc;
    }

    private async checkRequiredFlags(flags: string[]): Promise<boolean> {
        return this.flagMechanics.checkFlags(flags);
    }
}

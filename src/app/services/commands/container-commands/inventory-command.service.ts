import { Injectable } from '@angular/core';
import { GameStateService } from '../../game-state.service';
import { SceneMechanicsService } from '../../mechanics/scene-mechanics.service';
import { FlagMechanicsService } from '../../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../../mechanics/progress-mechanics.service';
import { LightMechanicsService } from '../../mechanics/light-mechanics.service';
import { InventoryMechanicsService } from '../../mechanics/inventory-mechanics.service';
import { ScoreMechanicsService } from '../../mechanics/score-mechanics.service';
import { ContainerMechanicsService } from '../../mechanics/container-mechanics.service';
import { BaseCommandService } from '../bases/base-command.service';
import { GameCommand, CommandResponse, SceneObject } from '../../../models';
import { GameTextService } from '../../game-text.service';

/**
 * Command service for handling inventory-related commands.
 * Allows players to check their current inventory contents and weight.
 * 
 * Key Responsibilities:
 * - Display inventory contents
 * - Show item descriptions
 * - Track inventory weight
 * 
 * Dependencies:
 * - InventoryMechanicsService: Manages inventory state
 * - SceneMechanicsService: Retrieves object information
 * - GameTextService: Provides text templates
 * 
 * Command Format:
 * - "inventory" or "i" or "inv": Show inventory contents
 */
@Injectable({
    providedIn: 'root'
})
export class InventoryCommandService extends BaseCommandService {
    constructor(
        gameState: GameStateService,
        sceneService: SceneMechanicsService,
        flagMechanics: FlagMechanicsService,
        progress: ProgressMechanicsService,
        lightMechanics: LightMechanicsService,
        inventoryMechanics: InventoryMechanicsService,
        scoreMechanics: ScoreMechanicsService,
        containerMechanics: ContainerMechanicsService,
        private gameText: GameTextService
    ) {
        super(
            gameState,
            sceneService,
            flagMechanics,
            progress,
            lightMechanics,
            inventoryMechanics,
            scoreMechanics,
            containerMechanics
        );
    }

    /**
     * Checks if this service can handle the given command
     * @param command Command to check
     * @returns True if command is an inventory command
     */
    canHandle(command: GameCommand): boolean {
        return command.verb === 'inventory' || command.verb === 'i' || command.verb === 'inv';
    }

    /**
     * Handles inventory command execution
     * @param command Command to execute
     * @returns Response with inventory contents
     */
    async handle(command: GameCommand): Promise<CommandResponse> {
        try {
            // Get inventory items
            const itemIds = await this.inventoryMechanics.listInventory();
            
            // No items case
            if (itemIds.length === 0) {
                return {
                    success: true,
                    message: this.gameText.get('inventory.empty'),
                    incrementTurn: false
                };
            }

            // Get objects and their descriptions
            const items: SceneObject[] = [];
            for (const id of itemIds) {
                const item = await this.sceneService.findObjectById(id);
                if (item) {
                    items.push(item);
                }
            }

            // Build inventory list with descriptions
            const itemDescriptions = await Promise.all(items.map(async item => {
                const description = await this.sceneService.getObjectDescription(item);
                return `${item.name}: ${description}`;
            }));

            // Calculate total weight if weight tracking is enabled
            const totalWeight = await this.inventoryMechanics.getCurrentWeight();
            const maxWeight = await this.inventoryMechanics.getMaxWeight();
            const weightInfo = totalWeight > 0 ? 
                this.gameText.get('inventory.weight', { current: totalWeight, max: maxWeight }) : 
                '';

            return {
                success: true,
                message: this.gameText.get('inventory.contents', {
                    items: itemDescriptions.join('\n'),
                    weight: weightInfo
                }),
                incrementTurn: false
            };
        } catch (error) {
            console.error('Error handling inventory command:', error);
            return {
                success: false,
                message: this.gameText.get('error.general'),
                incrementTurn: false
            };
        }
    }

    /**
     * Gets command suggestions for inventory command
     * @param command Partial command to get suggestions for
     * @returns Array of suggested command completions
     */
    async getSuggestions(command: GameCommand): Promise<string[]> {
        // Only suggest inventory-related verbs when no verb is entered
        if (!command.verb) {
            return ['inventory', 'i', 'inv'];
        }
        return [];
    }
}

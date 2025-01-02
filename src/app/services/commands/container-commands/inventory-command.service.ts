import { Injectable } from '@angular/core';
import { BaseCommandService } from '../bases/base-command.service';
import { GameCommand, CommandResponse } from '../../../models';
import { GameTextService } from '../../game-text.service';
import { InventoryMechanicsService } from '../../mechanics/inventory-mechanics.service';
import { ExaminationMechanicsService } from '../../mechanics/examination-mechanics.service';
import { GameStateService } from '../../game-state.service';
import { ContainerMechanicsService } from '../../mechanics/container-mechanics.service';
import { ContainerSuggestionService } from '../../mechanics/container-suggestion.service';
import { FlagMechanicsService } from '../../mechanics/flag-mechanics.service';
import { LightMechanicsService } from '../../mechanics/light-mechanics.service';
import { ProgressMechanicsService } from '../../mechanics/progress-mechanics.service';
import { SceneMechanicsService } from '../../mechanics/scene-mechanics.service';
import { ScoreMechanicsService } from '../../mechanics/score-mechanics.service';

/**
 * Command service for handling inventory-related commands.
 * Allows players to check their current inventory contents and weight.
 * 
 * Command Pattern:
 * - Handles 'inventory', 'i', and 'inv' verbs
 * - Orchestrates between inventory and examination mechanics
 * - No direct state manipulation
 * 
 * State Dependencies (via mechanics services):
 * - Inventory contents via InventoryMechanicsService
 * - Object descriptions via ExaminationMechanicsService
 * 
 * Service Dependencies:
 * - InventoryMechanicsService: Inventory operations and weight tracking
 * - ExaminationMechanicsService: Object descriptions
 * - GameTextService: Message templates
 * 
 * Error Handling:
 * - Invalid object references
 * - Weight calculation errors
 * - Description retrieval errors
 * 
 * Command Format:
 * - "inventory" or "i" or "inv": Show inventory contents
 * 
 * Command Effects:
 * - No state changes
 * - No turn increment
 * - Displays inventory contents and weight
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
        containerMechanics: ContainerMechanicsService,
        scoreMechanics: ScoreMechanicsService,
        private containerSuggestions: ContainerSuggestionService,
        private gameText: GameTextService,
        private examinationMechanics: ExaminationMechanicsService
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
     * 
     * @param command - Command to check
     * @returns True if command is an inventory command
     */
    override canHandle(command: GameCommand): boolean {
        return command.verb === 'inventory' || command.verb === 'i' || command.verb === 'inv';
    }

    /**
     * Handles inventory command execution
     * 
     * Command Flow:
     * 1. Get inventory contents from InventoryMechanicsService
     * 2. Get object descriptions from ExaminationMechanicsService
     * 3. Calculate total weight if enabled
     * 4. Format response message
     * 
     * Error Conditions:
     * - Invalid object references
     * - Weight calculation errors
     * - Description retrieval errors
     * 
     * @param command - Command to execute
     * @returns Response with inventory contents
     */
    override async handle(command: GameCommand): Promise<CommandResponse> {
        try {
            // Get inventory items
            const items = await this.inventoryMechanics.getInventoryContents();
            
            // No items case
            if (items.length === 0) {
                return {
                    success: true,
                    message: this.gameText.get('inventory.empty'),
                    incrementTurn: false
                };
            }

            // Get descriptions for each item
            const itemDescriptions = await Promise.all(
                items.map(async itemId => {
                    try {
                        // Get the object from the scene service first
                        const item = await this.sceneService.findObjectById(itemId);
                        if (!item) {
                            console.error(`Item ${itemId} not found in scene`);
                            return this.gameText.get('error.description', { item: itemId });
                        }
                        
                        // Get description using the full object
                        const description = await this.examinationMechanics.getObjectDescription(item, false);
                        return `${item.name}: ${description}`;
                    } catch (error) {
                        console.error(`Failed to get description for item ${itemId}:`, error);
                        return this.gameText.get('error.description', { item: itemId });
                    }
                })
            );

            // Get weight information if enabled
            let weightInfo = '';
            try {
                const scene = this.sceneService.getCurrentScene();
                const contents = await this.inventoryMechanics.getInventoryContents();
                const totalWeight = contents.reduce((total, id) => 
                    total + (scene?.objects?.[id]?.weight || 0), 0);

                if (totalWeight > 0) {
                    weightInfo = this.gameText.get('inventory.weight', { 
                        current: totalWeight, 
                        max: this.inventoryMechanics.getMaxInventoryWeight()
                    });
                }
            } catch (error) {
                console.error('Failed to calculate inventory weight:', error);
                weightInfo = this.gameText.get('error.weight');
            }

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
                message: this.gameText.get('error.inventory'),
                incrementTurn: false
            };
        }
    }

    /**
     * Gets command suggestions for inventory command
     * 
     * Suggestion Logic:
     * - Only provides suggestions when no verb is entered
     * - Suggests all valid inventory command variations
     * 
     * @param command - Partial command to get suggestions for
     * @returns Array of suggested command completions
     */
    override async getSuggestions(command: GameCommand): Promise<string[]> {
        // Only suggest inventory-related verbs when no verb is entered
        if (!command.verb) {
            return ['inventory', 'i', 'inv'];
        }
        return [];
    }
}

import { Injectable } from '@angular/core';
import { GameStateService } from '../../game-state.service';
import { SceneMechanicsService } from '../../mechanics/scene-mechanics.service';
import { InventoryMechanicsService } from '../../mechanics/inventory-mechanics.service';
import { ScoreMechanicsService } from '../../mechanics/score-mechanics.service';
import { ProgressMechanicsService } from '../../mechanics/progress-mechanics.service';
import { FlagMechanicsService } from '../../mechanics/flag-mechanics.service';
import { LightMechanicsService } from '../../mechanics/light-mechanics.service';
import { BaseCommandService } from '../bases/base-command.service';
import { ContainerMechanicsService } from '../../mechanics/container-mechanics.service';
import { GameCommand, CommandResponse, SceneObject } from '../../../models';
import { GameTextService } from '../../game-text.service';
import { ScoringOptions } from '../../../models/scoring/scoring-options.interface';

/**
 * Command service for handling drop commands.
 * Manages dropping objects from inventory into the current scene.
 * 
 * Key Responsibilities:
 * - Validate object possession
 * - Handle inventory removal
 * - Manage scene object placement
 * - Handle scoring for special drops
 * 
 * Service Dependencies:
 * - InventoryMechanicsService: Inventory management
 *   - Handles object removal from inventory
 *   - Validates object possession
 * - SceneMechanicsService: Scene object management
 *   - Manages scene object placement
 *   - Validates scene state
 * - ScoreMechanicsService: Scoring for special drops
 *   - Handles drop-related scoring
 *   - Manages score state
 * - FlagMechanicsService: Game state management
 *   - Tracks object locations
 *   - Manages state flags
 * 
 * State Dependencies:
 * - [objectId]_has via InventoryMechanicsService
 * - [sceneId]_objects via SceneMechanicsService
 * - [objectId]_location via FlagMechanicsService
 * - [objectId]_score via ScoreMechanicsService
 * 
 * Error Handling:
 * - Invalid command format: Returns error before processing
 * - Object not found: Returns error with details
 * - Object not in inventory: Returns error with details
 * - Scene state errors: Rolls back changes
 * - Scoring errors: Logs but continues
 * 
 * Command Format:
 * - "drop [object]"
 * - Only handles simple drops, not "put in" commands
 */
@Injectable({
    providedIn: 'root'
})
export class DropObjectCommandService extends BaseCommandService {
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
     * @returns True if command is a valid drop command without preposition
     * 
     * @throws None
     */
    canHandle(command: GameCommand): boolean {
        // Only handle 'drop' without preposition, use PutCommandService for 'put in'
        return command.verb === 'drop' && !command.preposition;
    }

    /**
     * Handles the drop command execution
     * @param command Command to execute
     * @returns Response indicating success/failure and appropriate message
     * 
     * State Dependencies:
     * - All dependencies from performDrop
     * 
     * Error Conditions:
     * - No object specified: Returns error
     * - Object not found: Returns error
     * - Object not in inventory: Returns error
     * - All error conditions from performDrop
     * 
     * @throws None - All errors returned in CommandResponse
     */
    async handle(command: GameCommand): Promise<CommandResponse> {
        try {
            // Validate command format
            if (!command.object) {
                return {
                    success: false,
                    message: this.gameText.get('error.noObjectSpecified', { action: 'drop' }),
                    incrementTurn: false
                };
            }

            // Find and validate object
            const object = await this.sceneService.findObject(command.object);
            if (!object) {
                return {
                    success: false,
                    message: this.gameText.get('error.objectNotFound', { object: command.object }),
                    incrementTurn: false
                };
            }

            // Verify object possession
            if (!await this.inventoryMechanics.hasItem(object.id)) {
                return {
                    success: false,
                    message: this.gameText.get('error.dontHaveObject', { object: object.name }),
                    incrementTurn: false
                };
            }

            // Perform the drop operation
            const dropResult = await this.performDrop(object);
            if (!dropResult.success) {
                return dropResult;
            }

            return {
                success: true,
                message: this.gameText.get('success.dropObject', { object: object.name }),
                incrementTurn: true
            };
        } catch (error) {
            console.error('Error handling drop command:', error);
            return {
                success: false,
                message: this.gameText.get('error.general'),
                incrementTurn: false
            };
        }
    }

    /**
     * Performs the actual drop operation with proper error handling and state management
     * @param object Object to drop
     * @returns Response indicating success/failure and appropriate message
     * 
     * State Dependencies:
     * - [objectId]_has via InventoryMechanicsService
     * - [sceneId]_objects via SceneMechanicsService
     * - [objectId]_location via FlagMechanicsService
     * - [objectId]_score via ScoreMechanicsService
     * 
     * State Effects:
     * - Removes object from inventory
     * - Adds object to current scene
     * - Updates object location
     * - Updates score if applicable
     * 
     * Error Conditions:
     * - No current scene: Returns error
     * - Inventory update fails: Returns error
     * - Scene update fails: Rolls back inventory change
     * - Scoring error: Logs but continues
     * 
     * @throws None - All errors returned in CommandResponse
     */
    private async performDrop(object: SceneObject): Promise<CommandResponse> {
        try {
            // Get current scene
            const currentScene = await this.sceneService.getCurrentScene();
            if (!currentScene) {
                return {
                    success: false,
                    message: this.gameText.get('error.noCurrentScene'),
                    incrementTurn: false
                };
            }

            // Remove from inventory
            const dropResult = await this.inventoryMechanics.dropObject(object.id);
            if (!dropResult.success) {
                return {
                    ...dropResult,
                    incrementTurn: false
                };
            }

            // Add to current scene
            const sceneResult = await this.sceneService.addObjectToScene(object);
            if (!sceneResult.success) {
                // Rollback inventory change if scene update fails
                await this.inventoryMechanics.takeObject(object.id);
                return {
                    success: false,
                    message: this.gameText.get('error.cantDropHere'),
                    incrementTurn: false
                };
            }

            // Handle scoring through ScoreMechanicsService
            try {
                await this.scoreMechanics.handleObjectScoring({
                    action: 'drop',
                    object,
                    skipGeneralRules: false
                });
            } catch (error) {
                console.error('Error handling drop scoring:', error);
                // Continue with drop even if scoring fails
            }

            // Update game state
            await this.flagMechanics.setObjectFlag(object.id, 'location', true);
            this.progress.incrementTurns();

            return {
                success: true,
                message: dropResult.message,
                incrementTurn: true
            };
        } catch (error) {
            console.error('Error performing drop operation:', error);
            return {
                success: false,
                message: this.gameText.get('error.general'),
                incrementTurn: false
            };
        }
    }

    /**
     * Gets command suggestions based on current state
     * @param command Partial command to get suggestions for
     * @returns Array of suggested command completions
     * 
     * State Dependencies:
     * - Inventory state via InventoryMechanicsService
     * - Object data via SceneMechanicsService
     * 
     * Error Conditions:
     * - Invalid verb: Returns empty array
     * - No inventory items: Returns empty array
     * - Error accessing state: Returns empty array
     * 
     * @throws None - Returns empty array on error
     */
    override async getSuggestions(command: GameCommand): Promise<string[]> {
        try {
            if (!command.verb || command.verb !== 'drop') {
                return [];
            }

            const suggestions = new Set<string>();

            // Get droppable objects from inventory
            const inventoryItems = await this.inventoryMechanics.listInventory();
            for (const itemId of inventoryItems) {
                const item = await this.sceneService.findObjectById(itemId);
                if (item) {
                    suggestions.add(item.name.toLowerCase());
                }
            }

            return Array.from(suggestions);
        } catch (error) {
            console.error('Error getting drop command suggestions:', error);
            return [];
        }
    }
}

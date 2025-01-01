import { Injectable } from '@angular/core';
import { ContainerBaseCommandService } from '../bases/container-base-command.service';
import { GameStateService } from '../../game-state.service';
import { SceneMechanicsService } from '../../mechanics/scene-mechanics.service';
import { FlagMechanicsService } from '../../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../../mechanics/progress-mechanics.service';
import { LightMechanicsService } from '../../mechanics/light-mechanics.service';
import { InventoryMechanicsService } from '../../mechanics/inventory-mechanics.service';
import { ContainerMechanicsService } from '../../mechanics/container-mechanics.service';
import { ScoreMechanicsService } from '../../mechanics/score-mechanics.service';
import { GameTextService } from '../../game-text.service';
import { GameCommand, CommandResponse, SceneObject } from '../../../models';
import { BaseCommandService } from '../bases/base-command.service';

/**
 * Command service for handling take/get commands.
 * Manages taking objects from scenes and containers into inventory.
 * 
 * Key Responsibilities:
 * - Validate object takeability
 * - Handle container interactions
 * - Manage inventory additions
 * - Process scoring for special takes
 * 
 * Dependencies:
 * - InventoryMechanicsService: Inventory management
 * - ContainerMechanicsService: Container interactions
 * - SceneMechanicsService: Scene object management
 * - ScoreMechanicsService: Scoring for special takes
 * 
 * Command Format:
 * - "take/get/pick [object]"
 * - Handles taking objects from scene or open containers
 */
@Injectable({
    providedIn: 'root'
})
export class TakeObjectCommandService extends BaseCommandService {
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
     * @returns True if command is a valid take/get/pick command
     */
    canHandle(command: GameCommand): boolean {
        return command.verb === 'take' || command.verb === 'get' || command.verb === 'pick';
    }

    /**
     * Handles the take command execution
     * @param command Command to execute
     * @returns Response indicating success/failure and appropriate message
     */
    async handle(command: GameCommand): Promise<CommandResponse> {
        try {
            // Validate command format
            if (!command.object) {
                return {
                    success: false,
                    message: this.gameText.get('error.noObject', { action: command.verb }),
                    incrementTurn: false
                };
            }

            // Find and validate object
            const object = await this.findObject(command.object);
            if (!object) {
                return {
                    success: false,
                    message: this.gameText.get('error.objectNotFound', { item: command.object }),
                    incrementTurn: false
                };
            }

            // Validate conditions
            const validationResult = await this.validateTakeConditions(object);
            if (!validationResult.success) {
                return validationResult;
            }

            // Perform take operation
            return this.performTakeAction(object);
        } catch (error) {
            console.error('Error handling take command:', error);
            return {
                success: false,
                message: this.gameText.get('error.general'),
                incrementTurn: false
            };
        }
    }

    /**
     * Validates all conditions required to take an object
     * @param object Object to validate
     * @returns Response indicating if take is possible
     */
    private async validateTakeConditions(object: SceneObject): Promise<CommandResponse> {
        // Check light conditions
        if (!await this.lightMechanics.isLightPresent()) {
            return {
                success: false,
                message: this.gameText.get('error.tooDark', { action: 'take' }),
                incrementTurn: false
            };
        }

        // Check visibility
        if (!await this.checkVisibility(object)) {
            return {
                success: false,
                message: this.gameText.get('error.objectNotVisible', { item: object.name }),
                incrementTurn: false
            };
        }

        // Check if object can be taken
        if (!await this.inventoryMechanics.canTakeObject(object)) {
            return {
                success: false,
                message: this.gameText.get('error.cantTake', { item: object.name }),
                incrementTurn: false
            };
        }

        // Check container accessibility if applicable
        const container = await this.containerMechanics.findContainerWithItem(object.id);
        if (container && !await this.containerMechanics.isOpen(container.id)) {
            return {
                success: false,
                message: this.gameText.get('error.containerClosed', { container: container.name }),
                incrementTurn: false
            };
        }

        return { success: true, message: '', incrementTurn: false };
    }

    /**
     * Performs the take action with proper error handling and state management
     * @param object Object to take
     * @returns Response indicating success/failure and appropriate message
     */
    private async performTakeAction(object: SceneObject): Promise<CommandResponse> {
        try {
            // Find container if object is in one
            const container = await this.containerMechanics.findContainerWithItem(object.id);

            // Start transaction-like operation
            if (container) {
                await this.containerMechanics.removeFromContainer(container.id, object.id);
            } else {
                const removeResult = await this.sceneService.removeObjectFromScene(object.id);
                if (!removeResult.success) {
                    return {
                        success: false,
                        message: this.gameText.get('error.cantTake', { item: object.name }),
                        incrementTurn: false
                    };
                }
            }

            // Add to inventory
            const takeResult = await this.inventoryMechanics.takeObject(object);
            if (!takeResult.success) {
                // Rollback on failure
                if (container) {
                    await this.containerMechanics.addToContainer(container.id, object.id);
                } else {
                    await this.sceneService.addObjectToScene(object);
                }
                return { ...takeResult, incrementTurn: false };
            }

            // Update game state
            await this.updateGameState(object, container);

            return {
                success: true,
                message: this.gameText.get('success.takeObject', { item: object.name }),
                incrementTurn: true
            };
        } catch (error) {
            console.error('Error performing take action:', error);
            return {
                success: false,
                message: this.gameText.get('error.general'),
                incrementTurn: false
            };
        }
    }

    /**
     * Updates game state after successful take
     * @param object Object that was taken
     * @param container Container object was taken from (if any)
     */
    private async updateGameState(object: SceneObject, container: SceneObject | null): Promise<void> {
        // Update object location
        await this.flagMechanics.setObjectLocation(object.id, 'inventory');

        // Handle scoring
        const takeScore = object.scoring?.take;
        if (takeScore) {
            await this.scoreMechanics.addScore(takeScore);
            
            // Additional score if taken from a specific container
            if (container && object.scoring?.containerTargets?.[container.id]) {
                await this.scoreMechanics.addScore(object.scoring.containerTargets[container.id]);
            }
        }

        // Update progress
        this.progress.incrementTurns();
    }

    /**
     * Gets command suggestions based on current state
     * @param command Partial command to get suggestions for
     * @returns Array of suggested command completions
     */
    override async getSuggestions(command: GameCommand): Promise<string[]> {
        try {
            if (!command.verb || !['take', 'get', 'pick'].includes(command.verb)) {
                return [];
            }

            const scene = await this.sceneService.getCurrentScene();
            if (!scene) return [];

            const suggestions = new Set<string>();

            // Get takeable objects from current scene
            const visibleObjects = await this.sceneService.getVisibleObjects(scene);
            for (const object of visibleObjects) {
                if (await this.inventoryMechanics.canTakeObject(object)) {
                    suggestions.add(object.name.toLowerCase());
                }
            }

            // Get objects from open containers
            const containers = visibleObjects.filter(obj => obj.isContainer);
            for (const container of containers) {
                if (!await this.containerMechanics.isOpen(container.id)) continue;

                const contents = await this.containerMechanics.getContainerContents(container.id);
                for (const itemId of contents) {
                    const item = await this.sceneService.findObjectById(itemId);
                    if (item && await this.inventoryMechanics.canTakeObject(item)) {
                        suggestions.add(item.name.toLowerCase());
                    }
                }
            }

            return Array.from(suggestions);
        } catch (error) {
            console.error('Error getting take command suggestions:', error);
            return [];
        }
    }
}

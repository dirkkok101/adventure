import { Injectable } from '@angular/core';
import { BaseCommandService } from '../bases/base-command.service';
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

/**
 * Command service for handling take/get commands.
 * Orchestrates taking objects from scenes and containers into inventory.
 * 
 * Key Responsibilities:
 * - Parse and validate take commands
 * - Coordinate between mechanics services for take operations
 * - Handle command suggestions
 * - Manage transaction-like operations for taking objects
 * 
 * State Dependencies (via mechanics services):
 * - Object location state (via FlagMechanics)
 * - Container state (via ContainerMechanics)
 * - Scene object state (via SceneMechanics)
 * - Scoring state (via ScoreMechanics)
 * - Light state (via LightMechanics)
 * - Progress state (via ProgressMechanics)
 * 
 * Service Dependencies:
 * - FlagMechanicsService: State management and flags
 * - InventoryMechanicsService: Inventory operations
 * - ContainerMechanicsService: Container access
 * - SceneMechanicsService: Scene and object access
 * - ScoreMechanicsService: Take-related scoring
 * - LightMechanicsService: Visibility checks
 * - ProgressMechanicsService: Turn and progress tracking
 * 
 * Command Format:
 * - "take/get/pick [object]"
 * - Handles taking objects from scene or open containers
 * 
 * Error Handling:
 * - Validates command format and object existence
 * - Checks visibility and accessibility conditions
 * - Manages rollback on failed operations
 * - Provides specific error messages for each failure case
 * 
 * State Update Rules:
 * - All state changes go through mechanics services
 * - State updates are atomic and consistent
 * - Rollback on failure maintains consistency
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
     * 
     * State Effects (all via mechanics services):
     * - May update inventory state (via InventoryMechanics)
     * - May update container state (via ContainerMechanics)
     * - May update scene state (via SceneMechanics)
     * - May update score state (via ScoreMechanics)
     * - Updates progress state (via ProgressMechanics)
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

            // Find and validate object through SceneMechanics
            const object = await this.sceneService.findObject(command.object);
            if (!object) {
                return {
                    success: false,
                    message: this.gameText.get('error.objectNotFound', { item: command.object }),
                    incrementTurn: false
                };
            }

            // Validate conditions through mechanics services
            const validationResult = await this.validateTakeConditions(object);
            if (!validationResult.success) {
                return validationResult;
            }

            // Perform take operation through mechanics services
            const takeResult = await this.performTakeAction(object);

            // Update progress through ProgressMechanics
            if (takeResult.success) {
                await this.progress.handleActionComplete();
            }

            return takeResult;
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
     * 
     * State Dependencies (all read-only):
     * - Light state (via LightMechanics)
     * - Container state (via ContainerMechanics)
     * - Inventory state (via InventoryMechanics)
     * - Scene state (via SceneMechanics)
     */
    private async validateTakeConditions(object: SceneObject): Promise<CommandResponse> {
        // Check light and accessibility through SceneMechanics
        if (!await this.sceneService.isObjectAccessible(object.id)) {
            return {
                success: false,
                message: this.gameText.get('error.objectNotAccessible', { item: object.name }),
                incrementTurn: false
            };
        }

        // Check take possibility through InventoryMechanics
        const takeCheck = await this.inventoryMechanics.canTakeObject(object.id);
        if (!takeCheck) {
            return {
                success: false,
                message: this.gameText.get('error.cantTake', { item: object.name }),
                incrementTurn: false
            };
        }

        // Check container accessibility through ContainerMechanics
        const container = await this.containerMechanics.findContainerWithItem(object.id);
        if (container && !this.flagMechanics.isContainerOpen(container.id)) {
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
     * 
     * State Effects (all via mechanics services):
     * - Updates inventory state (via InventoryMechanics)
     * - Updates container/scene state (via respective mechanics)
     * - Updates score state (via ScoreMechanics)
     * - Updates object location state (via FlagMechanics)
     */
    private async performTakeAction(object: SceneObject): Promise<CommandResponse> {
        try {
            // Find container through ContainerMechanics
            const container = await this.containerMechanics.findContainerWithItem(object.id);

            // Start atomic operation
            let takeResult;
            
            // Take object through appropriate mechanics service
            if (container) {
                takeResult = await this.inventoryMechanics.takeObjectFromContainer(object.id, container.id);
            } else {
                takeResult = await this.inventoryMechanics.takeObject(object.id);
            }

            if (!takeResult.success) {
                return {
                    success: false,
                    message: takeResult.message || this.gameText.get('error.cantTake', { item: object.name }),
                    incrementTurn: false
                };
            }

            // Handle scoring through ScoreMechanics
            await this.handleTakeScoring(object, container);

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
     * Handles scoring for take action through ScoreMechanics
     * @param object Object that was taken
     * @param container Container object was taken from (if any)
     * 
     * State Effects:
     * - Updates score state (via ScoreMechanics)
     */
    private async handleTakeScoring(object: SceneObject, container: SceneObject | null): Promise<void> {
        try {
            // Handle scoring through ScoreMechanics
            await this.scoreMechanics.handleObjectScoring({
                object: object,
                action: 'take',
                container: container || undefined
            });
        } catch (error) {
            console.error('Error handling take scoring:', error);
            throw error;
        }
    }

    /**
     * Gets command suggestions based on current state
     * @param command Partial command to get suggestions for
     * @returns Array of suggested command completions
     * 
     * State Dependencies (all read-only):
     * - Scene state (via SceneMechanics)
     * - Container state (via ContainerMechanics)
     * - Inventory state (via InventoryMechanics)
     */
    override async getSuggestions(command: GameCommand): Promise<string[]> {
        try {
            if (!command.verb || !['take', 'get', 'pick'].includes(command.verb)) {
                return [];
            }

            const scene = await this.sceneService.getCurrentScene();
            if (!scene) return [];

            const suggestions = new Set<string>();

            // Get takeable objects through SceneMechanics and InventoryMechanics
            const visibleObjects = await this.sceneService.getVisibleObjects(scene);
            for (const object of visibleObjects) {
                const takeCheck = await this.inventoryMechanics.canTakeObject(object.id);
                if (takeCheck) {
                    suggestions.add(object.name.toLowerCase());
                }
            }

            // Get container objects through ContainerMechanics
            const containers = visibleObjects.filter(obj => obj.isContainer);
            for (const container of containers) {
                const containerCheck = await this.containerMechanics.isOpen(container.id);
                if (!containerCheck) continue;

                const contents = await this.containerMechanics.getContainerContents(container);
                for (const itemId of contents) {
                    const item = await this.sceneService.findObjectById(itemId);
                    if (item) {
                        const takeCheck = await this.inventoryMechanics.canTakeObject(item.id);
                        if (takeCheck) {
                            suggestions.add(item.name.toLowerCase());
                        }
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

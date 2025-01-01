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
 * Command service for handling object movement commands.
 * Manages moving objects within a scene, considering object properties and game state.
 * 
 * Key Responsibilities:
 * - Validate object moveability
 * - Handle object visibility checks
 * - Process special movement logic
 * - Update game state after movement
 * 
 * Dependencies:
 * - SceneMechanicsService: Scene and object management
 * - LightMechanicsService: Visibility checks
 * - FlagMechanicsService: Game state management
 * 
 * Command Format:
 * - "move [object]"
 * - Handles simple object movement within current scene
 */
@Injectable({
    providedIn: 'root'
})
export class MoveObjectCommandService extends BaseCommandService {
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
     * @returns True if command is a valid move command with an object specified
     */
    canHandle(command: GameCommand): boolean {
        return command.verb === 'move' && !!command.object;
    }

    /**
     * Handles the move command execution
     * @param command Command to execute
     * @returns Response indicating success/failure and appropriate message
     */
    async handle(command: GameCommand): Promise<CommandResponse> {
        try {
            if (!command.object) {
                return {
                    success: false,
                    message: this.gameText.get('error.noObjectSpecified', { action: 'move' }),
                    incrementTurn: false
                };
            }

            return this.handleObjectMovement(command.object);
        } catch (error) {
            console.error('Error handling move command:', error);
            return {
                success: false,
                message: this.gameText.get('error.general'),
                incrementTurn: false
            };
        }
    }

    /**
     * Handles the specific movement of an object with proper validation
     * @param objectName Name of object to move
     * @returns Response indicating success/failure and appropriate message
     */
    protected async handleObjectMovement(objectName: string): Promise<CommandResponse> {
        try {
            // Find and validate object
            const object = await this.findObject(objectName);
            if (!object) {
                return {
                    success: false,
                    message: this.gameText.get('error.objectNotVisible', { object: objectName }),
                    incrementTurn: false
                };
            }

            // Check visibility
            if (!await this.lightMechanics.isObjectVisible(object)) {
                return {
                    success: false,
                    message: this.gameText.get('error.tooDark', { action: 'move' }),
                    incrementTurn: false
                };
            }

            // Validate moveability
            if (!object.moveable) {
                return {
                    success: false,
                    message: this.gameText.get('error.cantMove', { object: object.name }),
                    incrementTurn: false
                };
            }

            // Process movement
            const moveResult = await this.processMoveAction(object);
            if (!moveResult.success) {
                return moveResult;
            }

            // Update game state
            await this.updateGameState(object);

            return moveResult;
        } catch (error) {
            console.error('Error handling object movement:', error);
            return {
                success: false,
                message: this.gameText.get('error.general'),
                incrementTurn: false
            };
        }
    }

    /**
     * Processes the actual move action for an object
     * @param object Object to move
     * @returns Response indicating success/failure and appropriate message
     */
    private async processMoveAction(object: SceneObject): Promise<CommandResponse> {
        // Handle any special movement logic
        if (object.onMove) {
            // Set movement flag in game state
            await this.flagMechanics.setObjectMoved(object.id);
            
            return {
                success: true,
                message: object.onMove,
                incrementTurn: true
            };
        }

        // Handle default movement
        return {
            success: true,
            message: this.gameText.get('success.moveObject', { object: object.name }),
            incrementTurn: true
        };
    }

    /**
     * Updates game state after successful movement
     * @param object Object that was moved
     */
    private async updateGameState(object: SceneObject): Promise<void> {
        // Update object state
        await this.flagMechanics.setObjectMoved(object.id);
        
        // Handle any scoring
        const moveScore = object.scoring?.move;
        if (moveScore) {
            await this.scoreMechanics.addScore(moveScore);
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
            if (!command.verb) {
                return ['move'];
            }

            if (command.verb === 'move' && !command.object) {
                const scene = await this.sceneService.getCurrentScene();
                if (!scene) return [];

                const suggestions = new Set<string>();
                const visibleObjects = await this.sceneService.getVisibleObjects(scene);

                for (const obj of visibleObjects) {
                    if (obj.moveable && await this.lightMechanics.isObjectVisible(obj)) {
                        suggestions.add(obj.name.toLowerCase());
                    }
                }

                return Array.from(suggestions);
            }

            return [];
        } catch (error) {
            console.error('Error getting move command suggestions:', error);
            return [];
        }
    }
}

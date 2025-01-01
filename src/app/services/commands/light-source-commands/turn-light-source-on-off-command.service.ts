import { Injectable } from '@angular/core';
import { GameStateService } from '../../game-state.service';
import { SceneMechanicsService } from '../../mechanics/scene-mechanics.service';
import { LightMechanicsService } from '../../mechanics/light-mechanics.service';
import { InventoryMechanicsService } from '../../mechanics/inventory-mechanics.service';
import { FlagMechanicsService } from '../../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../../mechanics/progress-mechanics.service';
import { BaseCommandService } from '../bases/base-command.service';
import { ContainerMechanicsService } from '../../mechanics/container-mechanics.service';
import { ScoreMechanicsService } from '../../mechanics/score-mechanics.service';
import { GameCommand, CommandResponse, SceneObject } from '../../../models';
import { GameTextService } from '../../game-text.service';

/**
 * Command service for handling light source control commands.
 * Manages turning light sources on and off, with proper state management
 * and inventory checks.
 * 
 * Key Responsibilities:
 * - Handle light source state changes
 * - Validate light source accessibility
 * - Manage battery/fuel status
 * - Coordinate light state with visibility
 * 
 * Dependencies:
 * - LightMechanicsService: Light source state management
 * - InventoryMechanicsService: Item possession checks
 * - SceneMechanicsService: Object visibility and location
 * 
 * Command Format:
 * - "turn [light source] on/off"
 * - Requires object and preposition (on/off)
 */
@Injectable({
    providedIn: 'root'
})
export class TurnLightSourceOnOffCommandService extends BaseCommandService {
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
     * @returns True if command is a valid turn command
     */
    canHandle(command: GameCommand): boolean {
        return command.verb === 'turn';
    }

    /**
     * Handles the turn command execution
     * @param command Command to execute
     * @returns Response indicating success/failure and appropriate message
     */
    async handle(command: GameCommand): Promise<CommandResponse> {
        try {
            // Validate command format
            if (!command.preposition || !command.object) {
                return {
                    success: false,
                    message: this.gameText.get('error.turnWhat'),
                    incrementTurn: false
                };
            }

            if (!['on', 'off'].includes(command.preposition)) {
                return {
                    success: false,
                    message: this.gameText.get('error.turnOnlyOnOff'),
                    incrementTurn: false
                };
            }

            // Find and validate object
            const object = await this.findObject(command.object);
            if (!object) {
                return {
                    success: false,
                    message: this.gameText.get('error.objectNotVisible', { object: command.object }),
                    incrementTurn: false
                };
            }

            // Check visibility
            if (!await this.lightMechanics.isObjectVisible(object)) {
                return {
                    success: false,
                    message: this.gameText.get('error.tooDark', { action: 'turn' }),
                    incrementTurn: false
                };
            }

            return this.handleInteraction(object, command);
        } catch (error) {
            console.error('Error handling turn command:', error);
            return {
                success: false,
                message: this.gameText.get('error.general'),
                incrementTurn: false
            };
        }
    }

    /**
     * Handles the specific interaction with a light source
     * @param object Object to interact with
     * @param command Original command for context
     * @returns Response indicating success/failure and appropriate message
     */
    protected async handleInteraction(object: SceneObject, command: GameCommand): Promise<CommandResponse> {
        try {
            // Validate object can be turned on/off
            if (!object.interactions?.['turn'] && !object.providesLight) {
                return {
                    success: false,
                    message: this.gameText.get('error.cantTurnOnOff', { object: object.name }),
                    incrementTurn: false
                };
            }

            // Check inventory for portable light sources
            if (object.providesLight && object.canTake && !await this.inventoryMechanics.hasItem(object.id)) {
                return {
                    success: false,
                    message: this.gameText.get('error.needToTakeFirst', { object: object.name }),
                    incrementTurn: false
                };
            }

            const turningOn = command.preposition === 'on';

            // Special handling for lantern
            if (object.id === 'lantern' && turningOn) {
                const batteryStatus = await this.lightMechanics.getLanternBatteryStatus();
                if (batteryStatus.includes('dead')) {
                    return {
                        success: false,
                        message: batteryStatus,
                        incrementTurn: false
                    };
                }
            }

            // Handle light source state change
            if (object.providesLight) {
                const lightResult = await this.lightMechanics.handleLightSource(object.id, turningOn);
                return {
                    success: lightResult.success,
                    message: lightResult.message,
                    incrementTurn: lightResult.success
                };
            }

            // Default case for non-light sources
            return {
                success: false,
                message: this.gameText.get('error.nothingHappens', { 
                    object: object.name, 
                    action: command.preposition 
                }),
                incrementTurn: false
            };
        } catch (error) {
            console.error('Error handling light source interaction:', error);
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
     */
    async getSuggestions(command: GameCommand): Promise<string[]> {
        try {
            if (!command.verb) {
                return [];
            }

            const suggestions = new Set<string>();

            // If no object specified, suggest light sources
            if (!command.object) {
                const scene = await this.sceneService.getCurrentScene();
                const visibleObjects = await this.sceneService.getVisibleObjects(scene);
                const inventory = await this.inventoryMechanics.listInventory();

                // Add visible light sources from scene
                for (const obj of visibleObjects) {
                    if (obj.providesLight) {
                        suggestions.add(obj.name.toLowerCase());
                    }
                }

                // Add light sources from inventory
                for (const id of inventory) {
                    const obj = await this.sceneService.findObjectById(id);
                    if (obj?.providesLight) {
                        suggestions.add(obj.name.toLowerCase());
                    }
                }
            }
            // If object but no preposition, suggest on/off
            else if (!command.preposition) {
                suggestions.add('on');
                suggestions.add('off');
            }

            return Array.from(suggestions);
        } catch (error) {
            console.error('Error getting turn command suggestions:', error);
            return [];
        }
    }
}

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
 * Orchestrates between mechanics services to handle turning light sources on/off.
 * 
 * State Dependencies (via FlagMechanicsService):
 * - Light source state flags
 * - Interaction flags
 * - Object visibility flags
 * 
 * Service Dependencies:
 * - LightMechanicsService: Light source state and validation
 * - InventoryMechanicsService: Light source possession
 * - SceneMechanicsService: Object visibility and location
 * - FlagMechanicsService: State tracking
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
            if (!command.verb || !command.object) {
                return {
                    success: false,
                    message: this.gameText.get('error.turnWhat'),
                    incrementTurn: false
                };
            }

            if (!command.preposition || !['on', 'off'].includes(command.preposition)) {
                return {
                    success: false,
                    message: this.gameText.get('error.turnOnlyOnOff'),
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
            const isLightSource = this.lightMechanics.isLightSource(object.id);
            const hasTurnInteraction = object.interactions?.['turn'];

            if (!isLightSource && !hasTurnInteraction) {
                return {
                    success: false,
                    message: this.gameText.get('error.cantTurnOnOff', { object: object.name }),
                    incrementTurn: false
                };
            }

            // Check inventory for portable light sources
            if (isLightSource && object.canTake && !await this.inventoryMechanics.hasItem(object.id)) {
                return {
                    success: false,
                    message: this.gameText.get('error.needToTakeFirst', { object: object.name }),
                    incrementTurn: false
                };
            }

            const turningOn = command.preposition === 'on';

            // Handle light source state change
            if (isLightSource) {
                const lightResult = await this.lightMechanics.handleLightSource(object.id, turningOn);

                // Handle interaction flags if successful
                if (lightResult.success && object.interactions?.['turn']) {
                    const interaction = object.interactions['turn'];
                    if (interaction.grantsFlags) {
                        interaction.grantsFlags.forEach(flag => {
                            this.flagMechanics.setInteractionFlag(flag, object.id);
                        });
                    }
                }

                return {
                    success: lightResult.success,
                    message: lightResult.message || '',
                    incrementTurn: lightResult.success
                };
            }

            // Handle non-light source turn interaction
            if (hasTurnInteraction && object.interactions) {
                const interaction = object.interactions['turn'];
                
                // Check required flags
                if (interaction.requiredFlags && 
                    !this.flagMechanics.checkFlags(interaction.requiredFlags)) {
                    return {
                        success: false,
                        message: interaction.failureMessage || 
                            this.gameText.get('error.cantTurnOnOff', { object: object.name }),
                        incrementTurn: false
                    };
                }

                // Set interaction flags
                if (interaction.grantsFlags) {
                    interaction.grantsFlags.forEach(flag => {
                        this.flagMechanics.setInteractionFlag(flag, object.id);
                    });
                }

                // Handle scoring
                const score = interaction.score;
                if (typeof score === 'number' && !this.flagMechanics.isActionScored(object.id, 'turn')) {
                    await this.scoreMechanics.addScore(score);
                    this.flagMechanics.setActionScored(object.id, 'turn');
                }

                const message = interaction.message || this.gameText.get('success.turnGeneric', { object: object.name });
                return {
                    success: true,
                    message,
                    incrementTurn: true
                };
            }

            // Default case - should never reach here due to earlier validation
            return {
                success: false,
                message: this.gameText.get('error.nothingHappens', { 
                    object: object.name, 
                    action: command.preposition || 'use' 
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
    override async getSuggestions(command: GameCommand): Promise<string[]> {
        if (!command.verb || command.preposition) {
            return [];
        }

        const scene = this.sceneService.getCurrentScene();
        if (!scene || !await this.lightMechanics.isLightPresent()) {
            return [];
        }

        const visibleObjects = this.sceneService.getVisibleObjects(scene);
        
        const turnableObjects = await Promise.all(
            visibleObjects
                .filter(obj => 
                    this.lightMechanics.isLightSource(obj.id) || 
                    obj.interactions?.['turn']
                )
                .map(async obj => ({
                    object: obj,
                    visible: await this.lightMechanics.isObjectVisible(obj)
                }))
        );

        return turnableObjects
            .filter(({ visible }) => visible)
            .map(({ object }) => object.name);
    }
}

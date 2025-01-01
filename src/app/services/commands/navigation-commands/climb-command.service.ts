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
 * Service responsible for handling climb commands in the game.
 * In Zork, climbing serves two main purposes:
 * 1. Attempted climbing (like trees) that changes state and descriptions
 * 2. Scene transitions (like windows) that move the player
 * 
 * State Dependencies:
 * - Scene state for transitions
 * - Interaction flags for state tracking
 * - Light conditions for visibility
 * 
 * Service Dependencies:
 * - SceneMechanicsService: Scene transitions and visibility
 * - LightMechanicsService: Visibility checks
 * - FlagMechanicsService: State tracking
 * - ScoreMechanicsService: Scoring attempts
 * - ProgressMechanicsService: Turn tracking
 */
@Injectable({
    providedIn: 'root'
})
export class ClimbCommandService extends BaseCommandService {
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
     * Determines if this service can handle the given command
     * @param command Command to check
     * @returns True if command verb is 'climb'
     */
    canHandle(command: GameCommand): boolean {
        return command.verb === 'climb';
    }

    /**
     * Handles climb commands. In Zork this either:
     * 1. Changes state and descriptions (like trying to climb trees)
     * 2. Transitions to a new scene (like climbing through windows)
     * 
     * @param command The command to handle
     * @returns Command response with success/failure and message
     */
    async handle(command: GameCommand): Promise<CommandResponse> {
        if (!command.object) {
            return {
                success: false,
                message: this.gameText.get('error.noObject', { verb: 'climb' }),
                incrementTurn: false
            };
        }

        // Check if there's enough light to interact
        if (!await this.lightMechanics.isLightPresent()) {
            return {
                success: false,
                message: this.gameText.get('error.tooDark'),
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

        // Check if object is visible
        if (!await this.lightMechanics.isObjectVisible(object)) {
            return {
                success: false,
                message: this.gameText.get('error.objectNotVisible', { object: object.name }),
                incrementTurn: false
            };
        }

        // Check if object has climb interaction
        if (!object.interactions?.['climb']) {
            return {
                success: false,
                message: this.gameText.get('error.cannotClimb', { object: object.name }),
                incrementTurn: false
            };
        }

        const interaction = object.interactions['climb'];

        // Check required flags if any
        if (interaction.requiredFlags && 
            !this.flagMechanics.checkFlags(interaction.requiredFlags)) {
            return {
                success: false,
                message: interaction.failureMessage || 
                    this.gameText.get('error.cannotClimb', { object: object.name }),
                incrementTurn: false
            };
        }

        // Handle state flags
        if (interaction.grantsFlags) {
            interaction.grantsFlags.forEach(flag => {
                this.flagMechanics.setInteractionFlag(flag, object.id);
            });
        }

        // Handle scoring
        if (interaction.score && !this.flagMechanics.isActionScored(object.id, 'climb')) {
            await this.scoreMechanics.addScore(interaction.score);
            this.flagMechanics.setActionScored(object.id, 'climb');
        }

        // Handle scene transition if specified
        if (interaction.targetScene) {
            await this.gameState.setCurrentScene(interaction.targetScene);
        }

        // Increment turn counter
        await this.progress.incrementTurns();

        // Return interaction message
        return {
            success: true,
            message: interaction.message,
            incrementTurn: true
        };
    }

    /**
     * Get suggestions for climbable objects in the current scene
     * Only returns suggestions if there is sufficient light
     * 
     * @param command Command to get suggestions for
     * @returns Array of climbable object names
     */
    override async getSuggestions(command: GameCommand): Promise<string[]> {
        // Only provide suggestions if we have light and no object specified
        if (!command.verb || command.object || !await this.lightMechanics.isLightPresent()) {
            return [];
        }

        const scene = this.sceneService.getCurrentScene();
        if (!scene) return [];

        // Get visible objects that can be climbed
        const visibleObjects = this.sceneService.getVisibleObjects(scene);
        
        // Filter for climbable objects and check visibility
        const climbableObjects = await Promise.all(
            visibleObjects
                .filter((obj: SceneObject) => obj.interactions?.['climb'])
                .map(async (obj: SceneObject) => ({
                    object: obj,
                    visible: await this.lightMechanics.isObjectVisible(obj)
                }))
        );

        return climbableObjects
            .filter(({ visible }) => visible)
            .map(({ object }) => object.name);
    }
}

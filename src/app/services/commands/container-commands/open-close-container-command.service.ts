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
import { ContainerSuggestionService } from '../../mechanics/container-suggestion.service';

/**
 * Service responsible for handling open and close commands for containers and exits.
 * 
 * Command Pattern:
 * - Handles 'open' and 'close' verbs
 * - Validates command context and object accessibility
 * - Orchestrates between scene, container, and scoring mechanics
 * 
 * State Dependencies (via FlagMechanicsService):
 * - [containerId]_open: Container open/closed state
 * - [containerId]_locked: Container lock state
 * - [containerId]_[action]_scored: Scoring state for container actions
 * - [exitId]_open: Exit open/closed state
 * 
 * Service Dependencies:
 * - FlagMechanicsService: State management
 * - SceneMechanicsService: Scene and exit operations
 * - ContainerMechanicsService: Container operations
 * - LightMechanicsService: Visibility checks
 * - ScoreMechanicsService: Action scoring
 * - ProgressMechanicsService: Turn tracking
 * - GameTextService: Error and success messages
 * 
 * Error Handling:
 * - Validates light presence
 * - Checks object visibility and accessibility
 * - Verifies container state (locked/unlocked)
 * - Maintains state consistency on failure
 * 
 * @implements {BaseCommandService}
 */
@Injectable({
    providedIn: 'root'
})
export class OpenCloseContainerCommandService extends BaseCommandService {
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
     * Determines if this service can handle the given command.
     * 
     * @param command - The command to check
     * @returns True if command verb is 'open', 'close', or 'shut'
     */
    override canHandle(command: GameCommand): boolean {
        return command.verb === 'open' || command.verb === 'close' || command.verb === 'shut';
    }

    /**
     * Handles open and close commands for containers and exits.
     * 
     * Command Flow:
     * 1. Validates command format and light presence
     * 2. Attempts to handle as exit command
     * 3. If not exit, attempts to handle as container command
     * 4. Validates object visibility and accessibility
     * 5. Processes any special interactions
     * 6. Updates container state
     * 7. Handles scoring and progress
     * 
     * State Effects:
     * - May update container open state
     * - May update scoring state
     * - Increments turn counter on success
     * 
     * Error Conditions:
     * - No object specified
     * - Insufficient light
     * - Object not found
     * - Object not visible
     * - Object not container
     * - Container locked
     * - Required flags not met
     * 
     * @param command - The command to handle
     * @returns CommandResponse indicating success/failure and appropriate message
     */
    async handle(command: GameCommand): Promise<CommandResponse> {
        if (!command.object) {
            return {
                success: false,
                message: this.gameText.get('error.noObject', { action: command.verb }),
                incrementTurn: false
            };
        }

        const isOpenCommand = command.verb === 'open';
        const action = isOpenCommand ? 'open' : 'close';

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
      
        // If no interaction and not a container, return error
        if (!object.isContainer) {
            return {
                success: false,
                message: this.gameText.get('error.notContainer', { item: object.name }),
                incrementTurn: false
            };
        }

        // Check if container is locked
        if (await this.containerMechanics.isLocked(object.id)) {
            return {
                success: false,
                message: this.gameText.get('error.containerLocked', { container: object.name }),
                incrementTurn: false
            };
        }

        // Handle container state change
        const result = isOpenCommand ? 
            await this.containerMechanics.openContainer(object.id) :
            await this.containerMechanics.closeContainer(object.id);

        if (result.success) {
            // Handle scoring through ScoreMechanicsService
            await this.scoreMechanics.handleObjectScoring({
                object,
                action,
                skipGeneralRules: false
            });
            
            // Update progress
            this.progress.incrementTurns();
        }

        return {
            success: result.success,
            message: result.message || this.gameText.get(result.success ? 'success.action' : 'error.action', 
                { action, item: object.name }),
            incrementTurn: result.success
        };
    }

    /**
     * Provides suggestions for open/close commands based on visible containers and objects.
     * 
     * Suggestion Logic:
     * 1. Checks command verb validity
     * 2. Validates light presence
     * 3. Gets suggestions from ContainerSuggestionService
     * 4. Formats suggestions with appropriate verb
     * 
     * State Dependencies:
     * - Light state via LightMechanicsService
     * - Container state via ContainerMechanicsService
     * - Scene state via SceneMechanicsService
     * 
     * @param command - Partial command to generate suggestions for
     * @returns Array of command suggestions
     */
    override async getSuggestions(command: GameCommand): Promise<string[]> {
        if (!command.verb || !['open', 'close', 'shut'].includes(command.verb)) {
            return [];
        }

        // Check if there's enough light to interact
        if (!await this.lightMechanics.isLightPresent()) {
            return [];
        }

        // Get container suggestions from the dedicated service
        const containerNames = await this.containerSuggestions.getContainerSuggestions(command);
        
        // Format suggestions with the appropriate verb
        return containerNames.map(name => `${command.verb} ${name.toLowerCase()}`);
    }
}

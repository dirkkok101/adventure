import { Injectable } from '@angular/core';
import { GameStateService } from '../../game-state.service';
import { SceneMechanicsService } from '../../mechanics/scene-mechanics.service';
import { FlagMechanicsService } from '../../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../../mechanics/progress-mechanics.service';
import { LightMechanicsService } from '../../mechanics/light-mechanics.service';
import { InventoryMechanicsService } from '../../mechanics/inventory-mechanics.service';
import { ScoreMechanicsService } from '../../mechanics/score-mechanics.service';
import { ContainerMechanicsService } from '../../mechanics/container-mechanics.service';
import { MoveObjectMechanicsService } from '../../mechanics/move-object-mechanics.service';
import { BaseCommandService } from '../bases/base-command.service';
import { GameCommand, CommandResponse } from '../../../models';
import { GameTextService } from '../../game-text.service';

/**
 * Command service for handling object movement commands.
 * Orchestrates object movement through MoveObjectMechanicsService.
 * 
 * Key Responsibilities:
 * - Parse and validate move commands
 * - Coordinate between mechanics services
 * - Handle command suggestions
 * 
 * State Dependencies (via mechanics services):
 * - Object location state (via FlagMechanics)
 * - Light state (via LightMechanics)
 * - Movement state (via MoveObjectMechanics)
 * - Progress state (via ProgressMechanics)
 * 
 * Service Dependencies:
 * - MoveObjectMechanicsService: Object movement logic
 * - SceneMechanicsService: Scene and object access
 * - ProgressMechanicsService: Turn tracking
 * - GameTextService: Error messages
 * 
 * Command Format:
 * - "move [object]"
 * - Handles moving objects within current scene
 * 
 * Error Handling:
 * - Validates command format
 * - Validates object existence
 * - Propagates movement errors
 * - Provides specific error messages
 * 
 * State Management:
 * - All state changes through mechanics services
 * - Maintains consistency on errors
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
        private moveObjectMechanics: MoveObjectMechanicsService,
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
     * @returns True if command is a valid move command
     */
    override canHandle(command: GameCommand): boolean {
        return command.verb === 'move';
    }

    /**
     * Handles the move command execution
     * @param command Command to execute
     * @returns Response indicating success/failure and appropriate message
     * 
     * State Dependencies (all read-only):
     * - Object visibility via LightMechanicsService
     * - Movement state via MoveObjectMechanicsService
     * 
     * Error Conditions:
     * - No object specified
     * - Object not found
     * - Object not moveable
     * - Object not visible
     * 
     * @throws None - Errors are returned in CommandResponse
     */
    override async handle(command: GameCommand): Promise<CommandResponse> {
        try {
            if (!command.object) {
                return {
                    success: false,
                    message: this.gameText.get('error.noObject', { action: 'move' }),
                    incrementTurn: false
                };
            }

            // Find object through SceneMechanics
            const object = await this.sceneService.findObject(command.object);
            if (!object) {
                return {
                    success: false,
                    message: this.gameText.get('error.objectNotFound', { item: command.object }),
                    incrementTurn: false
                };
            }

            // Delegate movement to MoveObjectMechanics
            const moveResult = await this.moveObjectMechanics.moveObject(object);
            
            // Update progress if successful
            if (moveResult.success) {
                await this.progress.handleActionComplete();
            }

            return moveResult;
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
     * Gets command suggestions based on current state
     * @param command Partial command to get suggestions for
     * @returns Array of suggested command completions
     * 
     * State Dependencies (all read-only):
     * - Scene state via SceneMechanicsService
     * - Light state via LightMechanicsService
     * - Movement state via MoveObjectMechanicsService
     */
    override async getSuggestions(command: GameCommand): Promise<string[]> {
        try {
            if (!command.verb) {
                return ['move'];
            }

            if (command.verb === 'move' && !command.object) {
                return await this.moveObjectMechanics.getMoveableObjects();
            }

            return [];
        } catch (error) {
            console.error('Error getting move command suggestions:', error);
            return [];
        }
    }
}

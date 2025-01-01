import { Injectable } from '@angular/core';
import { FlagMechanicsService } from './flag-mechanics.service';
import { LightMechanicsService } from './light-mechanics.service';
import { SceneMechanicsService } from './scene-mechanics.service';
import { ScoreMechanicsService } from './score-mechanics.service';
import { GameTextService } from '../game-text.service';
import { CommandResponse, SceneObject } from '../../models';
import { ScoringOptions } from '../../models/scoring/scoring-options.interface';

/**
 * Service responsible for managing object movement mechanics.
 * 
 * Responsibilities:
 * - Validates object movement conditions
 * - Manages object movement state
 * - Handles movement-related scoring
 * - Processes movement behaviors
 * 
 * State Dependencies (via FlagMechanicsService):
 * - [objectId]_moved: Tracks if an object has been moved
 * - [objectId]_moveable: Object's ability to be moved
 * - [objectId]_score: Movement scoring state
 * - [objectId]_visible: Object visibility state
 * - [sceneId]_light: Scene lighting state
 * 
 * Service Dependencies:
 * - FlagMechanicsService: State management and flag tracking
 *   - Manages all object state flags
 *   - Provides state queries and updates
 * - LightMechanicsService: Visibility checks
 *   - Determines if objects are visible
 * - SceneMechanicsService: Scene and object access
 *   - Provides scene and object data
 * - ScoreMechanicsService: Movement-related scoring
 *   - Handles score updates
 * - GameTextService: Error messages
 *   - Provides localized text
 * 
 * Error Handling:
 * - Invalid object reference: Returns error before state checks
 * - Object not visible: Checked via LightMechanicsService
 * - Object not moveable: Checked via FlagMechanicsService
 * - State update failures: Returns error
 * 
 * State Management:
 * - All state changes delegated to FlagMechanicsService
 * - Consistent state verification after changes
 * - State dependencies documented per method
 */
@Injectable({
    providedIn: 'root'
})
export class MoveObjectMechanicsService {
    constructor(
        private flagMechanics: FlagMechanicsService,
        private lightMechanics: LightMechanicsService,
        private sceneService: SceneMechanicsService,
        private scoreMechanics: ScoreMechanicsService,
        private gameText: GameTextService
    ) {}

    /**
     * Check if an object can be moved
     * @param object Object to check
     * @returns CommandResponse indicating if movement is possible
     * 
     * State Dependencies:
     * - [objectId]_visible via LightMechanicsService
     * - [objectId]_moveable via FlagMechanicsService
     * - [sceneId]_light via LightMechanicsService
     * 
     * Error Conditions:
     * - object is null/undefined: Returns error
     * - object not visible: Returns error with visibility message
     * - object not moveable: Returns error with moveability message
     * 
     * @throws None - All errors returned in CommandResponse
     */
    async canMoveObject(object: SceneObject): Promise<CommandResponse> {
        // Validate input
        if (!object?.id) {
            return {
                success: false,
                message: this.gameText.get('error.invalidObject'),
                incrementTurn: false
            };
        }

        // Check visibility through LightMechanicsService
        if (!await this.lightMechanics.isObjectVisible(object)) {
            return {
                success: false,
                message: this.gameText.get('error.tooDark', { action: 'move' }),
                incrementTurn: false
            };
        }

        // Check moveability through FlagMechanicsService
        if (!await this.flagMechanics.isObjectMoveable(object.id)) {
            return {
                success: false,
                message: this.gameText.get('error.cantMove', { object: object.name }),
                incrementTurn: false
            };
        }

        return {
            success: true,
            message: '',
            incrementTurn: false
        };
    }

    /**
     * Move an object within its current scene
     * @param object Object to move
     * @returns CommandResponse with movement result
     * 
     * State Dependencies:
     * - All dependencies from canMoveObject
     * - [objectId]_moved via FlagMechanicsService
     * - Score state via ScoreMechanicsService
     * 
     * State Effects:
     * - Sets [objectId]_moved flag
     * - Updates score if applicable
     * 
     * Error Conditions:
     * - All conditions from canMoveObject
     * - State update failure: Returns error
     * 
     * @throws None - All errors returned in CommandResponse
     */
    async moveObject(object: SceneObject): Promise<CommandResponse> {
        // Validate movement
        const canMove = await this.canMoveObject(object);
        if (!canMove.success) {
            return canMove;
        }

        try {
            // Set movement flag
            await this.flagMechanics.setObjectMoved(object.id);

            // Handle scoring
            try {
                await this.scoreMechanics.handleObjectScoring({
                    action: 'use',
                    object,
                    skipGeneralRules: false
                });
            } catch (error) {
                console.error('Error handling scoring:', error);
                // Continue with movement even if scoring fails
            }

            // Verify state consistency
            const stateVerified = await this.verifyMovementState(object);
            if (!stateVerified) {
                return {
                    success: false,
                    message: this.gameText.get('error.stateUpdateFailed'),
                    incrementTurn: false
                };
            }

            // Return custom message if defined, otherwise default
            return {
                success: true,
                message: object.onMove || this.gameText.get('success.moveObject', { object: object.name }),
                incrementTurn: true
            };
        } catch (error) {
            console.error('Error in moveObject:', error);
            return {
                success: false,
                message: this.gameText.get('error.general'),
                incrementTurn: false
            };
        }
    }

    /**
     * Verify the consistency of movement-related state
     * @param object Object to verify
     * @returns true if state is consistent
     * 
     * State Dependencies:
     * - [objectId]_moved via FlagMechanicsService
     * 
     * @throws None
     */
    private async verifyMovementState(object: SceneObject): Promise<boolean> {
        try {
            // Verify movement flag was set
            const moved = await this.flagMechanics.isObjectMoved(object.id);
            if (!moved) return false;

            return true;
        } catch (error) {
            console.error('Error verifying movement state:', error);
            return false;
        }
    }

    /**
     * Get list of moveable objects in current scene
     * @returns Array of object names that can be moved
     * 
     * State Dependencies:
     * - [sceneId]_current via SceneMechanicsService
     * - [objectId]_visible via LightMechanicsService
     * - [objectId]_moveable via FlagMechanicsService
     * 
     * Error Conditions:
     * - Scene not found: Returns empty array
     * - No visible objects: Returns empty array
     * 
     * @throws None - Returns empty array on error
     */
    async getMoveableObjects(): Promise<string[]> {
        try {
            const scene = await this.sceneService.getCurrentScene();
            if (!scene?.objects) return [];

            const suggestions = new Set<string>();
            const visibleObjects = await this.sceneService.getVisibleObjects(scene);

            for (const obj of visibleObjects) {
                if (await this.flagMechanics.isObjectMoveable(obj.id) && 
                    await this.lightMechanics.isObjectVisible(obj)) {
                    suggestions.add(obj.name.toLowerCase());
                }
            }

            return Array.from(suggestions);
        } catch (error) {
            console.error('Error getting moveable objects:', error);
            return [];
        }
    }
}

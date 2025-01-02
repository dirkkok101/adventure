import {Injectable} from '@angular/core';
import {LightMechanicsService} from './light-mechanics.service';
import {SceneMechanicsService} from './scene-mechanics.service';
import {ScoreMechanicsService} from './score-mechanics.service';
import {GameTextService} from '../game-text.service';
import {CommandResponse, SceneObject} from '../../models';
import {MechanicsBaseService} from './mechanics-base.service';
import {GameStateService} from '../game-state.service';
import {ExaminationMechanicsService} from './examination-mechanics.service';

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
export class MoveObjectMechanicsService extends MechanicsBaseService {
    constructor(
        private lightMechanicsService: LightMechanicsService,
        private sceneMechanicsService: SceneMechanicsService,
        private scoreMechanicsService: ScoreMechanicsService,
        private gameTextService: GameTextService,
        private examinationMechanicsService: ExaminationMechanicsService,
        gameStateService: GameStateService
    ) {
      super(gameStateService)
    }

  /**
   * Set whether an object is moveable
   * @param objectId ID of object to update
   * @param moveable Whether the object can be moved
   */
  private setObjectMoveable(objectId: string, moveable: boolean): void {
    const flag = 'moveable';
    if (moveable) {
      this.setFlag(`${objectId}_${flag}`);
    } else {
      this.removeFlag(`${objectId}_${flag}`);
    }
  }

  /**
   * Check if an object is moveable
   * @param objectId ID of object to check
   * @returns Whether the object can be moved
   */
  private isObjectMoveable(objectId: string): boolean {
    return this.hasObjectFlag(objectId, 'moveable');
  }

  /**
   * Set whether an object has been moved
   * @param objectId ID of object to update
   * @param moved Whether the object has been moved
   */
  private setObjectMoved(objectId: string, moved: boolean = true): void {
    const flag = 'moved';
    if (moved) {
      this.setFlag(`${objectId}_${flag}`);
    } else {
      this.removeFlag(`${objectId}_${flag}`);
    }
  }



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
    canMoveObject(object: SceneObject): CommandResponse {
        // Validate input
        if (!object?.id) {
            return {
                success: false,
                message: this.gameTextService.get('error.invalidObject'),
                incrementTurn: false
            };
        }

        // Check visibility through LightMechanicsService
        if (!this.lightMechanicsService.isObjectVisible(object)) {
            return {
                success: false,
                message: this.gameTextService.get('error.tooDark', { action: 'move' }),
                incrementTurn: false
            };
        }

        // Check moveability through FlagMechanicsService
        if (!this.isObjectMoveable(object.id)) {
            return {
                success: false,
                message: this.gameTextService.get('error.cantMove', { object: object.name }),
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
    moveObject(object: SceneObject): CommandResponse {
        // Validate movement
        const canMove = this.canMoveObject(object);
        if (!canMove.success) {
            return canMove;
        }


            // Set movement flag
            this.setObjectMoved(object.id);



            // Return custom message if defined, otherwise default
            return {
                success: true,
                message: object.onMove || this.gameTextService.get('success.moveObject', { object: object.name }),
                incrementTurn: true
            };

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
    getMoveableObjects(): string[] {
        try {
            const scene = this.sceneMechanicsService.getCurrentScene();
            if (!scene?.objects) return [];

            const suggestions = new Set<string>();
            const visibleObjects = this.examinationMechanicsService.getExaminableObjects();

            for (const obj of visibleObjects) {
                if (this.isObjectMoveable(obj.id) &&
                    this.lightMechanicsService.isObjectVisible(obj)) {
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

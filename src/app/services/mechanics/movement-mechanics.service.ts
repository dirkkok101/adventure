import {Injectable} from '@angular/core';
import {LightMechanicsService} from './light-mechanics.service';
import {SceneMechanicsService} from './scene-mechanics.service';
import {ScoreMechanicsService} from './score-mechanics.service';
import {GameTextService} from '../game-text.service';
import {CommandResponse, Scene, SceneExit, SceneObject} from '../../models';
import {GameStateService} from '../game-state.service';
import {MechanicsBaseService} from './mechanics-base.service';

/**
 * Service responsible for managing movement mechanics and scene transitions.
 *
 * Responsibilities:
 * - Manages movement between scenes
 * - Validates movement conditions and requirements
 * - Handles movement-related scoring
 * - Tracks movement history and state
 * - Delegates state changes to FlagMechanicsService
 *
 * State Dependencies (via FlagMechanicsService):
 * - [exitId]_used: Tracks if an exit has been used
 * - [exitId]_score: Tracks if movement score has been awarded
 * - [sceneId]_visited: Scene visit tracking
 * - Required flags specified in exit configurations
 *
 * Service Dependencies:
 * - FlagMechanicsService: State management and flag tracking
 * - LightMechanicsService: Visibility checks for movement
 * - SceneMechanicsService: Scene transitions and access
 * - ScoreMechanicsService: Movement-related scoring
 * - GameTextService: Localized text and messages
 * - GameStateService: Scene state management
 *
 * Error Handling:
 * - Validates movement preconditions (light, flags)
 * - Validates exit existence and accessibility
 * - Provides descriptive error messages for all failure cases
 * - Maintains consistent state on error
 *
 * State Management:
 * - All state changes delegated to FlagMechanicsService
 * - Atomic state updates for movement operations
 * - Consistent state verification after changes
 * - Movement history tracking
 */
@Injectable({
  providedIn: 'root'
})
export class MovementMechanicsService extends MechanicsBaseService {
  constructor(
    private lightMechanicsService: LightMechanicsService,
    private sceneMechanicsService: SceneMechanicsService,
    private scoreMechanicsService: ScoreMechanicsService,
    private gameTextService: GameTextService,
    gameStateService: GameStateService
  ) {
    super(gameStateService)
  }

  /**
   * Validate if movement in a direction is possible
   * @param scene
   * @param direction Direction to validate
   * @returns CommandResponse indicating if movement is possible
   *
   * State Dependencies:
   * - Light state
   * - Exit requirements
   */
  validateMovement(scene: Scene, direction: string): CommandResponse {
    if (!scene || scene.objects === undefined) {
      throw new Error('Invalid scene object');
    }

    // Check light
    if (!this.lightMechanicsService.isLightPresent(scene)) {
      return {
        success: false,
        message: this.gameTextService.get('error.tooDarkMove'),
        incrementTurn: false
      };
    }

    // Find exit
    const exit = scene.exits?.find(e => e.direction.toLowerCase() === direction.toLowerCase());
    if (!exit) {
      return {
        success: false,
        message: this.gameTextService.get('error.noExit'),
        incrementTurn: false
      };
    }

    // Check requirements
    if (exit.requiredFlags && !this.checkFlags(exit.requiredFlags)) {
      return {
        success: false,
        message: exit.failureMessage || this.gameTextService.get('error.exitBlocked'),
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
   * Handle movement in a direction
   * @param scene
   * @param exit
   * @returns CommandResponse with result of movement
   *
   * State Effects:
   * - May update score
   * - Updates current scene
   * - Sets exit used flag
   */
  moveToExit(scene: Scene, exit: SceneExit): CommandResponse {
    if (!scene || scene.objects === undefined) {
      throw new Error('Invalid scene object');
    }

    const isExit = this.isExit(scene, exit.direction);
    if (!isExit) {
      return {
        success: false,
        message: this.gameTextService.get('error.noExit'),
        incrementTurn: false
      };
    }

    if (!exit.isOpen) {
      return {
        success: false,
        message: this.gameTextService.get('error.blocked'),
        incrementTurn: false
      };
    }

    const newScene = this.sceneMechanicsService.getScene(exit.targetScene);
    if (!newScene) {
      return {
        success: false,
        message: this.gameTextService.get('error.targetSceneNotFound'),
        incrementTurn: true
      };
    }

    // Move to new scene
    this.gameStateService.setCurrentScene(exit.targetScene);

    // Handle scoring
    this.handleMovementScoring(exit);

    // Track exit usage
    this.setExitUsed(exit.targetScene);

    return {
      success: true,
      message: this.sceneMechanicsService.getSceneDescription(newScene),
      incrementTurn: true
    };
  }

  /**
   * Get available exits in a scene
   * Filters exits based on required flags and conditions
   *
   * @returns Array of available exits
   * @throws Error if scene is invalid or exit check fails
   */
  getAvailableExits(scene: Scene): SceneExit[] {
    if (!scene || scene.objects === undefined) {
      throw new Error('Invalid scene object');
    }

    if (!this.lightMechanicsService.isLightPresent(scene)) {
      return [];
    }

    if (!scene?.exits) {
      return [];
    }

    return scene.exits.filter(exit => {
      // Skip exits that aren't valid
      if (this.isExit(scene, exit.direction)) {
        return false;
      }

      // Skip exits that require light if there's no light
      return !(exit.requiresLight && !this.lightMechanicsService.hasGlobalLight());


    });

  }

  getExit(scene: Scene, direction: string): SceneExit | null {
    if (!scene || scene.exits === undefined) {
      throw new Error('Invalid scene object');
    }

    const exit = scene.exits.find(exit =>
      exit.direction.toLowerCase() == direction.toLowerCase()
      || exit.description.toLowerCase() == direction.toLowerCase());

    if (!exit) {
      return null;
    }

    if (!this.isExit(scene, exit.direction)) {
      return null;
    }

    return exit;
  }

  isExit(scene: Scene, direction: string): boolean {
    if (!scene?.exits) {
      return false;
    }

    const exit = scene.exits.find(exit =>
      exit.direction.toLowerCase() == direction.toLowerCase()
      || exit.description.toLowerCase() == direction.toLowerCase());

    if (!exit) {
      return false;
    }

    // Check if all required flags are set
    if (exit.requiredFlags) {
      return this.checkFlags(exit.requiredFlags);
    }

    return true;

  }

  /**
   * Handle scoring for movement through an exit
   * @param exit Exit being used
   *
   * State Effects:
   * - May update score
   * - Sets exit scored flag
   */
  private handleMovementScoring(exit: SceneExit): void {
    if (!exit.score || this.isExitScored(exit.targetScene)) {
      return;
    }

    this.scoreMechanicsService.addScore(exit.score);
    this.setExitScored(exit.targetScene);
  }

  /**
   * Mark an exit as used
   * @param exitId ID of the exit used
   * @param used Whether the exit has been used
   */
  setExitUsed(exitId: string, used: boolean = true): void {
    const flag = `${exitId}_used`;
    if (used) {
      this.setFlag(flag);
    } else {
      this.removeFlag(flag);
    }
  }

  /**
   * Check if an exit has been used
   * @param exitId ID of exit to check
   * @returns Whether the exit has been used
   */
  isExitUsed(exitId: string): boolean {
    return this.hasFlag(`${exitId}_used`);
  }

  /**
   * Mark an exit's movement as scored
   * @param exitId ID of exit used
   * @param scored Whether the movement has been scored
   */
  setExitScored(exitId: string, scored: boolean = true): void {
    const flag = `${exitId}_score`;
    if (scored) {
      this.setFlag(flag);
    } else {
      this.removeFlag(flag);
    }
  }

  /**
   * Check if an exit's movement has been scored
   * @param exitId ID of exit to check
   * @returns Whether the movement has been scored
   */
  isExitScored(exitId: string): boolean {
    return this.hasFlag(`${exitId}_score`);
  }

  /**
   * Set whether an exit is open
   * @param exitId ID of exit to update
   * @param isOpen Whether the exit should be open
   */
  setExitOpen(exitId: string, isOpen: boolean): void {
    const flag = `${exitId}_open`;
    if (isOpen) {
      this.setFlag(flag);
    } else {
      this.removeFlag(flag);
    }
  }

  /**
   * Check if an exit is open
   * @param exitId ID of exit to check
   * @returns Whether the exit is open
   */
  isExitOpen(exitId: string): boolean {
    return this.hasFlag(`${exitId}_open`);
  }

  /**
   * Set whether an exit is locked
   * @param exitId ID of exit to update
   * @param isLocked Whether the exit should be locked
   */
  setExitLocked(exitId: string, isLocked: boolean): void {
    const flag = `${exitId}_locked`;
    if (isLocked) {
      this.setFlag(flag);
    } else {
      this.removeFlag(flag);
    }
  }

  /**
   * Check if an exit is locked
   * @param exitId ID of exit to check
   * @returns Whether the exit is locked
   */
  isExitLocked(exitId: string): boolean {
    return this.hasFlag(`${exitId}_locked`);
  }

  /**
   * Check if an exit can be opened/closed
   * @param exitId ID of exit to check
   * @returns Whether the exit is openable
   */
  isExitOpenable(exitId: string): boolean {
    return this.hasFlag(`${exitId}_openable`);
  }

  /**
   * Set whether an exit can be opened/closed
   * @param exitId ID of exit to update
   * @param openable Whether the exit can be opened/closed
   */
  private setExitOpenable(exitId: string, openable: boolean): void {
    const flag = `${exitId}_openable`;
    if (openable) {
      this.setFlag(flag);
    } else {
      this.removeFlag(flag);
    }
  }

}

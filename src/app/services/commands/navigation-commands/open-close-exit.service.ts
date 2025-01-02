import {Injectable} from '@angular/core';
import {BaseCommandService} from '../base-command.service';
import {GameStateService} from '../../game-state.service';
import {SceneMechanicsService} from '../../mechanics/scene-mechanics.service';
import {ProgressMechanicsService} from '../../mechanics/progress-mechanics.service';
import {LightMechanicsService} from '../../mechanics/light-mechanics.service';
import {ContainerMechanicsService} from '../../mechanics/container-mechanics.service';
import {InventoryMechanicsService} from '../../mechanics/inventory-mechanics.service';
import {ScoreMechanicsService} from '../../mechanics/score-mechanics.service';
import {CommandResponse, GameCommand} from '../../../models';
import {GameTextService} from '../../game-text.service';
import {MovementMechanicsService} from '../../mechanics/movement-mechanics.service';

/**
 * Service responsible for handling commands related to opening and closing exits (doors, gates, etc.) in scenes.
 *
 * State Dependencies (via FlagMechanicsService):
 * - Exit open/closed states ([direction]_open)
 * - Exit locked states ([direction]_locked)
 * - Exit openable states ([direction]_openable)
 * - Scene visibility and light conditions
 *
 * Error Conditions:
 * - No object specified in command
 * - Scene too dark to interact
 * - Exit not found in current scene
 * - Exit cannot be operated (locked, not openable, etc.)
 * - Exit requires light but scene is dark
 *
 * @implements {BaseCommandService}
 */
@Injectable({
  providedIn: 'root'
})
export class OpenCloseExitCommandService extends BaseCommandService {
  constructor(
    gameStateService: GameStateService,
    sceneMechanicsService: SceneMechanicsService,
    progressMechanicsService: ProgressMechanicsService,
    lightMechanicsService: LightMechanicsService,
    inventoryMechanicsService: InventoryMechanicsService,
    scoreMechanicsService: ScoreMechanicsService,
    containerMechanicsService: ContainerMechanicsService,
    private gameTextService: GameTextService,
    private movementMechanicsService: MovementMechanicsService,
  ) {
    super(
      gameStateService,
      sceneMechanicsService,
      progressMechanicsService,
      lightMechanicsService,
      inventoryMechanicsService,
      scoreMechanicsService,
      containerMechanicsService
    );
  }

  /**
   * Determines if this service can handle the given command
   * @param command The command to check
   * @returns True if the command is an open/close command
   */
  canHandle(command: GameCommand): boolean {
    return command.verb === 'open' || command.verb === 'close';
  }

  /**
   * Handles open/close commands for exits by orchestrating between services
   *
   * State Effects:
   * - Updates exit open/closed state through FlagMechanicsService
   * - Updates score if action is successful
   * - Increments turn counter on success
   *
   * Error Conditions:
   * - Returns error if no object specified
   * - Returns error if scene is too dark
   * - Returns error if exit not found
   * - Returns error if exit cannot be operated
   * - Returns error if exit is locked
   * - Returns error if exit is not openable
   * - Returns error if exit requires light but scene is dark
   *
   * @param command The command to handle
   * @returns Command response with success/failure and message
   */
  handle(command: GameCommand): CommandResponse {
    if (!command.object) {
      return {
        success: false,
        message: this.gameTextService.get('error.noObject', {action: command.verb}),
        incrementTurn: false
      };
    }

    // Check if there's enough light to interact
    if (!this.lightMechanicsService.isLightPresent()) {
      return {
        success: false,
        message: this.gameTextService.get('error.tooDark'),
        incrementTurn: false
      };
    }

    // Find and validate object
    const object = this.sceneMechanicsService.findObject(command.object);
    if (!object) {
      return {
        success: false,
        message: this.gameTextService.get('error.objectNotFound', {object: command.object}),
        incrementTurn: false
      };
    }

    // Get the current scene and available exits
    const scene = this.sceneMechanicsService.getCurrentScene();
    if (!scene) {
      return {
        success: false,
        message: this.gameTextService.get('error.noScene', {action: command.verb}),
        incrementTurn: false
      };
    }

    // Get available exits (this filters based on light and required flags)
    const availableExits = this.movementMechanicsService.getAvailableExits();

    // Try to find the exit among available exits
    const exit = availableExits.find(e =>
      e.direction.toLowerCase() === command.object?.toLowerCase() ||
      e.description.toLowerCase().includes(command.object?.toLowerCase() || '')
    );

    if (!exit) {
      return {
        success: false,
        message: this.gameTextService.get('movement.noExit', {item: command.object}),
        incrementTurn: false
      };
    }

    // Check if exit requires light specifically
    if (exit.requiresLight) {
      return {
        success: false,
        message: this.gameTextService.get('movement.exitNotVisible', {exit: exit.direction}),
        incrementTurn: false
      };
    }

    // Check if exit is openable
    if (!exit.isOpenable || !this.movementMechanicsService.isExitOpenable(exit.direction)) {
      return {
        success: false,
        message: this.gameTextService.get('movement.exitNotOpenable', {exit: exit.direction, action: command.verb}),
        incrementTurn: false
      };
    }

    // Check if exit is locked
    if (this.movementMechanicsService.isExitLocked(exit.direction)) {
      return {
        success: false,
        message: this.gameTextService.get('movement.exitLocked', {exit: exit.direction}),
        incrementTurn: false
      };
    }

    const isOpening = command.verb === 'open';
    const currentlyOpen = this.movementMechanicsService.isExitOpen(exit.direction);

    // Check if already in desired state
    if (isOpening === currentlyOpen) {
      return {
        success: false,
        message: this.gameTextService.get('movement.exitAlreadyInState', {
          exit: exit.direction,
          action: isOpening ? 'open' : 'closed'
        }),
        incrementTurn: false
      };
    }

    // Update exit state
    this.movementMechanicsService.setExitOpen(exit.direction, isOpening);

    // Handle scoring
    this.scoreMechanicsService.handleObjectScoring({
      action: command.verb,
      object,
      skipGeneralRules: false
    });

    return {
      success: true,
      message: this.gameTextService.get('movement.exitStateChanged', {exit: exit.direction, action: command.verb}),
      incrementTurn: true
    };
  }

  /**
   * Get suggestions for openable/closeable exits
   * Only returns suggestions if there is sufficient light
   *
   * @param command Command to get suggestions for
   * @returns Array of openable/closeable exit names
   */
  override getSuggestions(command: GameCommand): string[] {
    // Only provide suggestions if we have light and no object specified
    if (!command.verb || command.object || !this.lightMechanicsService.isLightPresent()) {
      return [];
    }

    // Get available exits and filter for openable ones
    const availableExits = this.movementMechanicsService.getAvailableExits();
    return availableExits
      .filter(exit => exit.isOpenable)
      .map(exit => exit.direction);
  }
}

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
import {ObjectMechanicsService} from '../../mechanics/object-mechanics.service';
import {ExaminationMechanicsService} from '../../mechanics/examination-mechanics.service';

/**
 * Service responsible for handling commands related to opening exits (doors, gates, etc.) in scenes.
 *
 * State Dependencies (via FlagMechanicsService):
 * - Exit open states ([direction]_open)
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
export class OpenExitCommandService extends BaseCommandService {
  /**
   * Primary verbs for command
   */
  readonly verbs = ['open'] as const;
  /**
   * Verb aliases mapping
   */
  protected override readonly verbAliases: { [key: string]: string } = {
    'o': 'open'
  };

  constructor(
    gameStateService: GameStateService,
    sceneMechanicsService: SceneMechanicsService,
    progressMechanicsService: ProgressMechanicsService,
    lightMechanicsService: LightMechanicsService,
    inventoryMechanicsService: InventoryMechanicsService,
    containerMechanicsService: ContainerMechanicsService,
    scoreMechanicsService: ScoreMechanicsService,
    objectMechanicsService: ObjectMechanicsService,
    examinationMechanicsService: ExaminationMechanicsService,
    gameTextService: GameTextService,
    private movementMechanicsService: MovementMechanicsService,
  ) {
    super(
      gameStateService,
      sceneMechanicsService,
      progressMechanicsService,
      lightMechanicsService,
      inventoryMechanicsService,
      scoreMechanicsService,
      containerMechanicsService,
      objectMechanicsService,
      examinationMechanicsService,
      gameTextService
    );
  }

  /**
   * Handles open commands for exits by orchestrating between services
   *
   * State Effects:
   * - Updates exit open state
   *
   * Error Conditions:
   * - Returns error if scene is too dark
   * - Returns error if exit not found
   * - Returns error if exit cannot be operated
   * - Returns error if exit is locked
   * - Returns error if exit is not openable
   *
   * @param command The command to handle
   * @returns Command response with success/failure and message
   */
  handle(command: GameCommand): CommandResponse {
    // Validate command format
    if (!command.object) {
      return {
        success: false,
        message: this.gameTextService.get('error.noObject', {
          action: this.getPrimaryVerb(command.verb)
        }),
        incrementTurn: false
      };
    }

    // Get current scene
    const scene = this.sceneMechanicsService.getCurrentScene();
    if (!scene) {
      return {
        success: false,
        message: this.gameTextService.get('error.noScene'),
        incrementTurn: false
      };
    }

    // Check light
    if (!this.lightMechanicsService.isLightPresent(scene)) {
      return {
        success: false,
        message: this.gameTextService.get('error.tooDark', {action: command.verb}),
        incrementTurn: false
      };
    }

    const exit = this.movementMechanicsService.getExit(scene, command.object);

    if (!exit) {
      return {
        success: false,
        message: this.gameTextService.get('movement.noExit', {item: command.object}),
        incrementTurn: false
      };
    }

    // Check if exit is openable
    if (!this.movementMechanicsService.isExitOpenable(exit.direction)) {
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

    const currentlyOpen = this.movementMechanicsService.isExitOpen(exit.direction);

    // Check if already in desired state
    if (currentlyOpen) {
      return {
        success: false,
        message: this.gameTextService.get('movement.exitAlreadyInState', {
          exit: exit.direction,
          action: command.verb
        }),
        incrementTurn: false
      };
    }

    // Update exit state
    this.movementMechanicsService.setExitOpen(exit.direction, true);

    return {
      success: true,
      message: this.gameTextService.get('movement.exitStateChanged', {exit: exit.direction, action: command.verb}),
      incrementTurn: true
    };
  }

  override getSuggestions(command: GameCommand): string[] {
  // Use base class for verb suggestions if no verb or partial verb
    if (!command.verb || !this.canHandle(command)) {
      return this.getVerbSuggestions(command.verb);
    }

    // Get current scene and check light
    const scene = this.sceneMechanicsService.getCurrentScene();
    if (!scene || !this.lightMechanicsService.isLightPresent(scene)) {
      return [];
    }

    const exits = this.movementMechanicsService.getAvailableExits(scene)
      .filter(exit => exit.isOpenable);

    const verb = this.getPrimaryVerb(command.verb);

    // If we have a partial object, filter the suggestions
    if (command.object) {
      const partialObject = command.object.toLowerCase();
      return exits
        .filter(obj =>
          obj.direction.toLowerCase().startsWith(partialObject))
        .map(obj => `${verb} ${obj.direction}`);
    }

    // Return all possible objects if no partial object specified
    return exits.map(obj => `${verb} ${obj.direction}`);
  }
}

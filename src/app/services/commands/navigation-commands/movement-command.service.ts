/**
 * Command service for handling movement and navigation between scenes.
 *
 * Command Syntax:
 * - go [direction]
 * - move [direction]
 * - [direction] (e.g., "north", "south", etc.)
 * - enter [object/direction]
 *
 * Valid Directions:
 * - Primary: north, south, east, west, up, down
 * - Aliases: n, s, e, w, u, d
 *
 * Command Context:
 * - Available in any scene with defined exits
 * - Requires light source for dark scenes
 * - May require specific flags for certain exits
 *
 * Dependencies:
 * - MovementMechanicsService: Handles movement logic and validation
 * - LightMechanicsService: Checks visibility conditions
 *
 * Examples:
 * - "go north"
 * - "south"
 * - "move up"
 * - "enter door"
 *
 * Side Effects:
 * - May change current scene
 * - May update score
 * - Updates movement history
 */
import {Injectable} from '@angular/core';
import {GameStateService} from '../../game-state.service';
import {SceneMechanicsService} from '../../mechanics/scene-mechanics.service';
import {ProgressMechanicsService} from '../../mechanics/progress-mechanics.service';
import {LightMechanicsService} from '../../mechanics/light-mechanics.service';
import {ScoreMechanicsService} from '../../mechanics/score-mechanics.service';
import {InventoryMechanicsService} from '../../mechanics/inventory-mechanics.service';
import {MovementMechanicsService} from '../../mechanics/movement-mechanics.service';
import {ContainerMechanicsService} from '../../mechanics/container-mechanics.service';
import {CommandResponse, GameCommand} from '../../../models';
import {BaseCommandService} from '../base-command.service';
import {GameTextService} from '../../game-text.service';
import {ObjectMechanicsService} from '../../mechanics/object-mechanics.service';
import {ExaminationMechanicsService} from '../../mechanics/examination-mechanics.service';

@Injectable({
  providedIn: 'root'
})
export class MovementCommandService extends BaseCommandService {

  /**
   * All valid movement verbs including directional commands
   * This includes both explicit movement verbs and direction shortcuts
   */
  readonly verbs = [
    'north',
    'south',
    'east',
    'west',
    'up',
    'down',
    'climb',
  ] as const;
  /**
   * Maps direction aliases to their full names
   * @private
   */
  protected override readonly verbAliases: { [key: string]: string } = {
    'n': 'north',
    's': 'south',
    'e': 'east',
    'w': 'west',
    'u': 'up',
    'd': 'down',
    'c': 'climb'
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
   * Handle a movement command
   * @param command Command to handle
   * @returns Response indicating success/failure and message
   *
   * Error Cases:
   * - Invalid direction
   * - No exit in direction
   * - Exit blocked by required flags
   * - Too dark to move
   */
  override handle(command: GameCommand): CommandResponse {
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

    // Get the exit if it is valid
    const exit = this.movementMechanicsService.getExit(scene, command.object);
    if(!exit)
    {
      return {
        success: false,
        message: this.gameTextService.get('movement.cantGo', {action: command.verb}),
        incrementTurn: false
      };
    }

    // Move through the exit
    const moveResult = this.movementMechanicsService.moveToExit(scene, exit);
    if (!moveResult) {
      return moveResult;
    }

    return {
      success: true,
      message: this.gameTextService.get('movement.newRoom', {exit: exit.direction}),
      incrementTurn: true
    };
  }

  /**
   * Get command suggestions based on current context
   * @param command Partial command to get suggestions for
   * @returns Array of suggested command completions
   *
   * State Dependencies:
   * - Scene state via SceneMechanicsService
   * - Movement state via MovementMechanicsService
   *
   * Suggestion Types:
   * 1. No verb: Suggest all direction verbs
   * 2. Partial verb: Suggest matching direction verbs
   * 3. Full verb with no object: Suggest available exits
   * 4. Full verb with partial object: Filter available exits
   *
   * @throws None - Returns empty array on error
   */
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

    const exits = this.movementMechanicsService.getAvailableExits(scene);

    const verb = this.getPrimaryVerb(command.verb);

    // If we have a partial object, filter the suggestions
    if (command.object) {
      const partialObject = command.object.toLowerCase();
      return exits
        .filter(obj => obj.direction.toLowerCase().startsWith(partialObject))
        .map(obj => `$${obj.direction}`);
    }

    // Return all possible objects if no partial object specified
    return exits.map(obj => `${obj.direction}`);
  }

}

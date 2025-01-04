import {Injectable} from '@angular/core';
import {GameStateService} from '../../game-state.service';
import {SceneMechanicsService} from '../../mechanics/scene-mechanics.service';
import {ProgressMechanicsService} from '../../mechanics/progress-mechanics.service';
import {LightMechanicsService} from '../../mechanics/light-mechanics.service';
import {InventoryMechanicsService} from '../../mechanics/inventory-mechanics.service';
import {ScoreMechanicsService} from '../../mechanics/score-mechanics.service';
import {ContainerMechanicsService} from '../../mechanics/container-mechanics.service';
import {MoveObjectMechanicsService} from '../../mechanics/move-object-mechanics.service';
import {BaseCommandService} from '../base-command.service';
import {CommandResponse, GameCommand} from '../../../models';
import {GameTextService} from '../../game-text.service';

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
    gameStateService: GameStateService,
    sceneMechanicsService: SceneMechanicsService,
    progressMechanicsService: ProgressMechanicsService,
    lightMechanicsService: LightMechanicsService,
    inventoryMechanicsService: InventoryMechanicsService,
    scoreMechanicsService: ScoreMechanicsService,
    containerMechanicsService: ContainerMechanicsService,
    private moveObjectMechanicsService: MoveObjectMechanicsService,
    private gameTextService: GameTextService
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
   * Primary verbs for command
   */
  readonly verbs = ['move'] as const;
  /**
   * Verb aliases mapping
   */
  protected override readonly verbAliases: { [key: string]: string } = {
    'm': 'move'
  };


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

    // Find and validate object
    const object = this.sceneMechanicsService.findObjectByName(scene, command.object);
    if (!object) {
      return {
        success: false,
        message: this.gameTextService.get('error.objectNotFound', {item: command.object}),
        incrementTurn: false
      };
    }

    // Check if we can move the object
    const canMove = this.moveObjectMechanicsService.canMoveObject(scene, object);
    if (!canMove.success) {
      return canMove;
    }

    // Move the object
    const moveResult = this.moveObjectMechanicsService.moveObject(scene, object);
    if (!moveResult.success) {
      return moveResult;
    }

    // Handle scoring
    this.scoreMechanicsService.handleObjectScoring({
      action: command.verb,
      object,
      skipGeneralRules: false
    });

    return {
      success: true,
      message: this.gameTextService.get('success.move', {item: object.name}),
      incrementTurn: true
    };
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

  // Get all moveable objects from the current scene
  const moveableObjects = this.getKnownObjectsNotOwned(scene)
    .filter(obj => this.moveObjectMechanicsService.canMoveObject(scene, obj).success);

  const verb = this.getPrimaryVerb(command.verb);

  // If we have a partial object, filter the suggestions
  if (command.object) {
    const partialObject = command.object.toLowerCase();
    return moveableObjects
      .filter(obj => obj.name.toLowerCase().startsWith(partialObject))
      .map(obj => `${verb} ${obj.name}`);
  }

  // Return all possible objects if no partial object specified
  return moveableObjects.map(obj => `${verb} ${obj.name}`);
}
}

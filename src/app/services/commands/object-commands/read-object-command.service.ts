import {Injectable} from '@angular/core';
import {GameStateService} from '../../game-state.service';
import {SceneMechanicsService} from '../../mechanics/scene-mechanics.service';
import {LightMechanicsService} from '../../mechanics/light-mechanics.service';
import {InventoryMechanicsService} from '../../mechanics/inventory-mechanics.service';
import {ProgressMechanicsService} from '../../mechanics/progress-mechanics.service';
import {BaseCommandService} from '../base-command.service';
import {ContainerMechanicsService} from '../../mechanics/container-mechanics.service';
import {ScoreMechanicsService} from '../../mechanics/score-mechanics.service';
import {CommandResponse, GameCommand, SceneObject} from '../../../models';
import {ExaminationMechanicsService} from '../../mechanics/examination-mechanics.service';
import {GameTextService} from '../../game-text.service';
import {ObjectMechanicsService} from '../../mechanics/object-mechanics.service';

/**
 * Command service for handling read commands.
 * Orchestrates reading interactions with objects in the game.
 *
 * Key Responsibilities:
 * - Validate read command targets
 * - Coordinate between mechanics services
 * - Handle read command suggestions
 *
 * State Dependencies (via FlagMechanicsService):
 * - Object visibility flags
 * - Light state flags
 * - Read interaction flags
 *
 * Service Dependencies:
 * - SceneMechanicsService: Scene and object access
 * - LightMechanicsService: Visibility checks
 * - InventoryMechanicsService: Inventory object access
 * - FlagMechanicsService: State management
 * - ExaminationMechanicsService: Reading/examination handling
 * - GameTextService: Error messages
 *
 * Command Format:
 * - "read [object]"
 * - Handles reading text from objects with read interactions
 *
 * Error Handling:
 * - Validates object existence
 * - Checks visibility conditions
 * - Verifies read interactions
 * - Provides specific error messages
 *
 * State Management:
 * - All state queries through FlagMechanicsService
 * - Maintains consistency on errors
 */
@Injectable({
  providedIn: 'root'
})
export class ReadObjectCommandService extends BaseCommandService {
  /**
   * Primary verbs for command
   */
  readonly verbs = ['read'] as const;
  /**
   * Verb aliases mapping
   */
  protected override readonly verbAliases: { [key: string]: string } = {
    'r': 'read'
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
    gameTextService: GameTextService
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
   * Handles the read command execution
   * @param command Command to execute
   * @returns Response indicating success/failure and appropriate message
   *
   * State Dependencies (all read-only):
   * - Object visibility via LightMechanicsService
   * - Object state via FlagMechanicsService
   *
   * Error Conditions:
   * - No object specified
   * - Object not found
   * - Object not readable
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

    // First check if object can be examined at all
    const canRead = this.examinationMechanicsService.canExamine(scene, object);
    if (!canRead.success) {
      return canRead;
    }

    // Handle scoring
    this.scoreMechanicsService.handleObjectScoring({
      action: command.verb,
      object,
      skipGeneralRules: false
    });

    // Return the read interaction message
    return {
      success: true,
      message: canRead.message,
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
   * - Inventory state via InventoryMechanicsService
   * - Visibility state via LightMechanicsService
   *
   * Suggestion Rules:
   * - Only suggests visible objects
   * - Only suggests objects with read interactions
   * - Includes inventory items
   * - Includes scene objects
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

    const allItems = this.objectMechanicsService.getAllKnownObjects(scene);

    // Filter out only the objects we can read
    const readableItems = allItems.filter(item => this.examinationMechanicsService.canRead(scene, item));

    const verb = this.getPrimaryVerb(command.verb);

    // If we have a partial object, filter the suggestions
    if (command.object) {
      const partialObject = command.object.toLowerCase();
      return readableItems
        .filter(obj => obj.name.toLowerCase().startsWith(partialObject))
        .map(obj => `${verb} ${obj.name}`);
    }

    // Return all possible objects if no partial object specified
    return readableItems.map(obj => `${verb} ${obj.name}`);
  }
}

import {Injectable} from '@angular/core';
import {GameStateService} from '../../game-state.service';
import {SceneMechanicsService} from '../../mechanics/scene-mechanics.service';
import {LightMechanicsService} from '../../mechanics/light-mechanics.service';
import {InventoryMechanicsService} from '../../mechanics/inventory-mechanics.service';
import {ProgressMechanicsService} from '../../mechanics/progress-mechanics.service';
import {BaseCommandService} from '../base-command.service';
import {ContainerMechanicsService} from '../../mechanics/container-mechanics.service';
import {ScoreMechanicsService} from '../../mechanics/score-mechanics.service';
import {CommandResponse, GameCommand} from '../../../models';
import {ExaminationMechanicsService} from '../../mechanics/examination-mechanics.service';
import {GameTextService} from '../../game-text.service';

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
  constructor(
    gameStateService: GameStateService,
    sceneMechanicsService: SceneMechanicsService,
    progressMechanicsService: ProgressMechanicsService,
    lightMechanicsService: LightMechanicsService,
    inventoryMechanicsService: InventoryMechanicsService,
    scoreMechanicsService: ScoreMechanicsService,
    containerMechanicsService: ContainerMechanicsService,
    private examinationMechanicsService: ExaminationMechanicsService,
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
   * Checks if this service can handle the given command
   * @param command Command to check
   * @returns True if command is a valid read command
   */
  override canHandle(command: GameCommand): boolean {
    return command.verb === 'read';
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
        message: this.gameTextService.get('error.noObject', {action: command.verb}),
        incrementTurn: false
      };
    }

    // Find and validate object
    const object = this.sceneMechanicsService.findObject(command.object);
    if (!object) {
      return {
        success: false,
        message: this.gameTextService.get('error.objectNotFound', {item: command.object}),
        incrementTurn: false
      };
    }

    // First check if object can be examined at all
    const canExamine = this.examinationMechanicsService.canExamine(object);
    if (!canExamine.success) {
      return canExamine;
    }

    // Then check if it has a read interaction
    if (!object.interactions?.['read']) {
      return {
        success: false,
        message: this.gameTextService.get('error.cantRead', {item: object.name}),
        incrementTurn: false
      };
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
      message: object.interactions['read'].message,
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
    const suggestions = super.getSuggestions(command);

    const scene = this.sceneMechanicsService.getCurrentScene();
    if (!scene) return [];

    // Get readable objects from inventory
    const inventoryItems = this.inventoryMechanicsService.listInventory();

    for (const itemId of inventoryItems) {
      const item = this.sceneMechanicsService.findObjectById(itemId);
      if (item &&
        this.examinationMechanicsService.canExamine(item) &&
        item.interactions?.['read']) {
        suggestions.push(`read ${item.name.toLowerCase()}`);
      }
    }

    // Get readable objects from current scene
    if (scene.objects) {
      for (const object of Object.values(scene.objects)) {
        if (this.examinationMechanicsService.canExamine(object) &&
          object.interactions?.['read']) {
          suggestions.push(`read ${object.name.toLowerCase()}`);
        }
      }
    }

    return suggestions;
  }
}

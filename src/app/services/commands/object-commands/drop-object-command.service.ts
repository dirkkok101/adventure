import {Injectable} from '@angular/core';
import {GameStateService} from '../../game-state.service';
import {SceneMechanicsService} from '../../mechanics/scene-mechanics.service';
import {InventoryMechanicsService} from '../../mechanics/inventory-mechanics.service';
import {ScoreMechanicsService} from '../../mechanics/score-mechanics.service';
import {ProgressMechanicsService} from '../../mechanics/progress-mechanics.service';
import {LightMechanicsService} from '../../mechanics/light-mechanics.service';
import {BaseCommandService} from '../base-command.service';
import {ContainerMechanicsService} from '../../mechanics/container-mechanics.service';
import {CommandResponse, GameCommand} from '../../../models';
import {GameTextService} from '../../game-text.service';

/**
 * Command service for handling drop commands.
 * Manages dropping objects from inventory into the current scene.
 *
 * Key Responsibilities:
 * - Validate object possession
 * - Handle inventory removal
 * - Manage scene object placement
 * - Handle scoring for special drops
 *
 * Service Dependencies:
 * - InventoryMechanicsService: Inventory management
 *   - Handles object removal from inventory
 *   - Validates object possession
 * - SceneMechanicsService: Scene object management
 *   - Manages scene object placement
 *   - Validates scene state
 * - ScoreMechanicsService: Scoring for special drops
 *   - Handles drop-related scoring
 *   - Manages score state
 * - FlagMechanicsService: Game state management
 *   - Tracks object locations
 *   - Manages state flags
 *
 * State Dependencies:
 * - [objectId]_has via InventoryMechanicsService
 * - [sceneId]_objects via SceneMechanicsService
 * - [objectId]_location via FlagMechanicsService
 * - [objectId]_score via ScoreMechanicsService
 *
 * Error Handling:
 * - Invalid command format: Returns error before processing
 * - Object not found: Returns error with details
 * - Object not in inventory: Returns error with details
 * - Scene state errors: Rolls back changes
 * - Scoring errors: Logs but continues
 *
 * Command Format:
 * - "drop [object]"
 * - Only handles simple drops, not "put in" commands
 */
@Injectable({
  providedIn: 'root'
})
export class DropObjectCommandService extends BaseCommandService {
  constructor(
    gameStateService: GameStateService,
    sceneMechanicsService: SceneMechanicsService,
    progressMechanicsService: ProgressMechanicsService,
    lightMechanicsService: LightMechanicsService,
    inventoryMechanicsService: InventoryMechanicsService,
    scoreMechanicsService: ScoreMechanicsService,
    containerMechanicsService: ContainerMechanicsService,
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
   * @returns True if command is a valid drop command without preposition
   *
   * @throws None
   */
  canHandle(command: GameCommand): boolean {
    // Only handle 'drop' without preposition, use PutCommandService for 'put in'
    return command.verb === 'drop' && !command.preposition;
  }

  /**
   * Handles the drop command execution
   * @param command Command to execute
   * @returns Response indicating success/failure and appropriate message
   *
   * State Dependencies:
   * - All dependencies from performDrop
   *
   * Error Conditions:
   * - No object specified: Returns error
   * - Object not found: Returns error
   * - Object not in inventory: Returns error
   * - All error conditions from performDrop
   *
   * @throws None - All errors returned in CommandResponse
   */
  handle(command: GameCommand): CommandResponse {

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

    // Verify object possession
    if (!this.inventoryMechanicsService.hasItem(object.id)) {
      return {
        success: false,
        message: this.gameTextService.get('error.notHoldingItem', {item: object.name}),
        incrementTurn: false
      };
    }

    // Get current scene
    const currentScene = this.sceneMechanicsService.getCurrentScene();
    if (!currentScene) {
      return {
        success: false,
        message: this.gameTextService.get('error.noScene'),
        incrementTurn: false
      };
    }

    // Remove from inventory
    const dropResult = this.inventoryMechanicsService.removeObjectFromInventory(object.id);
    if (!dropResult.success) {
      return dropResult;
    }

    // Add to current scene
    const addToSceneResult = this.sceneMechanicsService.addObjectToScene(object);
    if (!addToSceneResult.success) {
      // Rollback inventory change if scene update fails
      this.inventoryMechanicsService.addObjectToInventory(object.id);
      return addToSceneResult;
    }

    // Handle scoring
    this.scoreMechanicsService.handleObjectScoring({
      action: command.verb,
      object,
      skipGeneralRules: false
    });

    return {
      success: true,
      message: this.gameTextService.get('success.drop', {item: object.name}),
      incrementTurn: true
    };

  }

  /**
   * Gets command suggestions based on current state
   * @param command Partial command to get suggestions for
   * @returns Array of suggested command completions
   *
   * State Dependencies:
   * - Inventory state via InventoryMechanicsService
   * - Object data via SceneMechanicsService
   *
   * Error Conditions:
   * - Invalid verb: Returns empty array
   * - No inventory items: Returns empty array
   * - Error accessing state: Returns empty array
   *
   * @throws None - Returns empty array on error
   */
  override getSuggestions(command: GameCommand): string[] {
    try {
      if (!command.verb || command.verb !== 'drop') {
        return [];
      }

      const suggestions = new Set<string>();

      // Get droppable objects from inventory
      const inventoryItems = this.inventoryMechanicsService.listInventory();
      for (const itemId of inventoryItems) {
        const item = this.sceneMechanicsService.findObjectById(itemId);
        if (item) {
          suggestions.add(item.name.toLowerCase());
        }
      }

      return Array.from(suggestions);
    } catch (error) {
      console.error('Error getting drop command suggestions:', error);
      return [];
    }
  }
}

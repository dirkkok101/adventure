import {Injectable} from "@angular/core";
import {CommandResponse, GameCommand} from "../../../models";
import {GameStateService} from "../../game-state.service";
import {GameTextService} from "../../game-text.service";
import {ContainerMechanicsService} from "../../mechanics/container-mechanics.service";
import {CommandSuggestionService} from "../command-suggestion.service";
import {InventoryMechanicsService} from "../../mechanics/inventory-mechanics.service";
import {LightMechanicsService} from "../../mechanics/light-mechanics.service";
import {ProgressMechanicsService} from "../../mechanics/progress-mechanics.service";
import {SceneMechanicsService} from "../../mechanics/scene-mechanics.service";
import {ScoreMechanicsService} from "../../mechanics/score-mechanics.service";
import {BaseCommandService} from "../base-command.service";

/**
 * Command service for handling 'put' commands that place items into containers.
 *
 * Key Responsibilities:
 * - Validate item and container existence
 * - Check container accessibility and capacity
 * - Orchestrate item transfer between inventory and container
 * - Handle scoring for successful container placements
 *
 * Dependencies:
 * - ContainerMechanicsService: Container state and operations
 * - InventoryMechanicsService: Inventory management
 * - ScoreMechanicsService: Scoring for successful placements
 * - LightMechanicsService: Visibility checks
 * - FlagMechanicsService: State management
 *
 * State Dependencies:
 * - Reads: inventory state, container state, scene visibility
 * - Writes: inventory state, container state, score state
 *
 * Command Format:
 * - "put [item] in [container]"
 * - Requires both item and container parameters
 *
 * Error Handling:
 * - Validates scene visibility
 * - Validates item existence in inventory
 * - Validates container accessibility
 * - Ensures atomic state updates
 */
@Injectable({
  providedIn: 'root'
})
export class PutInContainerCommandService extends BaseCommandService {
  constructor(
    gameStateService: GameStateService,
    sceneMechanicsService: SceneMechanicsService,
    progressMechanicsService: ProgressMechanicsService,
    lightMechanicsService: LightMechanicsService,
    inventoryMechanicsService: InventoryMechanicsService,
    containerMechanicsService: ContainerMechanicsService,
    scoreMechanicsService: ScoreMechanicsService,
    private commandSuggestionService: CommandSuggestionService,
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

  canHandle(command: GameCommand): boolean {
    return command.verb === 'put' && !!command.object && !!command.target;
  }

  /**
   * Handles the 'put' command by transferring an item from inventory to a container
   *
   * @param command - The game command containing item and container information
   * @returns CommandResponse indicating success/failure and appropriate message
   *
   * State Effects:
   * - Updates inventory state through InventoryMechanicsService
   * - Updates container state through ContainerMechanicsService
   * - May update score state through ScoreMechanicsService
   *
   * Error Conditions:
   * - Scene not visible
   * - Item not in inventory
   * - Container not accessible
   * - Container validation fails
   */
  handle(command: GameCommand): CommandResponse {
    if (!command.object || command.target) {
      return {
        success: false,
        message: this.gameTextService.get('error.noObject', {action: command.verb}),
        incrementTurn: false
      };
    }

    // 2. Scene Validation
    const scene = this.sceneMechanicsService.getCurrentScene();
    if (!scene) {
      return {
        success: false,
        message: this.gameTextService.get('error.noScene', {action: command.verb}),
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

    // 4. Object Resolution
    const item = this.sceneMechanicsService.findObject(command.object);
    const container = this.sceneMechanicsService.findObject(command.target ?? '');

    if (!item) {
      return {
        success: false,
        message: `You don't have a ${command.object}.`,
        incrementTurn: false
      };
    }

    if (!container) {
      return {
        success: false,
        message: `You don't see a ${command.target} here.`,
        incrementTurn: false
      };
    }

    // 5. Container Validation
    if (!container.isContainer) {
      return {
        success: false,
        message: `The ${container.name} isn't a container.`,
        incrementTurn: false
      };
    }

    // 6. Inventory Check
    if (!this.inventoryMechanicsService.hasItem(item.id)) {
      return {
        success: false,
        message: `You don't have the ${item.name}.`,
        incrementTurn: false
      };
    }

    // 10. State Update
    // a. Add to container
    const addResult = this.containerMechanicsService.addToContainer(container.id, item.id);
    if (!addResult.success) {
      return addResult;
    }

    // b. Remove from inventory
    const removeResult = this.inventoryMechanicsService.removeObjectFromInventory(item.id);
    if (!removeResult.success) {
      return removeResult;
    }

    // 11. Success Response
    return {
      success: true,
      message: this.gameTextService.get('success.putInContainer', {item: item.name, container: container.name}),
      incrementTurn: true
    };
  }

  /**
   * Provides suggestions for the 'put' command based on current inventory and visible containers
   *
   * @param command - The current command being typed
   * @returns Array of suggested completions
   *
   * State Dependencies:
   * - Inventory contents
   * - Scene visibility
   * - Container accessibility
   */
  override getSuggestions(command: GameCommand): string[] {
    if (!command.verb || command.verb !== 'put') {
      return [];
    }

    // Check if there's enough light to interact
    if (!this.lightMechanicsService.isLightPresent()) {
      return [];
    }

    const scene = this.sceneMechanicsService.getCurrentScene();

    // If no object specified yet, suggest inventory items
    if (!command.object) {
      const inventory = this.inventoryMechanicsService.listInventory();
      return inventory.map(id => scene.objects?.[id]?.name || '').filter(Boolean);
    }

    // If object specified but no target, suggest containers
    if (command.object && !command.target) {
      return this.commandSuggestionService.getContainerSuggestions(command);
    }

    return [];
  }
}

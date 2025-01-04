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
import {ExaminationMechanicsService} from '../../mechanics/examination-mechanics.service';
import {ObjectMechanicsService} from '../../mechanics/object-mechanics.service';

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
  /**
   * Primary verbs for command
   */
  readonly verbs = ['put'] as const;
  /**
   * Verb aliases mapping
   */
  protected override readonly verbAliases: { [key: string]: string } = {
    'p': 'put'
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
   * Checks if this service can handle the given command
   * @param command Command to check
   * @returns True if command is a valid put command
   *
   * Valid Commands:
   * - "put [item] in [container]"
   * - "p [item] in [container]"
   */
  override canHandle(command: GameCommand): boolean {
    // First check if the verb is valid using base class logic
    if (!super.canHandle(command)) {
      return false;
    }

    return command.preposition === 'in' && !!command.object && !!command.target;
  }

  /**
   * Handles the 'put' command by transferring an item from inventory to a container
   * @param command The game command containing item and container information
   * @returns CommandResponse indicating success/failure and appropriate message
   *
   * State Dependencies:
   * - Inventory state via InventoryMechanicsService
   * - Container state via ContainerMechanicsService
   * - Scene state via SceneMechanicsService
   * - Light state via LightMechanicsService
   *
   * State Effects:
   * - Updates inventory state
   * - Updates container state
   * - May update score state
   *
   * Error Conditions:
   * - Missing object or target
   * - Invalid preposition (not 'in')
   * - Scene not visible
   * - Item not in inventory
   * - Container not accessible
   * - Container validation fails
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

    // 4. Object Resolution
    const item = this.sceneMechanicsService.findObjectByName(scene, command.object);
    const container = this.sceneMechanicsService.findObjectByName(scene, command.target ?? '');

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

    // 6. Inventory Check
    if (!this.inventoryMechanicsService.hasItem(item)) {
      return {
        success: false,
        message: `You don't have the ${item.name}.`,
        incrementTurn: false
      };
    }

    // 10. State Update
    // a. Add to container
    const addResult = this.containerMechanicsService.addToContainer(scene, container, item.id);
    if (!addResult.success) {
      return addResult;
    }

    // b. Remove from inventory
    const removeResult = this.inventoryMechanicsService.removeObjectFromInventory(scene, item);
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
   * @param command The current command being typed
   * @returns Array of suggested command completions
   *
   * State Dependencies:
   * - Inventory state via InventoryMechanicsService
   * - Scene state via SceneMechanicsService
   * - Light state via LightMechanicsService
   * - Container state via ContainerMechanicsService
   *
   * Suggestion Types:
   * 1. No verb: Suggest primary verb ('put')
   * 2. Partial verb: Suggest matching verbs
   * 3. Full verb, no object: Suggest inventory items
   * 4. Full verb and object: Suggest 'in' preposition
   * 5. Full verb, object, and 'in': Suggest visible containers
   * 6. Full command: No suggestions
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

    const verb = this.getPrimaryVerb(command.verb);

    // If we have a verb but no object, suggest inventory items
    if (!command.object) {
      return this.inventoryMechanicsService.listInventory(scene)
        .map(item => `${verb} ${item.name}`);
    }

    // If we have an object but no preposition, suggest 'in'
    if (!command.preposition) {
      return [`${verb} ${command.object} in`];
    }

    // If we have 'in' preposition but no target, suggest containers
    if (command.preposition === 'in' && !command.target) {
      return this.objectMechanicsService.getKnownObjectsNotOwned(scene)
        .filter(obj =>
          obj.isContainer
        )
        .map(container => `${verb} ${command.object} in ${container.name}`);
    }

    return [];
  }
}

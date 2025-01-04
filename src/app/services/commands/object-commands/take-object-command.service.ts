import {Injectable} from '@angular/core';
import {BaseCommandService} from '../base-command.service';
import {GameStateService} from '../../game-state.service';
import {SceneMechanicsService} from '../../mechanics/scene-mechanics.service';
import {ProgressMechanicsService} from '../../mechanics/progress-mechanics.service';
import {LightMechanicsService} from '../../mechanics/light-mechanics.service';
import {InventoryMechanicsService} from '../../mechanics/inventory-mechanics.service';
import {ContainerMechanicsService} from '../../mechanics/container-mechanics.service';
import {ScoreMechanicsService} from '../../mechanics/score-mechanics.service';
import {GameTextService} from '../../game-text.service';
import {CommandResponse, GameCommand} from '../../../models';
import {ExaminationMechanicsService} from '../../mechanics/examination-mechanics.service';
import {ObjectMechanicsService} from '../../mechanics/object-mechanics.service';

/**
 * Command service for handling take/get commands.
 * Orchestrates taking objects from scenes and containers into inventory.
 *
 * Key Responsibilities:
 * - Parse and validate take commands
 * - Coordinate between mechanics services for take operations
 * - Handle command suggestions
 * - Manage transaction-like operations for taking objects
 *
 * State Dependencies (via mechanics services):
 * - Object location state (via FlagMechanics)
 * - Container state (via ContainerMechanics)
 * - Scene object state (via SceneMechanics)
 * - Scoring state (via ScoreMechanics)
 * - Light state (via LightMechanics)
 * - Progress state (via ProgressMechanics)
 *
 * Service Dependencies:
 * - FlagMechanicsService: State management and flags
 * - InventoryMechanicsService: Inventory operations
 * - ContainerMechanicsService: Container access
 * - SceneMechanicsService: Scene and object access
 * - ScoreMechanicsService: Take-related scoring
 * - LightMechanicsService: Visibility checks
 * - ProgressMechanicsService: Turn and progressMechanicsService tracking
 *
 * Command Format:
 * - "take/get/pick [object]"
 * - Handles taking objects from scene or open containers
 *
 * Error Handling:
 * - Validates command format and object existence
 * - Checks visibility and accessibility conditions
 * - Manages rollback on failed operations
 * - Provides specific error messages for each failure case
 *
 * State Update Rules:
 * - All state changes go through mechanics services
 * - State updates are atomic and consistent
 * - Rollback on failure maintains consistency
 */
@Injectable({
  providedIn: 'root'
})
export class TakeObjectCommandService extends BaseCommandService {
  /**
   * Primary verbs for command
   */
  readonly verbs = ['take', 'get'] as const;
  /**
   * Verb aliases mapping
   */
  protected override readonly verbAliases: { [key: string]: string } = {
    't': 'take',
    'g': 'get',
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
   * Handles the take command execution
   * @param command Command to execute
   * @returns Response indicating success/failure and appropriate message
   *
   * State Effects (all via mechanics services):
   * - May update inventory state (via InventoryMechanics)
   * - May update container state (via ContainerMechanics)
   * - May update scene state (via SceneMechanics)
   * - May update score state (via ScoreMechanics)
   * - Updates progressMechanicsService state (via ProgressMechanics)
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

    // Find and validate object
    const object = this.sceneMechanicsService.findObjectByName(scene, command.object);
    if (!object) {
      return {
        success: false,
        message: this.gameTextService.get('error.objectNotFound', {item: command.object}),
        incrementTurn: false
      };
    }

    // Return the objects in the scene and in open containers, filter out the ones we already have
    const objectsWeCanTake = this.objectMechanicsService.getKnownObjectsNotOwned(scene);

    // Check to ensure the object we want to take is in the list of objects we can take
    const objectToTake = objectsWeCanTake.find(obj => obj.id === object.id);
    if (!objectToTake) {
      return {
        success: false,
        message: this.gameTextService.get('error.objectNotVisible', {item: object.name}),
        incrementTurn: false
      };
    }

    // Find the container that contains the object
    const container = this.containerMechanicsService.findContainerWithItem(scene, object.id);

    let takeResult;

    // Take object through appropriate mechanics service
    if (container) {
      // Remove the object from the container
      takeResult = this.containerMechanicsService.removeFromContainer(scene, container, object.id);
    } else {
      // Remove the object from the scene
      takeResult = this.sceneMechanicsService.removeObjectFromScene(scene, object);
    }

    if (!takeResult.success) {
      return takeResult;
    }

    // Add the object to our inventory
    const addResult = this.inventoryMechanicsService.addObjectToInventory(scene, object);
    if (!addResult.success) {
      return addResult;
    }

    // Handle scoring
    this.scoreMechanicsService.handleObjectScoring({
      action: command.verb,
      object,
      skipGeneralRules: false
    });

    return {
      success: true,
      message: this.gameTextService.get('success.takeObject', {item: object.name}),
      incrementTurn: true
    };
  }

  /**
   * Gets command suggestions based on current state
   * @param command Partial command to get suggestions for
   * @returns Array of suggested command completions
   *
   * State Dependencies (all read-only):
   * - Scene state (via SceneMechanics)
   * - Container state (via ContainerMechanics)
   * - Inventory state (via InventoryMechanics)
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

    // Get the known objects in the scene that we don't own
    const objectsWeCanTake = this.objectMechanicsService.getKnownObjectsNotOwned(scene);

    const verb = this.getPrimaryVerb(command.verb);

    // If we have a partial object, filter suggestions
    if (command.object) {
      const partialObject = command.object.toLowerCase();
      return objectsWeCanTake
        .filter(obj => obj.name.toLowerCase().startsWith(partialObject))
        .map(obj => `${verb} ${obj.name}`);
    }

    // Return all possible object combinations
    return objectsWeCanTake.map(obj => `${verb} ${obj.name}`);
  }
}

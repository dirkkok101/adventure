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
   * @returns True if command is a valid take/get/pick command
   */
  canHandle(command: GameCommand): boolean {
    return command.verb === 'take' || command.verb === 'get' || command.verb === 'pick';
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

    // Get current scene
    const currentScene = this.sceneMechanicsService.getCurrentScene();
    if (!currentScene) {
      return {
        success: false,
        message: this.gameTextService.get('error.noScene'),
        incrementTurn: false
      };
    }

    const visibleObjects = this.examinationMechanicsService.getExaminableObjects()
    const visibleObject = visibleObjects.find(x => x.id === object.id);
    if (!visibleObject) {
      return {
        success: false,
        message: this.gameTextService.get('error.objectNotVisible', {item: object.name}),
        incrementTurn: false
      };
    }

    // Check take possibility through InventoryMechanics
    const hasItem = this.inventoryMechanicsService.hasItem(object.id);
    if (!hasItem) {
      return {
        success: false,
        message: this.gameTextService.get('error.itemInInventory', {item: object.name}),
        incrementTurn: false
      };
    }


    // Perform take operation through mechanics services
    // Find container through ContainerMechanics
    const container = this.containerMechanicsService.findContainerWithItem(object.id);

    // Start atomic operation
    let takeResult;

    // Take object through appropriate mechanics service
    if (container) {
      takeResult = this.containerMechanicsService.removeFromContainer(object.id, container.id);
    } else {
      takeResult = this.sceneMechanicsService.removeObjectFromScene(object.id);
    }

    if (!takeResult.success) {
      return takeResult;
    }

    const addResult = this.inventoryMechanicsService.addObjectToInventory(object.id);
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
    try {
      if (!command.verb || !['take', 'get', 'pick'].includes(command.verb)) {
        return [];
      }

      const scene = this.sceneMechanicsService.getCurrentScene();
      if (!scene) return [];

      const suggestions = new Set<string>();

      const visibleObjects = this.examinationMechanicsService.getExaminableObjects();
      for (const object of visibleObjects) {
        const hasItem = this.inventoryMechanicsService.hasItem(object.id);
        if (!hasItem) {
          suggestions.add(object.name.toLowerCase());
        }
      }

      // Get container objects through ContainerMechanics
      const containers = visibleObjects.filter(obj => obj.isContainer);
      for (const container of containers) {
        const containerCheck = this.containerMechanicsService.isOpen(container.id);
        if (!containerCheck) continue;

        const contents = this.containerMechanicsService.getContainerContents(container);
        for (const itemId of contents) {
          const item = this.sceneMechanicsService.findObjectById(itemId);
          if (item) {
            const hasItem = this.inventoryMechanicsService.hasItem(item.id);
            if (!hasItem) {
              suggestions.add(item.name.toLowerCase());
            }
          }
        }
      }

      return Array.from(suggestions);
    } catch (error) {
      console.error('Error getting take command suggestions:', error);
      return [];
    }
  }
}

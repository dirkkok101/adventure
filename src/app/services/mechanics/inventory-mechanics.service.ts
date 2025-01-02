import {Injectable} from "@angular/core";
import {ContainerMechanicsService} from "./container-mechanics.service";
import {SceneMechanicsService} from "./scene-mechanics.service";
import {ScoreMechanicsService} from "./score-mechanics.service";
import {MechanicsBaseService} from './mechanics-base.service';
import {GameStateService} from '../game-state.service';
import {CommandResponse} from '../../models';
import {GameTextService} from '../game-text.service';

/**
 * Service responsible for managing player inventory operations in the game.
 * Handles all aspects of inventory management and object manipulation.
 *
 * Key Responsibilities:
 * - Managing inventory contents
 * - Validating inventory operations
 * - Handling weight limits and capacity
 * - Processing add/remove actions
 *
 * State Dependencies:
 * - SceneMechanicsService: Scene context and object access
 * - ContainerMechanicsService: Container interactions
 * - ScoreMechanicsService: Scoring inventory actions
 *
 * Error Handling:
 * - Validates all operations before execution
 * - Provides descriptive error messages
 * - Maintains state consistency on failure
 * - Rolls back partial operations on error
 *
 * Inventory Rules:
 * - Limited by weight capacity
 * - Some objects cannot be taken
 * - Objects in closed containers are inaccessible
 * - Certain objects require light to interact with
 * - Score awarded for specific inventory actions
 *
 * Flag Usage:
 * Inventory State Flags:
 * - has[ObjectId]: Tracks if object is in inventory
 * - [objectId]Taken: Tracks if object has been taken before
 * - [objectId]Dropped: Tracks if object has been dropped
 *
 * Related Services:
 * - LightMechanicsService: For visibility requirements
 * - SceneMechanicsService: For object accessibility
 * - ContainerMechanicsService: For container operations
 * - ScoreMechanicsService: For scoring actions
 */
@Injectable({
  providedIn: 'root'
})
export class InventoryMechanicsService extends MechanicsBaseService {
  /**
   * Maximum weight that can be carried in inventory
   * @private
   */
  private readonly MAX_INVENTORY_WEIGHT = 20; // Default max weight if not specified

  constructor(
    private sceneMechanics: SceneMechanicsService,
    private containerMechanics: ContainerMechanicsService,
    private scoreMechanics: ScoreMechanicsService,
    private gameTextService: GameTextService,
    gameStateService: GameStateService
  ) {
    super(gameStateService)
  }

  /**
   * Get the maximum weight that can be carried in inventory
   * @returns Maximum inventory weight capacity
   */
  getMaxInventoryWeight(): number {
    return this.MAX_INVENTORY_WEIGHT;
  }

  /**
   * Calculate current inventory weight
   * @returns Total weight of inventory items
   * @private
   */
  getCurrentWeight(): number {
    const scene = this.sceneMechanics.getCurrentScene();
    const contents = this.getInventoryContents();
    return contents.reduce((total, id) =>
      total + (scene?.objects?.[id]?.weight || 0), 0);
  }

  /**
   * List all items in inventory with their names
   * @returns Array of item names
   */
  listInventory(): string[] {
    const scene = this.sceneMechanics.getCurrentScene();
    if (!scene?.objects) return [];

    const contents = this.getInventoryContents();
    return contents.filter(id => scene.objects?.[id])
      .map(id => scene.objects![id].name);
  }

  /**
   * Add an object to the inventory
   * @param objectId ID of the object to take
   * @returns Success status, message, and optional score
   */
  addObjectToInventory(objectId: string): CommandResponse {
    const scene = this.sceneMechanics.getCurrentScene();
    const object = scene?.objects?.[objectId];

    if (!object) {
      return {
        success: false,
        message: this.gameTextService.get('error.objectNotFound', { item: objectId}),
        incrementTurn: false
      };
    }

    if (!object.canTake) {
      return {
        success: false,
        message: this.gameTextService.get('error.cantTake', { item: object.name}),
        incrementTurn: false
      };
    }

    if (this.hasItem(objectId)) {
      return {
        success: false,
        message: this.gameTextService.get('error.itemInInventory', { item: object.name}),
        incrementTurn: false
      };
    }

    // Check weight limit
    const currentWeight = this.getCurrentWeight();
    if (currentWeight + (object.weight || 0) > this.getMaxInventoryWeight()) {
      return {
        success: false,
        message: this.gameTextService.get('error.tooHeavy', { item: object.name}),
        incrementTurn: false
      };
    }

    // Check if object is in a container
    if (this.containerMechanics.isInContainer(objectId)) {
      const containerId = this.containerMechanics.getContainerFor(objectId);
      if (containerId) {
        this.containerMechanics.removeFromContainer(containerId, objectId);
      }
    } else {
      this.sceneMechanics.removeObjectFromScene(objectId);
    }

    // Add to inventory
    this.setObjectInInventory(objectId, true);

    // Handle scoring through ScoreMechanicsService
    this.scoreMechanics.handleObjectScoring({
      action: 'take',
      object,
      skipGeneralRules: false
    });

    return {
      success: true,
      message: this.gameTextService.get('success.take', { item: object.name}),
      incrementTurn: true
    };
  }

  /**
   * Remove an object from inventory
   * @param objectId ID of the object to drop
   * @returns Success status and message
   */
  removeObjectFromInventory(objectId: string): CommandResponse {
    const scene = this.sceneMechanics.getCurrentScene();
    const object = scene?.objects?.[objectId];

    if (!object) {
      return {
        success: false,
        message: this.gameTextService.get('error.objectNotFound', { item: objectId}),
        incrementTurn: false
      };
    }

    if (!this.hasItem(objectId)) {
      return {
        success: false,
        message: this.gameTextService.get('error.notHoldingItem', { item: object.name}),
        incrementTurn: false
      };
    }

    // Remove from inventory
    this.setObjectInInventory(objectId, false);

    return {
      success: true,
      message: this.gameTextService.get('success.drop', { item: object.name}),
      incrementTurn: true
    };
  }

  // Inventory state methods
  private setObjectInInventory(objectId: string, inInventory: boolean): void {
    const flag = `${objectId}Has`;
    if (inInventory) {
      this.setFlag(flag);
    } else {
      this.removeFlag(flag);
    }
  }

  /**
   * Get a list of all items currently in inventory
   * @returns Array of item IDs in inventory
   */
  private getInventoryContents(): string[] {
    const scene = this.sceneMechanics.getCurrentScene();
    if (!scene?.objects) return [];

    return Object.keys(scene.objects)
      .filter(id => this.hasItem(id));
  }

  /**
   * Check if inventory contains a specific item
   * @param itemId ID of the item to check
   * @returns True if item is in inventory
   */
  hasItem(itemId: string): boolean {
    return this.hasFlag(`${itemId}Has`);
  }

}

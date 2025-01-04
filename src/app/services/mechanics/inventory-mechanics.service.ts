import {Injectable} from "@angular/core";
import {ContainerMechanicsService} from "./container-mechanics.service";
import {SceneMechanicsService} from "./scene-mechanics.service";
import {ScoreMechanicsService} from "./score-mechanics.service";
import {MechanicsBaseService} from './mechanics-base.service';
import {GameStateService} from '../game-state.service';
import {CommandResponse, Scene, SceneObject} from '../../models';
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
  getCurrentWeight(scene: Scene): number {
    if (!scene || scene.objects === undefined) {
      throw new Error('Invalid scene object');
    }

    const contents = this.getInventoryContents(scene);
    return contents.reduce((total, obj) =>
      total + (obj.weight ?? 0), 0);
  }

  /**
   * List all items in inventory with their names
   * @returns Array of item names
   */
  listInventory(scene: Scene): SceneObject[] {
    if (!scene || scene.objects === undefined) {
      throw new Error('Invalid scene object');
    }

    return this.getInventoryContents(scene);
  }

  /**
   * Add an object to the inventory
   * @param scene
   * @param object
   * @returns Success status, message, and optional score
   */
  addObjectToInventory(scene: Scene, object: SceneObject): CommandResponse {
    if (!scene || scene.objects === undefined) {
      throw new Error('Invalid scene');
    }

    if (!object) {
      throw new Error('Invalid object');
    }

    if (!object.canTake) {
      return {
        success: false,
        message: this.gameTextService.get('error.cantTake', { item: object.name}),
        incrementTurn: false
      };
    }

    if (this.hasItem(object)) {
      return {
        success: false,
        message: this.gameTextService.get('error.itemInInventory', { item: object.name}),
        incrementTurn: false
      };
    }

    // Check weight limit
    const currentWeight = this.getCurrentWeight(scene);
    if (currentWeight + (object.weight || 0) > this.getMaxInventoryWeight()) {
      return {
        success: false,
        message: this.gameTextService.get('error.tooHeavy', { item: object.name}),
        incrementTurn: false
      };
    }

    // Add to inventory
    this.setObjectInInventory(object.id, true);

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
   * @param scene
   * @param object
   * @returns Success status and message
   */
  removeObjectFromInventory(scene: Scene, object: SceneObject): CommandResponse {
    if (!scene || scene.objects === undefined) {
      throw new Error('Invalid scene');
    }

    if (!object) {
      throw new Error('Invalid object');
    }

    if (!this.hasItem(object)) {
      return {
        success: false,
        message: this.gameTextService.get('error.notHoldingItem', { item: object.name}),
        incrementTurn: false
      };
    }

    // Remove from inventory
    this.setObjectInInventory(object.id, false);

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
  private getInventoryContents(scene: Scene): SceneObject[] {
    if (!scene || scene.objects === undefined) {
      throw new Error('Invalid scene object');
    }

    return Object.values(scene.objects)
      .filter(obj => this.hasItem(obj));
  }

  /**
   * Check if inventory contains a specific item
   * @returns True if item is in inventory
   * @param item
   */
  hasItem(item: SceneObject): boolean {
    return this.hasFlag(`${item.id}Has`);
  }

}

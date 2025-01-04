import {Injectable} from '@angular/core';
import {CommandResponse, Scene, SceneObject} from '../../models';
import {SceneMechanicsService} from './scene-mechanics.service';
import {GameTextService} from '../game-text.service';
import {GameStateService} from '../game-state.service';
import {MechanicsBaseService} from './mechanics-base.service';


/**
 * Service responsible for managing container-related game mechanics.
 *
 *
 * Service Dependencies:
 * - SceneMechanicsService: For scene and object access
 * - GameTextServiceService: For error messages
 * - GameStateService: Core state persistence
 *
 * Key Responsibilities:
 * - Container state management
 * - Container access validation
 * - Container content management
 * - Container lock management
 *
 * Error Handling:
 * - Validates container existence
 * - Checks container accessibility
 * - Verifies capacity constraints
 * - Provides descriptive error messages
 *
 * State Management:
 * - Maintains data consistency
 */
@Injectable({
  providedIn: 'root'
})
export class ContainerMechanicsService extends MechanicsBaseService {
  constructor(
    private sceneMechanicsService: SceneMechanicsService,
    private gameTextService: GameTextService,
    gameStateService: GameStateService
  ) {
    super(gameStateService)
  }

  /**
   * Check if a container is open
   * @param containerId ID of container to check
   * @returns Whether the container is open
   */
  isOpen(containerId: string): boolean {
    return this.containerIsOpen(containerId);
  }

  /**
   * Check if a container is locked
   * @param containerId ID of container to check
   * @returns Whether the container is locked
   */
  isLocked(containerId: string): boolean {
    return this.containerIsLocked(containerId);
  }

  /**
   * Add an item to a container
   * Updates game state to track the new container contents
   *
   * @param scene The current scene containing the container and item
   * @param container
   * @param itemId ID of the item to add
   * @returns CommandResponse indicating success/failure
   *
   * State Dependencies:
   * - Container state (open/closed, locked/unlocked)
   * - Container contents
   *
   * Error Conditions:
   * - Invalid scene or container
   * - Container is locked
   * - Container is closed
   * - Container is at capacity
   */
  addToContainer(scene: Scene, container: SceneObject, itemId: string): CommandResponse {
    if (!scene || scene.objects === undefined) {
      throw new Error('Invalid scene object');
    }

    if (!container || !container.isContainer) {
      return {
        success: false,
        message: this.gameTextService.get('error.invalidContainer'),
        incrementTurn: false
      };
    }

    if (!this.isLocked(container.id)) {
      return {
        success: false,
        message: this.gameTextService.get('error.containerLocked', {container: container.name}),
        incrementTurn: false
      };
    }

    if (!this.isOpen(container.id)) {
      return {
        success: false,
        message: this.gameTextService.get('error.containerClosed', {container: container.name}),
        incrementTurn: false
      };
    }

    const contentIDs = this.getContainerContentIDs(container.id);
    if (container.capacity && contentIDs.length >= container.capacity) {
      return {
        success: false,
        message: this.gameTextService.get('error.containerFull', {container: container.name}),
        incrementTurn: false
      };
    }

    this.setContents(container.id, [...contentIDs, itemId]);

    return {
      success: true,
      message: this.gameTextService.get('success.addedToContainer', {
        container: container!.name
      }),
      incrementTurn: true
    };
  }

  /**
   * Remove an item from a container
   * Updates game state to track the new container contents
   *
   * @param scene The current scene containing the container and item
   * @param container
   * @param itemId ID of the item to remove
   * @returns CommandResponse indicating success/failure
   *
   * State Dependencies:
   * - Container state (open/closed, locked/unlocked)
   * - Container contents
   *
   * Error Conditions:
   * - Invalid scene or container
   * - Container is locked
   * - Container is closed
   * - Container is at capacity
   */
  removeFromContainer(scene: Scene, container: SceneObject, itemId: string): CommandResponse {
    if (!scene || scene.objects === undefined) {
      throw new Error('Invalid scene object');
    }

    if (!container || !container.isContainer) {
      return {
        success: false,
        message: this.gameTextService.get('error.invalidContainer'),
        incrementTurn: false
      };
    }

    if (!this.isLocked(container.id)) {
      return {
        success: false,
        message: this.gameTextService.get('error.containerLocked', {container: container.name}),
        incrementTurn: false
      };
    }

    if (!this.isOpen(container.id)) {
      return {
        success: false,
        message: this.gameTextService.get('error.containerClosed', {container: container.name}),
        incrementTurn: false
      };
    }

    const contentIDs = this.getContainerContentIDs(container.id);
    if (!contentIDs.includes(itemId)) {
      return {
        success: false,
        message: this.gameTextService.get('error.itemNotInContainer', {
          item: itemId,
          container: container.name
        }),
        incrementTurn: false
      };
    }

    this.setContents(container.id, contentIDs.filter(id => id !== itemId));

    return {
      success: true,
      message: this.gameTextService.get('success.removedFromContainer', {
        container: container.name
      }),
      incrementTurn: true
    };
  }

  /**
   * Find which container holds a specific item
   * @param scene
   * @param objectId The ID of the item to check
   * @returns The container object or null if not in a container
   */
  findContainerWithItem(scene: Scene, objectId: string): SceneObject | null {
    const containers = this.getSceneContainers(scene);

    for (const container of containers) {
      if (this.getContainerContentIDs(container.id).includes(objectId)) {
        return container;
      }
    }

    return null;
  }

  /**
   * Get a list of SceneObject in a container
   * @param scene
   * @param container Container to retrieve contents for
   * @returns An array of objects in the container
   */
  getContainerContents(scene: Scene, container: SceneObject): SceneObject[] {
    if (!scene || scene.objects === undefined) {
      throw new Error('Invalid scene object');
    }

    if (!container.isContainer) {
      return [];
    }

    const contentIDs = this.getContainerContentIDs(container.id);
    if (!contentIDs.length) {
      return [];
    }

    // Build list of visible contents with type safety
    const containerObjects: SceneObject[] = [];
    for (const id of contentIDs) {
      const obj = scene.objects[id];
      if (obj) {
        containerObjects.push(obj);
      }
    }

    return containerObjects;
  }

  /**
   * Open a container
   * Updates game state to mark container as open
   *
   * State Effects:
   * - Sets container open flag via FlagMechanicsService
   *
   * Error Conditions:
   * - Container does not exist
   * - Container is locked
   * - Container is already open
   *
   * @param scene
   * @param container
   * @returns CommandResponse indicating success/failure
   */
  openContainer(scene: Scene, container: SceneObject): CommandResponse {
    if (!scene || scene.objects === undefined) {
      throw new Error('Invalid scene object');
    }

    if (!container || !container.isContainer) {
      return {
        success: false,
        message: this.gameTextService.get('error.invalidContainer'),
        incrementTurn: false
      };
    }

    if (this.isLocked(container.id)) {
      return {
        success: false,
        message: this.gameTextService.get('container.locked', {container: container.name}),
        incrementTurn: false
      };
    }

    if (this.isOpen(container.id)) {
      return {
        success: false,
        message: this.gameTextService.get('container.alreadyOpen', {container: container.name}),
        incrementTurn: false
      };
    }

    this.setContainerOpen(container.id, true);

    return {
      success: true,
      message: this.gameTextService.get('container.open', {container: container.name}),
      incrementTurn: true
    };
  }

  /**
   * Close a container
   * Updates game state to mark container as closed
   *
   * State Effects:
   * - Clears container open flag via FlagMechanicsService
   *
   * Error Conditions:
   * - Container does not exist
   * - Container is already closed
   *
   * @param scene
   * @param container
   * @returns CommandResponse indicating success/failure
   */
  closeContainer(scene: Scene, container: SceneObject): CommandResponse {
    if (!scene || scene.objects === undefined) {
      throw new Error('Invalid scene object');
    }

    if (!container || !container.isContainer) {
      return {
        success: false,
        message: this.gameTextService.get('error.invalidContainer'),
        incrementTurn: false
      };
    }

    if (!this.isOpen(container.id)) {
      return {
        success: false,
        message: this.gameTextService.get('container.alreadyClosed', {container: container.name}),
        incrementTurn: false
      };
    }

    this.setContainerOpen(container.id, false);

    return {
      success: true,
      message: this.gameTextService.get('container.close', {container: container.name}),
      incrementTurn: true
    };
  }

  /**
   * Check if a container exists and is valid
   * @param scene the scene to search
   * @param containerId ID of container to retrieve
   * @returns The container object if it exists and is a container, null otherwise
   */
  getContainer(scene: Scene, containerId: string): SceneObject | null {
    const container = scene?.objects?.[containerId];
    if (!container) return null;

    return container.isContainer ? container : null;
  }

  /**
   * Get all containers in the current scene
   * @returns Map of container ID to container object
   */
  public getSceneContainers(scene:Scene): SceneObject[] {
    const containers: SceneObject[] = [];

    if (!scene?.objects) return containers;

    for (const [id, obj] of Object.entries(scene.objects)) {
      if (obj.isContainer) {
        containers.push(obj);
      }
    }

    return containers;
  }

  /**
   * Get the contents of a container
   * @param containerId ID of container to check
   * @returns Array of item IDs in the container
   */
  private getContainerContentIDs(containerId: string): string[] {
    return this.getObjectData<string[]>(containerId, 'contents') || [];
  }

  // Container state methods
  private setContainerOpen(containerId: string, isOpen: boolean): void {
    const flag = `${containerId}Open`;
    if (isOpen) {
      this.setFlag(flag);
    } else {
      this.removeFlag(flag);
    }
  }

  /**
   * Set the contents of a container
   * @param containerId ID of container to update
   * @param contents New contents array
   */
  private setContents(containerId: string, contents: string[]): void {
    this.setObjectData(containerId, 'contents', contents);
  }
}

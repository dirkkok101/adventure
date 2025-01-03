import {Injectable} from '@angular/core';
import {CommandResponse, SceneObject} from '../../models';
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
   * @param containerId ID of the container to add to
   * @param itemId ID of the item to add
   * @returns CommandResponse indicating success/failure
   */
  addToContainer(containerId: string, itemId: string): CommandResponse {
    const container = this.getValidContainer(containerId);
    if (!container) {
      return {
        success: false,
        message: this.gameTextService.get('error.invalidContainer'),
        incrementTurn: false
      };
    }

    if (!this.isLocked(containerId)) {
      return {
        success: false,
        message: this.gameTextService.get('error.containerLocked', {container: container.name}),
        incrementTurn: false
      };
    }

    if (!this.isOpen(containerId)) {
      return {
        success: false,
        message: this.gameTextService.get('error.containerClosed', {container: container.name}),
        incrementTurn: false
      };
    }

    const contents = this.getContents(containerId);
    if (container.capacity && contents.length >= container.capacity) {
      return {
        success: false,
        message: this.gameTextService.get('error.containerFull', {container: container.name}),
        incrementTurn: false
      };
    }

    this.setContents(containerId, [...contents, itemId]);

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
   * Updates game state to reflect the removal
   * @param containerId ID of the container to remove from
   * @param itemId ID of the item to remove
   * @returns CommandResponse indicating success/failure
   */
  removeFromContainer(containerId: string, itemId: string): CommandResponse {
    const container = this.getValidContainer(containerId);
    if (!container) {
      return {
        success: false,
        message: this.gameTextService.get('error.invalidContainer'),
        incrementTurn: false
      };
    }

    if (!this.isLocked(containerId)) {
      return {
        success: false,
        message: this.gameTextService.get('error.containerLocked', {container: container.name}),
        incrementTurn: false
      };
    }

    if (!this.isOpen(containerId)) {
      return {
        success: false,
        message: this.gameTextService.get('error.containerClosed', {container: container.name}),
        incrementTurn: false
      };
    }

    const contents = this.getContents(containerId);
    if (!contents.includes(itemId)) {
      return {
        success: false,
        message: this.gameTextService.get('error.itemNotInContainer', {
          container: container.name
        }),
        incrementTurn: false
      };
    }

    this.setContents(containerId, contents.filter(id => id !== itemId));

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
   * @param objectId The ID of the item to check
   * @returns The container object or null if not in a container
   */
  findContainerWithItem(objectId: string): SceneObject | null {
    const containers = this.getSceneContainers();

    for (const [containerId, container] of containers) {
      if (this.getContents(containerId).includes(objectId)) {
        return container;
      }
    }

    return null;
  }

  /**
   * Check if an item is currently in any container
   * @param objectId ID of the item to check
   * @returns True if the item is in a container, false otherwise
   */
  isInContainer(objectId: string): boolean {
    return this.findContainerWithItem(objectId) !== null;
  }

  /**
   * Get the container that holds a specific item
   * @param objectId ID of the item to check
   * @returns ID of the container holding the item, or null if not in any container
   */
  getContainerFor(objectId: string): string | null {
    const container = this.findContainerWithItem(objectId);
    return container ? container.id : null;
  }

  /**
   * Get a description of a container's contents
   * @param container Container to describe
   * @returns Description of container contents
   */
  getContainerContents(container: SceneObject): string {
    if (!container.isContainer) {
      return '';
    }

    const contents = this.getContents(container.id);
    if (!contents.length) {
      return container.descriptions.empty || this.gameTextService.get('container.empty');
    }

    const scene = this.sceneMechanicsService.getCurrentScene();
    if (!scene?.objects) {
      return this.gameTextService.get('error.sceneNotFound');
    }

    // Build list of visible contents with type safety
    const visibleContents: string[] = [];
    for (const id of contents) {
      const obj = scene.objects[id];
      if (obj) {
        visibleContents.push(obj.name);
      }
    }

    if (!visibleContents.length) {
      return container.descriptions.empty || this.gameTextService.get('container.empty');
    }

    const contentList = visibleContents.join(', ');
    return container.descriptions.contents ?
      container.descriptions.contents.replace('{items}', contentList) :
      this.gameTextService.get('container.contents', {items: contentList});
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
   * @param containerId ID of container to open
   * @returns CommandResponse indicating success/failure
   */
  openContainer(containerId: string): CommandResponse {
    const container = this.getValidContainer(containerId);
    if (!container) {
      return {
        success: false,
        message: this.gameTextService.get('error.invalidContainer', {container: containerId}),
        incrementTurn: false
      };
    }

    if (this.isLocked(containerId)) {
      return {
        success: false,
        message: this.gameTextService.get('container.locked', {container: container.name}),
        incrementTurn: false
      };
    }

    if (this.isOpen(containerId)) {
      return {
        success: false,
        message: this.gameTextService.get('container.alreadyOpen', {container: container.name}),
        incrementTurn: false
      };
    }

    this.setContainerOpen(containerId, true);

    this.getContainerContents(container);

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
   * @param containerId ID of container to close
   * @returns CommandResponse indicating success/failure
   */
  closeContainer(containerId: string): CommandResponse {
    const container = this.getValidContainer(containerId);
    if (!container) {
      return {
        success: false,
        message: this.gameTextService.get('error.invalidContainer', {container: containerId}),
        incrementTurn: false
      };
    }

    if (!this.isOpen(containerId)) {
      return {
        success: false,
        message: this.gameTextService.get('container.alreadyClosed', {container: container.name}),
        incrementTurn: false
      };
    }

    this.setContainerOpen(containerId, false);

    return {
      success: true,
      message: this.gameTextService.get('container.close', {container: container.name}),
      incrementTurn: true
    };
  }

  /**
   * Check if a container exists and is valid
   * @param containerId ID of container to validate
   * @returns The container object if valid, null otherwise
   */
  private getValidContainer(containerId: string): SceneObject | null {
    const scene = this.sceneMechanicsService.getCurrentScene();
    const container = scene?.objects?.[containerId];
    if (!container) return null;

    return container.isContainer ? container : null;
  }

  /**
   * Get all containers in the current scene
   * @returns Map of container ID to container object
   */
  public getSceneContainers(): Map<string, SceneObject> {
    const scene = this.sceneMechanicsService.getCurrentScene();
    const containers = new Map<string, SceneObject>();

    if (!scene?.objects) return containers;

    for (const [id, obj] of Object.entries(scene.objects)) {
      if (obj.isContainer) {
        containers.set(id, obj);
      }
    }

    return containers;
  }

  /**
   * Get the contents of a container
   * @param containerId ID of container to check
   * @returns Array of item IDs in the container
   */
  private getContents(containerId: string): string[] {
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

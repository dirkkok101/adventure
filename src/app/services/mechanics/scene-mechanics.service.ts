import {Injectable} from '@angular/core';
import {GameStateService} from '../game-state.service';
import {CommandResponse, Scene, SceneObject} from '../../models';
import {GameTextService} from '../game-text.service';
import {scenes, startingScene} from '../../data/scenes';
import {MechanicsBaseService} from './mechanics-base.service';

/**
 * Service responsible for managing game scenes and their states.
 * Handles scene transitions, object interactions, and exit management.
 *
 * Key responsibilities:
 * - Scene state management and transitions
 * - Object visibility and state tracking
 * - Exit availability and state management
 * - Scene description generation based on state
 * - Object and exit interaction handling
 *
 * State Dependencies:
 * - Uses FlagMechanicsService for all state operations
 * - Uses GameStateService for scene transitions
 * - Uses GameTextService for text generation
 * - Uses ProgressMechanicsService for turn tracking
 *
 * Error Handling:
 * - Validates all inputs before processing
 * - Maintains state consistency on error
 * - Provides descriptive error messages
 *
 * Flag Usage:
 * Scene State Flags:
 * - [sceneId]_visited: Tracks if a scene has been visited
 * - [sceneId]_[state]: Scene-specific state flags (e.g., rugMoved, trapdoorOpen)
 *
 * Object State Flags:
 * - has[ObjectId]: Tracks if an object is in inventory (e.g., hasSword, hasLantern)
 * - [objectId]On: Tracks if an object is turned on (e.g., lanternOn)
 * - [objectId]Dead: Tracks if an object is depleted (e.g., lanternDead)
 * - [objectId]Moved: Tracks if an object has been moved
 * - [objectId]Open: Tracks if a container/door is open
 * - [objectId]Locked: Tracks if a container/door is locked
 * - [objectId]Revealed: Tracks if a hidden object is revealed
 *
 * Special Flags:
 * - hasLight: Global lighting state
 * - hasTreasure: Tracks if any treasures are stored
 */
@Injectable({
  providedIn: 'root'
})
export class SceneMechanicsService extends MechanicsBaseService {
  /** Map of all game scenes indexed by scene ID */
  private readonly scenes: { [key: string]: Scene } = scenes;

  constructor(
    gameStateService: GameStateService,
    private gameTextService: GameTextService,
  ) {
    super(gameStateService);
  }


  /**
   * Check if a scene has been visited
   *
   * @param sceneId ID of scene to check
   * @returns Whether the scene has been visited
   * @throws Error if scene is not found
   */
  isSceneVisited(sceneId: string): boolean {
    if (!this.scenes[sceneId]) {
      throw new Error(`Scene not found: ${sceneId}`);
    }
    return this.hasFlag(`${sceneId}_visited`);
  }

  setSceneVisited(sceneId: string, visited: boolean = true): void {
    if (!this.scenes[sceneId]) {
      throw new Error(`Scene not found: ${sceneId}`);
    }
    const flag = `${sceneId}_visited`;
    if (visited) {
      this.setFlag(flag);
    } else {
      this.removeFlag(flag);
    }
  }

  setSceneDark(sceneId: string, isDark: boolean = true): void {
    if (!this.scenes[sceneId]) {
      throw new Error(`Scene not found: ${sceneId}`);
    }
    const flag = `${sceneId}_dark`;
    if (isDark) {
      this.setFlag(flag);
    } else {
      this.removeFlag(flag);
    }
  }

  isSceneDark(sceneId: string): boolean {
    if (!this.scenes[sceneId]) {
      throw new Error(`Scene not found: ${sceneId}`);
    }
    return this.hasFlag(`${sceneId}_dark`);
  }

  setSceneUnderwater(sceneId: string, isUnderwater: boolean = true): void {
    if (!this.scenes[sceneId]) {
      throw new Error(`Scene not found: ${sceneId}`);
    }
    const flag = `${sceneId}_underwater`;
    if (isUnderwater) {
      this.setFlag(flag);
    } else {
      this.removeFlag(flag);
    }
  }

  isSceneUnderwater(sceneId: string): boolean {
    if (!this.scenes[sceneId]) {
      throw new Error(`Scene not found: ${sceneId}`);
    }
    return this.hasFlag(`${sceneId}_underwater`);
  }

  setSceneFlooded(sceneId: string, isFlooded: boolean = true): void {
    if (!this.scenes[sceneId]) {
      throw new Error(`Scene not found: ${sceneId}`);
    }
    const flag = `${sceneId}_flooded`;
    if (isFlooded) {
      this.setFlag(flag);
    } else {
      this.removeFlag(flag);
    }
  }

  isSceneFlooded(sceneId: string): boolean {
    if (!this.scenes[sceneId]) {
      throw new Error(`Scene not found: ${sceneId}`);
    }
    return this.hasFlag(`${sceneId}_flooded`);
  }


  /**
   * Get the start scene of the game
   * @returns The starting scene
   * @throws Error if starting scene is not found
   */
  getStartScene(): Scene {
    const scene = this.scenes[startingScene];
    if (!scene) {
      throw new Error('Starting scene not found');
    }
    return scene;
  }

  /**
   * Get a scene by ID with its current state
   * Merges base scene data with current state data
   *
   * @param id Scene ID to retrieve
   * @returns Scene with current state
   * @throws Error if scene is not found
   */
  getScene(id: string): Scene {
    if (!id) {
      throw new Error('Scene ID is required');
    }

    const baseScene = this.scenes[id];
    if (!baseScene) {
      throw new Error(`Scene not found: ${id}`);
    }

    try {
      // Return scene with current state
      return {
        ...baseScene,
        visited: this.isSceneVisited(id),
        objects: baseScene.objects ? Object.entries(baseScene.objects).reduce((acc, [objId, obj]) => {
          return {
            ...acc,
            [objId]: {
              ...obj,
              isOpen: obj.isContainer ? this.containerIsOpen(objId) : undefined,
              isLocked: this.containerIsLocked(objId),
              visibleOnEntry: obj.visibleOnEntry || this.isObjectRevealed(objId)
            }
          };
        }, {}) : undefined
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to get scene state: ${message}`);
    }
  }

  /**
   * Get the current scene based on game state
   * @returns Current scene with state
   * @throws Error if current scene is not found
   */
  getCurrentScene(): Scene {
    try {
      const state = this.gameStateService.getCurrentState();
      return this.getScene(state.currentScene);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to get current scene: ${message}`);
    }
  }

  /**
   * Get the appropriate description for a scene
   * Handles darkness, state-based descriptions, and visible objects
   *
   * @param scene Scene to get description for
   * @returns Formatted scene description
   * @throws Error if scene is invalid or description generation fails
   */
  getSceneDescription(scene: Scene): string {
    if (!scene) {
      throw new Error('Scene is required');
    }

    try {
      // Get base description based on state flags
      let description = '';
      if (scene.descriptions.states) {
        // Check each state description
        for (const [flagCombo, desc] of Object.entries(scene.descriptions.states)) {
          const flags = flagCombo.split(',');
          if (this.checkFlags(flags)) {
            description = desc;
            break;
          }
        }
      }

      // If no state description matched, use visited or default
      if (!description) {
        description = this.isSceneVisited(scene.id) && scene.descriptions.visited ?
          scene.descriptions.visited :
          scene.descriptions.default;
      }

      return description;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to get scene description: ${message}`);
    }
  }

  /**
   * Find an object in the current scene by name
   * Tries exact match first, then partial match
   *
   * @param objectName Name of object to find
   * @returns Found object or null
   * @throws Error if object is not found
   */
  findObject(objectName: string): SceneObject | null {
    const scene = this.getCurrentScene();
    if (!scene?.objects) {
      throw new Error('No current scene');
    }

    // First try exact match
    const exactMatch = Object.values(scene.objects).find(obj =>
      obj.name.toLowerCase() === objectName.toLowerCase()
    );
    if (exactMatch) return exactMatch;

    // Then try partial match
    const partialMatch = Object.values(scene.objects).find(obj =>
      obj.name.toLowerCase().includes(objectName.toLowerCase())
    );
    return partialMatch || null;
  }

  /**
   * Find an object by its ID in any scene
   *
   * @param objectId ID of the object to find
   * @returns Found object or null
   * @throws Error if object is not found
   */
  findObjectById(objectId: string): SceneObject | null {
    // Search all scenes for the object
    for (const scene of Object.values(this.scenes)) {
      if (scene.objects?.[objectId]) {
        return scene.objects[objectId];
      }
    }
    throw new Error(`Object not found: ${objectId}`);
  }

  /**
   * Add an object to the current scene
   *
   * @param object Object to add to the scene
   * @returns Success status and message
   * @throws Error if scene is not found or object is already in scene
   */
  addObjectToScene(object: SceneObject): CommandResponse {
    const scene = this.getCurrentScene();
    if (!scene) {
      return {
        success: false,
        message: this.gameTextService.get('error.noScene'),
        incrementTurn: false
      };
    }

    const sceneObject = this.findObjectById(object.id);
    if (sceneObject) {
      return {
        success: false,
        message: this.gameTextService.get('scene.objectAlreadyInScene', {item: object.name}),
        incrementTurn: false
      };
    }

    // Mark object as revealed
    this.setObjectRevealed(object.id, true);

    // Add to scene objects
    scene.objects = {
      ...scene.objects,
      [object.id]: object
    };

    return {
      success: true,
      message: this.gameTextService.get('scene.addObject', {item: object.name, scene: scene.name}),
      incrementTurn: true
    };
  }

  /**
   * Remove an object from the current scene
   *
   * @param objectId ID of object to remove
   * @returns Success status and message
   * @throws Error if scene is not found or object is not in scene
   */
  removeObjectFromScene(objectId: string): CommandResponse {
    const scene = this.getCurrentScene();
    if (!scene) {
      return {
        success: false,
        message: this.gameTextService.get('error.noScene'),
        incrementTurn: false
      };
    }

    const sceneObject = this.findObjectById(objectId);
    if (sceneObject === null) {
      return {
        success: false,
        message: this.gameTextService.get('scene.objectNotInScene', {item: objectId}),
        incrementTurn: false
      };
    }

    // Remove from scene objects
    const {[objectId]: _, ...remainingObjects} = scene.objects || {};
    scene.objects = remainingObjects;

    return {
      success: true,
      message: this.gameTextService.get('scene.removeObject', {item: sceneObject.name, scene: scene.name}),
      incrementTurn: true
    };
  }
}

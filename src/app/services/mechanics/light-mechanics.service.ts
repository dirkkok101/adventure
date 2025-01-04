import {Injectable} from '@angular/core';
import {SceneMechanicsService} from './scene-mechanics.service';
import {CommandResponse, Scene, SceneObject} from '../../models';
import {InventoryMechanicsService} from './inventory-mechanics.service';
import {MechanicsBaseService} from './mechanics-base.service';
import {GameStateService} from '../game-state.service';
import {GameTextService} from '../game-text.service';

/**
 * Service responsible for managing light-related game mechanics.
 * Handles all aspects of lighting and visibility in the game.
 *
 * Key Responsibilities:
 * - Light source management
 * - Scene illumination tracking
 * - Object visibility control
 * - Battery/power simulation
 * - Light-dependent interactions
 *
 * State Dependencies:
 * - SceneMechanicsService: Scene context
 * - InventoryMechanicsService: Light source possession
 *
 * Error Handling:
 * - Validates light source operations
 * - Maintains lighting consistency
 * - Provides detailed error messages
 * - Handles power depletion gracefully
 *
 * Light Source Rules:
 * - Sources can be turned on/off
 * - Battery-powered sources deplete
 * - Sources affect global lighting
 * - Some scenes have natural light
 * - Light required for certain actions
 *
 * Visibility Rules:
 * - Inventory items always visible
 * - Some objects naturally visible
 * - Dark scenes require light source
 * - Hidden objects need revelation
 *
 * Flag Usage:
 * Light State Flags:
 * - [sourceId]On: Light source active state
 * - [sourceId]Dead: Battery depletion
 * - hasLight: Global lighting state
 * - [sceneId]_dark: Scene darkness state
 *
 * Related Services:
 * - SceneMechanicsService: For scene lighting state
 * - InventoryMechanicsService: For light source access
 * - ContainerMechanicsService: For container visibility
 */
@Injectable({
  providedIn: 'root'
})
export class LightMechanicsService extends MechanicsBaseService {
  /**
   * Number of game turns the lantern battery will last
   * @private
   */
  private readonly LANTERN_BATTERY_LIFE = 100;

  constructor(
    private inventoryMechanics: InventoryMechanicsService,
    private gameTextService: GameTextService,
    gameStateService: GameStateService
  ) {
    super(gameStateService)
  }

  /**
   * Checks if there is currently light in the scene
   * @returns Promise<boolean> True if the scene is illuminated
   * @throws Error if light state cannot be calculated
   */
  isLightPresent(scene: Scene): boolean {
    if (!scene || scene.objects === undefined) {
      throw new Error('Invalid scene object');
    }

    return this.calculateLightPresence(scene);
  }

  /**
   * Check if there is global light
   * Either from natural light or a light source
   * @returns Whether there is global light
   */
  hasGlobalLight(): boolean {
    return this.hasFlag('hasLight');
  }

  /**
   * Determines if an object is currently visible
   * Objects are visible if:
   * - They are in the player's inventory
   * - They are naturally visible (visibleOnEntry)
   * - They have been revealed by game actions
   *
   * @param object Object to check visibility for
   * @returns Promise<boolean> True if the object is currently visible
   * @throws Error if object visibility cannot be determined
   */
  isObjectVisible(object: SceneObject): boolean {
    if (!object) {
      throw new Error('Invalid scene object');
    }

    // Always visible if in inventory
    if (this.inventoryMechanics.hasItem(object)) {
      return true;
    }

    // Check if naturally visible
    if (object.visibleOnEntry) {
      return true;
    }

    // Check if revealed by other actions
    return this.isObjectRevealed(object.id);
  }

  /**
   * Checks if an object is a light source
   * @returns True if object can provide light
   * @param object
   */
  isLightSource(object: SceneObject): boolean {
    return this.hasObjectFlag(object.id, 'providesLight');
  }

  /**
   * Handles turning a light source on or off
   * - Validates the object is a light source
   * - Checks if the source is depleted
   * - Updates global light state
   *
   * @param scene
   * @param lightSource
   * @param turnOn Whether to turn the source on or off
   * @returns Promise<{ success: boolean; message: string }> Success status and message
   * @throws Error if light source state cannot be updated
   */
  switchLightSourceOnOff(scene: Scene, lightSource: SceneObject, turnOn: boolean): CommandResponse {
    if (!scene || scene.objects === undefined) {
      throw new Error('Invalid scene object');
    }

    if (!lightSource) {
      throw new Error('Invalid light source');
    }

      if (!lightSource?.providesLight) {
        return {
          success: false,
          message: this.gameTextService.get('light.notLightSource', { item : lightSource?.name ?? ''}),
          incrementTurn: false
        };
      }

      // Check if light source is in inventory
      if (!this.inventoryMechanics.hasItem(lightSource)) {
        return {
          success: false,
          message: this.gameTextService.get('error.notHoldingItem', { item : lightSource.name}),
          incrementTurn: false
        };
      }

      if (turnOn) {
        if (this.isLightSourceDead(lightSource.id)) {
          return {
            success: false,
            message: this.gameTextService.get('light.isDead', { item : lightSource.name}),
            incrementTurn: false
          };
        }
        this.setLightSourceOn(lightSource.id, true);
        this.updateLightState(scene);
        return {
          success: true,
          message: this.gameTextService.get('light.isOn', { item : lightSource.name}),
          incrementTurn: true
        };
      } else {
        this.setLightSourceOn(lightSource.id, false);
        this.updateLightState(scene);
        return {
          success: true,
          message: this.gameTextService.get('light.isOff', { item : lightSource.name}),
          incrementTurn: true
        };
      }
  }

  private setLightSourceOn(sourceId: string, isOn: boolean): void {
    const flag = `${sourceId}On`;
    if (isOn) {
      this.setFlag(flag);
    } else {
      this.removeFlag(flag);
    }
  }

  private isLightSourceOn(sourceId: string): boolean {
    return this.hasFlag(`${sourceId}On`);
  }

  private setLightSourceDead(sourceId: string, isDead: boolean): void {
    const flag = `${sourceId}Dead`;
    if (isDead) {
      this.setFlag(flag);
    } else {
      this.removeFlag(flag);
    }
  }



  /**
   * Set global light state
   * @param hasLight Whether there is global light
   */
  private setGlobalLight(hasLight: boolean): void {
    if (hasLight) {
      this.setFlag('hasLight');
    } else {
      this.removeFlag('hasLight');
    }
  }

  private isLightSourceDead(sourceId: string): boolean {
    return this.hasFlag(`${sourceId}Dead`);
  }

  /**
   * Calculates whether light is present in the current scene
   * Considers:
   * - Natural scene lighting
   * - Active light sources in inventory
   * - Light source power status
   *
   * @private
   * @returns Promise<boolean> True if the current scene is illuminated
   * @throws Error if scene data is invalid
   */
  private calculateLightPresence(scene: Scene): boolean {
    if (!scene || scene.objects === undefined) {
      throw new Error('Invalid scene object');
    }

    // Check scene natural light
    if (scene.light) {
      return true;
    }

    // Get all the light sources in the scene
    const lightSources = this.getLightSources(scene);

    // Check if any light source is in inventory, is not dead and is on
    for (const lightSource of lightSources) {
      if (this.inventoryMechanics.hasItem(lightSource) &&
        this.isLightSourceOn(lightSource.id) &&
        !this.isLightSourceDead(lightSource.id)) {
        return true;
      }
    }

    return false;
  }

  public getLightSources(scene: Scene): SceneObject[] {
    if (!scene || scene.objects === undefined) {
      throw new Error('Invalid scene object');
    }

    return Object.values(scene.objects)
      .filter(obj => obj.providesLight);
  }

  /**
   * Updates the global light state based on all light sources
   * Sets or removes the 'hasLight' flag based on current conditions
   * @private
   * @throws Error if light state update fails
   */
  private updateLightState(scene: Scene): void {
    if (!scene || scene.objects === undefined) {
      throw new Error('Invalid scene object');
    }
    const hasLight = this.calculateLightPresence(scene);
    this.setGlobalLight(hasLight);
  }
}

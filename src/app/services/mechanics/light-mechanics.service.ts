import {Injectable} from '@angular/core';
import {SceneMechanicsService} from './scene-mechanics.service';
import {CommandResponse, SceneObject} from '../../models';
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
    private sceneService: SceneMechanicsService,
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
  isLightPresent(): boolean {
    try {
      return this.calculateLightPresence();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to check light presence: ${message}`);
    }
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
    try {
      // Always visible if in inventory
      if (this.inventoryMechanics.hasItem(object.id)) {
        return true;
      }

      // Check if naturally visible
      if (object.visibleOnEntry) {
        return true;
      }

      // Check if revealed by other actions
      return this.isObjectRevealed(object.id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to check object visibility: ${message}`);
    }
  }

  /**
   * Checks if an object is a light source
   * @param objectId ID of object to check
   * @returns True if object can provide light
   */
  isLightSource(objectId: string): boolean {
    return this.hasObjectFlag(objectId, 'providesLight');
  }

  /**
   * Handles turning a light source on or off
   * - Validates the object is a light source
   * - Checks if the source is depleted
   * - Updates global light state
   *
   * @param objectId ID of the light source
   * @param turnOn Whether to turn the source on or off
   * @returns Promise<{ success: boolean; message: string }> Success status and message
   * @throws Error if light source state cannot be updated
   */
  switchLightSourceOnOff(objectId: string, turnOn: boolean): CommandResponse {

      const scene = this.sceneService.getCurrentScene();
      const lightSource = scene?.objects?.[objectId];

      if (!lightSource?.providesLight) {
        return {
          success: false,
          message: this.gameTextService.get('light.notLightSource', { item : lightSource?.name ?? ''}),
          incrementTurn: false
        };
      }

      // Check if light source is in inventory
      if (!this.inventoryMechanics.hasItem(objectId)) {
        return {
          success: false,
          message: this.gameTextService.get('error.notHoldingItem', { item : lightSource.name}),
          incrementTurn: false
        };
      }

      if (turnOn) {
        if (this.isLightSourceDead(objectId)) {
          return {
            success: false,
            message: this.gameTextService.get('light.isDead', { item : lightSource.name}),
            incrementTurn: false
          };
        }
        this.setLightSourceOn(objectId, true);
        this.updateLightState();
        return {
          success: true,
          message: this.gameTextService.get('light.isOn', { item : lightSource.name}),
          incrementTurn: true
        };
      } else {
        this.setLightSourceOn(objectId, false);
        this.updateLightState();
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
  private calculateLightPresence(): boolean {
    const scene = this.sceneService.getCurrentScene();
    if (!scene) {
      throw new Error('Cannot calculate light presence: No current scene');
    }

    // Check scene natural light
    if (scene.light) {
      return true;
    }

    // Check for light sources in inventory
    const lightSources = Object.entries(scene.objects || {})
      .filter(([_, obj]) => obj.providesLight);

    for (const [id, _] of lightSources) {
      if (this.inventoryMechanics.hasItem(id) &&
        this.isLightSourceOn(id) &&
        !this.isLightSourceDead(id)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Updates the global light state based on all light sources
   * Sets or removes the 'hasLight' flag based on current conditions
   * @private
   * @throws Error if light state update fails
   */
  private updateLightState(): void {
    try {
      const hasLight = this.calculateLightPresence();
      this.setGlobalLight(hasLight);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to update light state: ${message}`);
    }
  }
}

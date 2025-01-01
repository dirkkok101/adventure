import { Injectable } from '@angular/core';
import { SceneMechanicsService } from './scene-mechanics.service';
import { Scene, SceneObject } from '../../models';
import { distinctUntilChanged, map } from 'rxjs';
import { FlagMechanicsService } from './flag-mechanics.service';
import { InventoryMechanicsService } from './inventory-mechanics.service';
import { ProgressMechanicsService } from './progress-mechanics.service';

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
 * - FlagMechanicsService: Light state flags
 * - SceneMechanicsService: Scene context
 * - InventoryMechanicsService: Light source possession
 * - ProgressMechanicsService: Turn tracking
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
export class LightMechanicsService {
    /**
     * Number of game turns the lantern battery will last
     * @private
     */
    private readonly LANTERN_BATTERY_LIFE = 100;

    constructor(
        private sceneService: SceneMechanicsService,
        private flagMechanics: FlagMechanicsService,
        private inventoryMechanics: InventoryMechanicsService,
        private progressMechanics: ProgressMechanicsService
    ) {
        // Monitor lantern usage
        this.progressMechanics.getProgress().pipe(
            map(progress => ({ turns: progress.turns, lanternOn: this.flagMechanics.isLightSourceOn('lantern') })),
            distinctUntilChanged((prev, curr) => 
                prev.turns === curr.turns && prev.lanternOn === curr.lanternOn
            )
        ).subscribe(({ turns, lanternOn }) => {
            this.handleLanternBattery(turns, lanternOn);
        });
    }

    /**
     * Manages lantern battery life based on usage
     * - Monitors turns elapsed while lantern is on
     * - Depletes battery when LANTERN_BATTERY_LIFE is reached
     * - Updates light state when battery dies
     * 
     * @param turns Current game turn count
     * @param lanternOn Whether the lantern is currently on
     * @private
     */
    private handleLanternBattery(turns: number, lanternOn: boolean): void {
        if (!lanternOn) return;

        if (turns >= this.LANTERN_BATTERY_LIFE) {
            this.setLightSourceDead('lantern');
        }
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
    private async calculateLightPresence(): Promise<boolean> {
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
            if (await this.inventoryMechanics.hasItem(id) && 
                this.flagMechanics.isLightSourceOn(id) &&
                !this.flagMechanics.isLightSourceDead(id)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Checks if there is currently light in the scene
     * @returns Promise<boolean> True if the scene is illuminated
     * @throws Error if light state cannot be calculated
     */
    async isLightPresent(): Promise<boolean> {
        try {
            return await this.calculateLightPresence();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new Error(`Failed to check light presence: ${message}`);
        }
    }

    /**
     * Updates the global light state based on all light sources
     * Sets or removes the 'hasLight' flag based on current conditions
     * @private
     * @throws Error if light state update fails
     */
    private async updateLightState(): Promise<void> {
        try {
            const hasLight = await this.calculateLightPresence();
            this.flagMechanics.setGlobalLight(hasLight);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new Error(`Failed to update light state: ${message}`);
        }
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
    async isObjectVisible(object: SceneObject): Promise<boolean> {
        try {
            // Always visible if in inventory
            if (await this.inventoryMechanics.hasItem(object.id)) {
                return true;
            }

            // Check if naturally visible
            if (object.visibleOnEntry) {
                return true;
            }

            // Check if revealed by other actions
            return this.flagMechanics.isObjectRevealed(object.id);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new Error(`Failed to check object visibility: ${message}`);
        }
    }

    /**
     * Handles turning a light source on or off
     * - Validates the object is a light source
     * - Checks if the source is depleted
     * - Updates global light state
     * 
     * @param sourceId ID of the light source
     * @param turnOn Whether to turn the source on or off
     * @returns Promise<{ success: boolean; message: string }> Success status and message
     * @throws Error if light source state cannot be updated
     */
    async handleLightSource(sourceId: string, turnOn: boolean): Promise<{ success: boolean; message: string }> {
        try {
            const scene = this.sceneService.getCurrentScene();
            const source = scene?.objects?.[sourceId];

            if (!source?.providesLight) {
                return { success: false, message: 'That is not a light source.' };
            }

            // Check if light source is in inventory
            if (!await this.inventoryMechanics.hasItem(sourceId)) {
                return { success: false, message: `You don't have the ${source.name}.` };
            }

            if (turnOn) {
                if (this.flagMechanics.isLightSourceDead(sourceId)) {
                    return { success: false, message: `The ${source.name} is dead.` };
                }
                this.flagMechanics.setLightSourceOn(sourceId, true);
                await this.updateLightState();
                return { success: true, message: `The ${source.name} is now on.` };
            } else {
                this.flagMechanics.setLightSourceOn(sourceId, false);
                await this.updateLightState();
                return { success: true, message: `The ${source.name} is now off.` };
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new Error(`Failed to update light source state: ${message}`);
        }
    }

    /**
     * Handle light source battery depletion
     * @param sourceId ID of the light source
     * @param isDead Whether the source is depleted
     * @throws Error if light source state cannot be updated
     */
    async setLightSourceDead(sourceId: string, isDead: boolean = true): Promise<void> {
        try {
            this.flagMechanics.setLightSourceDead(sourceId, isDead);
            if (isDead) {
                this.flagMechanics.setLightSourceOn(sourceId, false);
                await this.updateLightState();
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new Error(`Failed to update light source state: ${message}`);
        }
    }

    /**
     * Gets the current status of the lantern battery
     * - Reports if battery is dead
     * - Shows remaining turns if battery is still active
     * 
     * @returns Status message about lantern battery
     * @throws Error if battery status cannot be determined
     */
    async getLanternBatteryStatus(): Promise<string> {
        try {
            if (this.flagMechanics.isLightSourceDead('lantern')) {
                return 'The lantern battery is dead.';
            }
            const remainingTurns = Math.max(0, this.LANTERN_BATTERY_LIFE - this.progressMechanics.getTurns());
            return `The lantern battery has ${remainingTurns} turns remaining.`;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new Error(`Failed to get lantern status: ${message}`);
        }
    }
}

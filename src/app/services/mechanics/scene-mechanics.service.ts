import { Injectable } from '@angular/core';
import { GameStateService } from '../game-state.service';
import { Scene, SceneObject, SceneExit } from '../../models';
import { FlagMechanicsService } from './flag-mechanics.service';
import { GameTextService } from '../game-text.service';
import { Observable, map, catchError, of } from 'rxjs';
import { scenes, startingScene } from '../../data/scenes';
import { ProgressMechanicsService } from './progress-mechanics.service';

/**
 * Interface for sidebar information display
 */
interface SidebarInfo {
    /** Current location name */
    location: string;
    /** Current score */
    score: number;
    /** Maximum possible score */
    maxScore: number;
}

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
export class SceneMechanicsService {
    /** Map of all game scenes indexed by scene ID */
    private readonly scenes: { [key: string]: Scene } = scenes;

    constructor(
        private gameState: GameStateService,
        private flagMechanics: FlagMechanicsService,
        private gameText: GameTextService,
        private progressMechanics: ProgressMechanicsService
    ) {}

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
                visited: this.flagMechanics.isSceneVisited(id),
                objects: baseScene.objects ? Object.entries(baseScene.objects).reduce((acc, [objId, obj]) => {
                    return {
                        ...acc,
                        [objId]: {
                            ...obj,
                            isOpen: obj.isContainer ? this.flagMechanics.isObjectOpen(objId) : undefined,
                            isLocked: this.flagMechanics.isObjectLocked(objId),
                            visibleOnEntry: obj.visibleOnEntry || this.flagMechanics.isObjectRevealed(objId)
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
            const state = this.gameState.getCurrentState();
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
            // Check for darkness
            if (!this.flagMechanics.hasGlobalLight() && !scene.light) {
                return scene.descriptions.dark || this.gameText.get('scene.dark');
            }

            // Get base description based on state flags
            let description = '';
            if (scene.descriptions.states) {
                // Check each state description
                for (const [flagCombo, desc] of Object.entries(scene.descriptions.states)) {
                    const flags = flagCombo.split(',');
                    if (this.flagMechanics.checkFlags(flags)) {
                        description = desc;
                        break;
                    }
                }
            }

            // If no state description matched, use visited or default
            if (!description) {
                description = this.flagMechanics.isSceneVisited(scene.id) && scene.descriptions.visited ? 
                    scene.descriptions.visited : 
                    scene.descriptions.default;
            }

            // Add visible objects to the description
            const visibleObjects = this.getVisibleObjects(scene);
            if (visibleObjects.length > 0) {
                const objectNames = visibleObjects
                    .map(obj => obj.name.toLowerCase())
                    .join(', ');
                description += `\n\nYou can see: ${objectNames} here.`;
            }

            return description;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new Error(`Failed to get scene description: ${message}`);
        }
    }

    /**
     * Get visible objects in a scene
     * Objects are visible if they are either visible on entry or have been revealed
     * 
     * @param scene Scene to get objects from
     * @returns Array of visible objects
     * @throws Error if scene is invalid or object state check fails
     */
    getVisibleObjects(scene: Scene): SceneObject[] {
        if (!scene) {
            throw new Error('Scene is required');
        }

        try {
            if (!scene.objects) return [];

            return Object.values(scene.objects).filter(obj => {
                // Skip objects that require light if there's no light
                if (obj.requiresLight && !this.flagMechanics.hasGlobalLight()) {
                    return false;
                }

                // Object is visible if it's visible on entry or has been revealed
                const isVisible = obj.visibleOnEntry || this.flagMechanics.isObjectRevealed(obj.id);

                // If object is in a container, container must be open
                if (obj.isContainer) {
                    return isVisible && this.flagMechanics.isObjectOpen(obj.id);
                }

                return isVisible;
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new Error(`Failed to get visible objects: ${message}`);
        }
    }

    /**
     * Get available exits in a scene
     * Filters exits based on required flags and conditions
     * 
     * @param scene Scene to get exits from
     * @returns Array of available exits
     * @throws Error if scene is invalid or exit check fails
     */
    getAvailableExits(scene: Scene): SceneExit[] {
        if (!scene) {
            throw new Error('Scene is required');
        }

        try {
            if (!scene.exits) return [];

            return scene.exits.filter(exit => {
                // Skip exits that require light if there's no light
                if (exit.requiresLight && !this.flagMechanics.hasGlobalLight()) {
                    return false;
                }

                // Check if all required flags are set
                if (exit.requiredFlags) {
                    return this.flagMechanics.checkFlags(exit.requiredFlags);
                }

                return true;
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new Error(`Failed to get available exits: ${message}`);
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
    async findObject(objectName: string): Promise<SceneObject | null> {
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
     * Mark a scene as visited
     * 
     * @param sceneId ID of scene to mark as visited
     * @throws Error if scene is not found
     */
    markSceneVisited(sceneId: string): void {
        if (!this.scenes[sceneId]) {
            throw new Error(`Scene not found: ${sceneId}`);
        }
        this.flagMechanics.setSceneVisited(sceneId, true);
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
        return this.flagMechanics.isSceneVisited(sceneId);
    }

    /**
     * Update an object's state in a scene
     * 
     * @param sceneId ID of the scene containing the object
     * @param objectId ID of the object to update
     * @param updates Updates to apply to the object
     * @throws Error if scene or object is not found
     */
    updateObjectState(sceneId: string, objectId: string, updates: { isOpen?: boolean; isLocked?: boolean; isRevealed?: boolean }) {
        if (!this.scenes[sceneId]) {
            throw new Error(`Scene not found: ${sceneId}`);
        }
        if (!this.scenes[sceneId].objects?.[objectId]) {
            throw new Error(`Object not found in scene: ${objectId}`);
        }

        if (updates.isOpen !== undefined) {
            this.flagMechanics.setObjectOpen(objectId, updates.isOpen);
        }

        if (updates.isLocked !== undefined) {
            this.flagMechanics.setObjectLocked(objectId, updates.isLocked);
        }

        if (updates.isRevealed !== undefined) {
            this.flagMechanics.setObjectRevealed(objectId, updates.isRevealed);
        }
    }

    /**
     * Get an object's current state
     * 
     * @param objectId ID of the object to check
     * @returns Object's current state
     * @throws Error if object is not found
     */
    getObjectState(objectId: string): { isOpen?: boolean; isLocked?: boolean; isRevealed?: boolean } {
        const object = this.findObjectById(objectId);
        if (!object) {
            throw new Error(`Object not found: ${objectId}`);
        }
        return {
            isOpen: this.flagMechanics.isObjectOpen(objectId),
            isLocked: this.flagMechanics.isObjectLocked(objectId),
            isRevealed: this.flagMechanics.isObjectRevealed(objectId)
        };
    }

    /**
     * Add an object to the current scene
     * 
     * @param object Object to add to the scene
     * @returns Success status and message
     * @throws Error if scene is not found or object is already in scene
     */
    async addObjectToScene(object: SceneObject): Promise<{ success: boolean; message: string }> {
        const scene = this.getCurrentScene();
        if (!scene) {
            throw new Error('No current scene');
        }
        if (scene.objects?.[object.id]) {
            throw new Error(`Object already in scene: ${object.id}`);
        }

        // Mark object as revealed
        this.flagMechanics.setObjectRevealed(object.id, true);

        // Add to scene objects
        scene.objects = {
            ...scene.objects,
            [object.id]: object
        };

        return {
            success: true,
            message: `Added ${object.name} to scene`
        };
    }

    /**
     * Remove an object from the current scene
     * 
     * @param objectId ID of object to remove
     * @returns Success status and message
     * @throws Error if scene is not found or object is not in scene
     */
    async removeObjectFromScene(objectId: string): Promise<{ success: boolean; message: string }> {
        const scene = this.getCurrentScene();
        if (!scene) {
            throw new Error('No current scene');
        }
        if (!scene.objects?.[objectId]) {
            throw new Error(`Object not found in scene: ${objectId}`);
        }

        // Remove from scene objects
        const { [objectId]: _, ...remainingObjects } = scene.objects;
        scene.objects = remainingObjects;

        return {
            success: true,
            message: 'Object removed from scene'
        };
    }

    /**
     * Find an exit in the current scene by its direction or by an object name
     * 
     * @param nameOrDirection Name or direction of the exit to find
     * @returns The exit if found, null otherwise
     * @throws Error if scene is not found
     */
    findExit(nameOrDirection: string): SceneExit | null {
        const scene = this.getCurrentScene();
        if (!scene?.exits) {
            throw new Error('No current scene');
        }

        // First try to find by direction
        const exit = scene.exits.find(e => e.direction.toLowerCase() === nameOrDirection.toLowerCase());
        if (exit) return exit;

        // Then try to find by name in the description
        const byName = scene.exits.find(e => e.description.toLowerCase().includes(nameOrDirection.toLowerCase()));
        return byName || null;
    }

    /**
     * Open an exit in the current scene
     * 
     * @param exit Exit to open
     * @returns Success status, message, and optional score
     * @throws Error if exit is not found or cannot be opened
     */
    async openExit(exit: SceneExit): Promise<{ success: boolean; message: string; score?: number }> {
        if (!exit.isOpenable) {
            throw new Error(`Cannot open exit: ${exit.direction}`);
        }

        // Check for required flags
        if (exit.requiredFlags && !this.flagMechanics.checkFlags(exit.requiredFlags)) {
            throw new Error(`Cannot open exit: ${exit.direction}`);
        }

        // Check if locked
        if (this.flagMechanics.isObjectLocked(exit.direction)) {
            throw new Error(`Exit is locked: ${exit.direction}`);
        }

        // Check if already open
        if (this.flagMechanics.isObjectOpen(exit.direction)) {
            throw new Error(`Exit is already open: ${exit.direction}`);
        }

        // Set exit as open
        this.flagMechanics.setObjectOpen(exit.direction, true);

        return { 
            success: true, 
            message: exit.openMessage || `You open the ${exit.description}.`,
            score: exit.scoring?.open
        };
    }

    /**
     * Close an exit in the current scene
     * 
     * @param exit Exit to close
     * @returns Success status, message, and optional score
     * @throws Error if exit is not found or cannot be closed
     */
    async closeExit(exit: SceneExit): Promise<{ success: boolean; message: string; score?: number }> {
        if (!exit.isOpenable) {
            throw new Error(`Cannot close exit: ${exit.direction}`);
        }

        if (!this.flagMechanics.isObjectOpen(exit.direction)) {
            throw new Error(`Exit is already closed: ${exit.direction}`);
        }

        // Remove open flag
        this.flagMechanics.setObjectOpen(exit.direction, false);

        return { 
            success: true, 
            message: exit.closeMessage || `You close the ${exit.description}.`,
            score: exit.scoring?.close
        };
    }

    /**
     * Check if an exit is currently open
     * 
     * @param exit Exit to check
     * @returns Whether the exit is open
     * @throws Error if exit is not found
     */
    isExitOpen(exit: SceneExit): boolean {
        if (!exit.isOpenable) {
            throw new Error(`Exit is not openable: ${exit.direction}`);
        }
        return this.flagMechanics.isObjectOpen(exit.direction);
    }

    /**
     * Check if a scene is currently dark
     * 
     * @param sceneId ID of the scene to check
     * @returns True if the scene is dark
     * @throws Error if scene is not found
     */
    isSceneDark(sceneId: string): boolean {
        if (!this.scenes[sceneId]) {
            throw new Error(`Scene not found: ${sceneId}`);
        }
        return this.flagMechanics.isSceneDark(sceneId);
    }

    /**
     * Set the darkness state of a scene
     * 
     * @param sceneId ID of the scene to update
     * @param isDark Whether the scene is dark
     * @throws Error if scene is not found
     */
    setSceneDark(sceneId: string, isDark: boolean): void {
        if (!this.scenes[sceneId]) {
            throw new Error(`Scene not found: ${sceneId}`);
        }
        this.flagMechanics.setSceneDark(sceneId, isDark);
    }

    /**
     * Check if a scene is underwater
     * 
     * @param sceneId ID of the scene to check
     * @returns True if the scene is underwater
     * @throws Error if scene is not found
     */
    isSceneUnderwater(sceneId: string): boolean {
        if (!this.scenes[sceneId]) {
            throw new Error(`Scene not found: ${sceneId}`);
        }
        return this.flagMechanics.isSceneUnderwater(sceneId);
    }

    /**
     * Set the underwater state of a scene
     * 
     * @param sceneId ID of the scene to update
     * @param isUnderwater Whether the scene is underwater
     * @throws Error if scene is not found
     */
    setSceneUnderwater(sceneId: string, isUnderwater: boolean): void {
        if (!this.scenes[sceneId]) {
            throw new Error(`Scene not found: ${sceneId}`);
        }
        this.flagMechanics.setSceneUnderwater(sceneId, isUnderwater);
    }

    /**
     * Check if a scene is flooded
     * 
     * @param sceneId ID of the scene to check
     * @returns True if the scene is flooded
     * @throws Error if scene is not found
     */
    isSceneFlooded(sceneId: string): boolean {
        if (!this.scenes[sceneId]) {
            throw new Error(`Scene not found: ${sceneId}`);
        }
        return this.flagMechanics.isSceneFlooded(sceneId);
    }

    /**
     * Set the flooded state of a scene
     * 
     * @param sceneId ID of the scene to update
     * @param isFlooded Whether the scene is flooded
     * @throws Error if scene is not found
     */
    setSceneFlooded(sceneId: string, isFlooded: boolean): void {
        if (!this.scenes[sceneId]) {
            throw new Error(`Scene not found: ${sceneId}`);
        }
        this.flagMechanics.setSceneFlooded(sceneId, isFlooded);
    }

    /**
     * Get the current scene's description based on its state
     * Considers:
     * - Light conditions
     * - Underwater state
     * - Flooded state
     * - Custom state descriptions from scene data
     * 
     * @returns The appropriate scene description
     * @throws Error if scene is not found
     */
    getCurrentSceneDescription(): string {
        const scene = this.getCurrentScene();
        if (!scene) {
            throw new Error('No current scene');
        }

        // Check light conditions
        if (!this.flagMechanics.hasGlobalLight() && !scene.light) {
            return scene.descriptions.dark || 'It is pitch dark.';
        }

        // Check underwater state
        if (this.isSceneUnderwater(scene.id)) {
            return scene.descriptions.underwater || scene.descriptions.default;
        }

        // Check flooded state
        if (this.isSceneFlooded(scene.id)) {
            return scene.descriptions.flooded || scene.descriptions.default;
        }

        // Get base description based on state flags
        let description = '';
        if (scene.descriptions.states) {
            // Check each state description
            for (const [flagCombo, desc] of Object.entries(scene.descriptions.states)) {
                const flags = flagCombo.split(',');
                if (this.flagMechanics.checkFlags(flags)) {
                    description = desc;
                    break;
                }
            }
        }

        // If no state description matched, use visited or default
        if (!description) {
            description = this.flagMechanics.isSceneVisited(scene.id) && scene.descriptions.visited ? 
                scene.descriptions.visited : 
                scene.descriptions.default;
        }

        return description;
    }

    /**
     * Get visible object IDs in the current scene
     * 
     * @returns Array of visible object IDs
     * @throws Error if scene is not found
     */
    async getVisibleObjectIds(): Promise<string[]> {
        const scene = this.getCurrentScene();
        if (!scene?.objects) {
            throw new Error('No current scene');
        }

        // If it's dark and no light source, nothing is visible
        if (!this.flagMechanics.hasGlobalLight() && !scene.light) {
            return [];
        }

        // Filter objects based on visibility and container state
        const visibleObjects = Object.entries(scene.objects)
            .filter(([_, obj]) => {
                // Skip objects that require light if there's no light
                if (obj.requiresLight && !this.flagMechanics.hasGlobalLight()) {
                    return false;
                }

                // Object is visible if it's visible on entry or has been revealed
                const isVisible = obj.visibleOnEntry || this.flagMechanics.isObjectRevealed(obj.id);

                // If object is in a container, container must be open
                if (obj.isContainer) {
                    return isVisible && this.flagMechanics.isObjectOpen(obj.id);
                }

                return isVisible;
            })
            .map(([id, _]) => id);

        return visibleObjects;
    }

    /**
     * Get the container that an object is in, if any
     * @param objectId ID of object to check
     * @returns Container object if found, null if not in a container
     * @throws Error if scene is not found
     */
    getObjectContainer(objectId: string): SceneObject | null {
        const scene = this.getCurrentScene();
        if (!scene?.objects) {
            throw new Error('No current scene');
        }

        return Object.values(scene.objects).find(obj => 
            obj.isContainer && 
            obj.contents?.includes(objectId)
        ) || null;
    }

    /**
     * Check if an object is accessible
     * An object is accessible if:
     * - It is visible
     * - It is not in a closed container
     * - If it requires light, there must be light
     * 
     * @param objectId ID of object to check
     * @returns Whether the object is accessible
     */
    async isObjectAccessible(objectId: string): Promise<boolean> {
        const scene = this.getCurrentScene();
        if (!scene?.objects) {
            throw new Error('No current scene');
        }

        // Check if object exists in scene
        const obj = scene.objects[objectId];
        if (!obj) {
            return false;
        }

        // Check if object is visible
        const visibleObjects = await this.getVisibleObjectIds();
        if (!visibleObjects.includes(objectId)) {
            return false;
        }

        // Check if object is in a closed container
        const container = this.getObjectContainer(objectId);
        if (container && !this.flagMechanics.isObjectOpen(container.id)) {
            return false;
        }

        return true;
    }

    /**
     * Get sidebar information for the current scene
     * Includes location name, current score, and max score
     * 
     * @returns Sidebar information object
     * @throws Error if scene is not found
     */
    getSidebarInfo(): SidebarInfo {
        const scene = this.getCurrentScene();
        if (!scene) {
            throw new Error('No current scene');
        }

        return {
            location: scene.name,
            score: this.flagMechanics.getCurrentScore(),
            maxScore: this.flagMechanics.getMaxScore()
        };
    }

    /**
     * Check if a scene has a specific flag
     * 
     * @param sceneId ID of scene to check
     * @param flag Flag to check for
     * @returns Whether the scene has the flag
     * @throws Error if scene is not found
     */
    hasSceneFlag(sceneId: string, flag: string): boolean {
        if (!this.scenes[sceneId]) {
            throw new Error(`Scene not found: ${sceneId}`);
        }
        return this.flagMechanics.hasSceneFlag(sceneId, flag);
    }

    /**
     * Set a scene flag
     * 
     * @param sceneId ID of scene to update
     * @param flag Flag to set
     * @param value Value to set flag to
     * @throws Error if scene is not found
     */
    setSceneFlag(sceneId: string, flag: string, value: boolean): void {
        if (!this.scenes[sceneId]) {
            throw new Error(`Scene not found: ${sceneId}`);
        }
        this.flagMechanics.setSceneFlag(sceneId, flag, value);
    }

    /**
     * Check if an object has a specific flag
     * 
     * @param objectId ID of object to check
     * @param flag Flag to check for
     * @returns Whether the object has the flag
     * @throws Error if object is not found
     */
    hasObjectFlag(objectId: string, flag: string): boolean {
        const object = this.findObjectById(objectId);
        if (!object) {
            throw new Error(`Object not found: ${objectId}`);
        }
        return this.flagMechanics.hasObjectFlag(objectId, flag);
    }

    /**
     * Set an object flag
     * 
     * @param objectId ID of object to update
     * @param flag Flag to set
     * @param value Value to set flag to
     * @throws Error if object is not found
     */
    setObjectFlag(objectId: string, flag: string, value: boolean): void {
        const object = this.findObjectById(objectId);
        if (!object) {
            throw new Error(`Object not found: ${objectId}`);
        }
        this.flagMechanics.setObjectFlag(objectId, flag, value);
    }

    /**
     * Get all objects in a scene that match certain criteria
     * 
     * @param sceneId ID of scene to search
     * @param criteria Object containing criteria to match (e.g., { isContainer: true })
     * @returns Array of matching objects
     * @throws Error if scene is not found
     */
    getObjectsByCriteria(sceneId: string, criteria: Partial<SceneObject>): SceneObject[] {
        if (!this.scenes[sceneId]) {
            throw new Error(`Scene not found: ${sceneId}`);
        }

        const scene = this.getScene(sceneId);
        if (!scene.objects) return [];

        return Object.values(scene.objects).filter(obj => {
            return Object.entries(criteria).every(([key, value]) => {
                const objKey = key as keyof SceneObject;
                return obj[objKey] === value;
            });
        });
    }

    /**
     * Check if an exit is accessible in the current scene
     * An exit is accessible if:
     * - It exists in the current scene
     * - All required flags are set
     * - If it requires light, there is light
     * 
     * @param direction Direction or name of exit
     * @returns Whether the exit is accessible
     * @throws Error if exit is not found
     */
    isExitAccessible(direction: string): boolean {
        const exit = this.findExit(direction);
        if (!exit) {
            throw new Error(`Exit not found: ${direction}`);
        }

        // Check if exit requires light
        if (exit.requiresLight && !this.flagMechanics.hasGlobalLight()) {
            return false;
        }

        // Check required flags
        if (exit.requiredFlags && !this.flagMechanics.checkFlags(exit.requiredFlags)) {
            return false;
        }

        return true;
    }
}

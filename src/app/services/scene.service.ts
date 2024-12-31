import { Injectable } from '@angular/core';
import { GameStateService } from './game-state.service';
import { Scene, SceneObject, SceneExit, GameState } from '../models/game-state.model';
import { FlagMechanicsService } from './mechanics/flag-mechanics.service';
import { GameTextService } from './game-text.service';
import { Observable, map } from 'rxjs';
import { scenes, startingScene } from '../data/scenes';

interface SidebarInfo {
    location: string;
    score: number;
    maxScore: number;
}

@Injectable({
    providedIn: 'root'
})
export class SceneService {
    private scenes: { [key: string]: Scene } = scenes;

    constructor(
        private gameState: GameStateService,
        private flagMechanics: FlagMechanicsService,
        private gameText: GameTextService
    ) {}

    /**
     * Get the start scene of the game
     */
    getStartScene(): Scene | null {
        return this.scenes[startingScene] || null;
    }

    /**
     * Get a scene by ID with its current state
     * @param id Scene ID to retrieve
     */
    getScene(id: string): Scene | null {
        const baseScene = this.scenes[id];
        if (!baseScene) return null;

        const state = this.gameState.getCurrentState();
        const sceneState = state.sceneState[id];

        // Return scene with current state
        return {
            ...baseScene,
            visited: sceneState?.visited ?? false,
            objects: baseScene.objects ? Object.entries(baseScene.objects).reduce((acc, [objId, obj]) => {
                const objState = sceneState?.objects?.[objId];
                return {
                    ...acc,
                    [objId]: {
                        ...obj,
                        isOpen: objState?.isOpen ?? obj.isOpen,
                        isLocked: objState?.isLocked ?? obj.isLocked,
                        visibleOnEntry: objState?.isRevealed ?? obj.visibleOnEntry
                    }
                };
            }, {}) : undefined
        };
    }

    /**
     * Get the current scene based on game state
     */
    getCurrentScene(): Scene | null {
        const state = this.gameState.getCurrentState();
        return this.getScene(state.currentScene);
    }

    /**
     * Get the appropriate description for a scene
     * @param scene Scene to get description for
     */
    getSceneDescription(scene: Scene): string {
        const state = this.gameState.getCurrentState();

        // Check for darkness
        if (!state.light && !scene.light) {
            return scene.descriptions.dark || this.gameText.get('scene.dark');
        }

        // Get base description based on state flags
        let description = '';
        if (scene.descriptions.states) {
            // Check each state description
            for (const [flagCombo, desc] of Object.entries(scene.descriptions.states)) {
                const flags = flagCombo.split(',');
                const matches = flags.every(flag => {
                    if (flag.startsWith('!')) {
                        return !state.flags[flag.substring(1)];
                    }
                    return state.flags[flag];
                });

                if (matches) {
                    description = desc;
                    break;
                }
            }
        }

        // If no state description matched, use visited or default
        if (!description) {
            description = scene.visited && scene.descriptions.visited ? 
                scene.descriptions.visited : 
                scene.descriptions.default;
        }

        // Add visible objects to the description
        const visibleObjects = this.getVisibleObjects(scene);
        if (visibleObjects.length > 0) {
            // Filter out objects that are in containers
            const sceneState = state.sceneState[scene.id];
            const looseObjects = visibleObjects.filter(obj => {
                // Check if object is marked as revealed in scene state
                return sceneState?.objects?.[obj.id]?.isRevealed;
            });

            if (looseObjects.length > 0) {
                const objectNames = looseObjects
                    .map(obj => obj.name.toLowerCase())
                    .join(', ');
                description += `\n\nYou can see: ${objectNames} here.`;
            }
        }

        return description;
    }

    /**
     * Get visible objects in a scene
     * @param scene Scene to get objects from
     */
    getVisibleObjects(scene: Scene): SceneObject[] {
        if (!scene.objects) return [];

        const state = this.gameState.getCurrentState();
        const sceneState = state.sceneState[scene.id];

        return Object.values(scene.objects).filter(obj => {
            // Always show if visible on entry
            if (obj.visibleOnEntry) return true;

            // Object must be both revealed in scene state and in knownObjects to be visible
            return sceneState?.objects?.[obj.id]?.isRevealed === true && state.knownObjects.has(obj.id);
        });
    }

    /**
     * Get available exits in a scene
     * @param scene Scene to get exits from
     */
    getAvailableExits(scene: Scene): SceneExit[] {
        if (!scene.exits) return [];

        return scene.exits.filter(exit => {
            if (!exit.requiredFlags) return true;
            return this.flagMechanics.checkFlags(exit.requiredFlags);
        });
    }

    async findObject(objectName: string): Promise<SceneObject | null> {
        const scene = this.getCurrentScene();
        if (!scene?.objects) return null;

        // First try exact match
        const exactMatch = Object.values(scene.objects).find(obj => 
            obj.name.toLowerCase() === objectName.toLowerCase()
        );
        if (exactMatch) return exactMatch;

        // Then try partial match
        return Object.values(scene.objects).find(obj => 
            obj.name.toLowerCase().includes(objectName.toLowerCase())
        ) || null;
    }

    /**
     * Find an object by its ID in any scene
     * @param objectId ID of the object to find
     */
    findObjectById(objectId: string): SceneObject | null {
        // Search all scenes for the object
        for (const scene of Object.values(this.scenes)) {
            if (scene.objects?.[objectId]) {
                return scene.objects[objectId];
            }
        }
        return null;
    }

    /**
     * Mark a scene as visited and update its state
     * @param sceneId ID of scene to mark as visited
     */
    markSceneVisited(sceneId: string) {
        this.gameState.updateState(state => ({
            ...state,
            sceneState: {
                ...state.sceneState,
                [sceneId]: {
                    ...state.sceneState[sceneId],
                    visited: true,
                    objects: state.sceneState[sceneId]?.objects ?? {}
                }
            }
        }));
    }

    /**
     * Update an object's state in a scene
     * @param sceneId ID of the scene containing the object
     * @param objectId ID of the object to update
     * @param updates Updates to apply to the object
     */
    updateObjectState(sceneId: string, objectId: string, updates: { isOpen?: boolean; isLocked?: boolean; isRevealed?: boolean }) {
        this.gameState.updateState(state => ({
            ...state,
            sceneState: {
                ...state.sceneState,
                [sceneId]: {
                    ...state.sceneState[sceneId],
                    objects: {
                        ...state.sceneState[sceneId]?.objects,
                        [objectId]: {
                            ...state.sceneState[sceneId]?.objects?.[objectId],
                            ...updates
                        }
                    }
                }
            }
        }));
    }

    /**
     * Add an object to the current scene
     * @param object Object to add to the scene
     * @returns Success status and message
     */
    async addObjectToScene(object: SceneObject): Promise<{ success: boolean; message: string }> {
        const scene = this.getCurrentScene();
        if (!scene) {
            return {
                success: false,
                message: 'No current scene'
            };
        }

        // Add object to scene state
        this.gameState.updateState(state => ({
            ...state,
            sceneState: {
                ...state.sceneState,
                [scene.id]: {
                    ...state.sceneState[scene.id],
                    objects: {
                        ...state.sceneState[scene.id]?.objects,
                        [object.id]: {
                            ...state.sceneState[scene.id]?.objects?.[object.id],
                            isRevealed: true
                        }
                    }
                }
            }
        }));

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
     * @param objectId ID of object to remove
     * @returns Success status and message
     */
    async removeObjectFromScene(objectId: string): Promise<{ success: boolean; message: string }> {
        const scene = this.getCurrentScene();
        if (!scene) {
            return {
                success: false,
                message: 'No current scene'
            };
        }

        // Check if object exists in scene
        if (!scene.objects?.[objectId]) {
            return {
                success: false,
                message: 'Object not found in scene'
            };
        }

        // Remove object from scene state
        this.gameState.updateState(state => {
            const currentSceneState = state.sceneState[scene.id] || {
                visited: false,
                objects: {}
            };

            const { [objectId]: _, ...remainingObjects } = currentSceneState.objects;

            return {
                ...state,
                sceneState: {
                    ...state.sceneState,
                    [scene.id]: {
                        ...currentSceneState,
                        objects: remainingObjects
                    }
                }
            };
        });

        // Remove from scene objects
        const { [objectId]: _, ...remainingObjects } = scene.objects;
        scene.objects = remainingObjects;

        return {
            success: true,
            message: 'Object removed from scene'
        };
    }

    /**
     * Find an exit in the current scene by its direction or by an object name (like "door")
     * @param nameOrDirection Name or direction of the exit to find
     * @returns The exit if found, null otherwise
     */
    findExit(nameOrDirection: string): SceneExit | null {
        const scene = this.getCurrentScene();
        if (!scene?.exits) return null;

        // First try to find by direction
        const exit = scene.exits.find(e => e.direction.toLowerCase() === nameOrDirection.toLowerCase());
        if (exit) return exit;

        // Then try to find by name in the description
        const byName = scene.exits.find(e => e.description.toLowerCase().includes(nameOrDirection.toLowerCase()));
        return byName || null;
    }

    /**
     * Open an exit in the current scene
     * @param exit Exit to open
     * @returns Success status and message
     */
    async openExit(exit: SceneExit): Promise<{ success: boolean; message: string; score?: number }> {
        if (!exit.isOpenable) {
            return { 
                success: false, 
                message: `You can't open that.` 
            };
        }

        if (exit.isLocked) {
            return { 
                success: false, 
                message: exit.failedOpenMessage || `It's locked.` 
            };
        }

        const currentState = this.isExitOpen(exit);
        if (currentState) {
            return { 
                success: false, 
                message: `It's already open.` 
            };
        }

        // Update scene state
        this.gameState.updateState(state => {
            const scene = this.getCurrentScene();
            if (!scene) return state;

            return {
                ...state,
                sceneState: {
                    ...state.sceneState,
                    [scene.id]: {
                        ...state.sceneState[scene.id],
                        exits: {
                            ...state.sceneState[scene.id]?.exits,
                            [exit.direction]: {
                                ...state.sceneState[scene.id]?.exits?.[exit.direction],
                                isOpen: true
                            }
                        }
                    }
                }
            };
        });

        return { 
            success: true, 
            message: exit.openMessage || `You open the ${exit.description}.`,
            score: exit.scoring?.open
        };
    }

    /**
     * Close an exit in the current scene
     * @param exit Exit to close
     * @returns Success status and message
     */
    async closeExit(exit: SceneExit): Promise<{ success: boolean; message: string; score?: number }> {
        if (!exit.isOpenable) {
            return { 
                success: false, 
                message: `You can't close that.` 
            };
        }

        const currentState = this.isExitOpen(exit);
        if (!currentState) {
            return { 
                success: false, 
                message: `It's already closed.` 
            };
        }

        // Update scene state
        this.gameState.updateState(state => {
            const scene = this.getCurrentScene();
            if (!scene) return state;

            return {
                ...state,
                sceneState: {
                    ...state.sceneState,
                    [scene.id]: {
                        ...state.sceneState[scene.id],
                        exits: {
                            ...state.sceneState[scene.id]?.exits,
                            [exit.direction]: {
                                ...state.sceneState[scene.id]?.exits?.[exit.direction],
                                isOpen: false
                            }
                        }
                    }
                }
            };
        });

        return { 
            success: true, 
            message: exit.closeMessage || `You close the ${exit.description}.`,
            score: exit.scoring?.close
        };
    }

    /**
     * Check if an exit is currently open
     * @param exit Exit to check
     * @returns Whether the exit is open
     */
    isExitOpen(exit: SceneExit): boolean {
        if (!exit.isOpenable) return true; // Non-openable exits are always "open"
        
        const scene = this.getCurrentScene();
        if (!scene) return false;

        const state = this.gameState.getCurrentState();
        return state.sceneState[scene.id]?.exits?.[exit.direction]?.isOpen ?? exit.isOpen ?? false;
    }
}

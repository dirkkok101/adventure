import { Injectable } from '@angular/core';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { SceneObject } from '../../models/game-state.model';
import { FlagMechanicsService } from './flag-mechanics.service';

@Injectable({
    providedIn: 'root'
})
export class ContainerMechanicsService {
    constructor(
        private gameState: GameStateService,
        private sceneService: SceneService,
        private flagMechanics: FlagMechanicsService
    ) {}

    async canAddToContainer(containerId: string, itemId: string): Promise<boolean> {
        const state = this.gameState.getCurrentState();
        const scene = this.sceneService.getCurrentScene();
        
        if (!scene?.objects?.[containerId]) {
            return false;
        }

        const container = scene.objects[containerId];
        if (!container.isContainer || !this.isOpen(containerId)) {
            return false;
        }

        // Check capacity
        const currentContents = await this.getContainerContents(containerId);
        if (container.capacity && currentContents.length >= container.capacity) {
            return false;
        }

        return true;
    }

    async addToContainer(containerId: string, itemId: string): Promise<{ success: boolean; message: string }> {
        if (!await this.canAddToContainer(containerId, itemId)) {
            return {
                success: false,
                message: "You can't put that there."
            };
        }

        this.gameState.updateState(state => {
            const container = state.containers[containerId] || [];
            return {
                ...state,
                containers: {
                    ...state.containers,
                    [containerId]: [...container, itemId]
                }
            };
        });

        return {
            success: true,
            message: "Added to container."
        };
    }

    async removeFromContainer(containerId: string, itemId: string): Promise<{ success: boolean; message: string }> {
        const currentContents = await this.getContainerContents(containerId);
        
        if (!currentContents.includes(itemId)) {
            return {
                success: false,
                message: "That item isn't in there."
            };
        }

        this.gameState.updateState(state => {
            const container = state.containers[containerId] || [];
            return {
                ...state,
                containers: {
                    ...state.containers,
                    [containerId]: container.filter(id => id !== itemId)
                }
            };
        });

        return {
            success: true,
            message: "Removed from container."
        };
    }

    async getContainerContents(containerId: string): Promise<string[]> {
        return this.gameState.getCurrentState().containers[containerId] || [];
    }

    isOpen(containerId: string): boolean {
        return this.flagMechanics.isContainerOpen(containerId);
    }

    async openContainer(container: SceneObject): Promise<{ success: boolean; message: string }> {
        if (!container.isContainer) {
            return { success: false, message: 'That is not a container.' };
        }

        if (this.isOpen(container.id)) {
            return { success: false, message: 'It is already open.' };
        }

        if (container.isLocked) {
            return { success: false, message: 'It is locked.' };
        }

        // Set container as open
        this.flagMechanics.setContainerOpen(container.id, true);

        // Get the current scene
        const scene = this.sceneService.getCurrentScene();
        if (scene) {
            // Mark all contents as revealed
            const contents = await this.getContainerContents(container.id);
            
            // Update scene state and add to known objects
            this.gameState.updateState(state => ({
                ...state,
                knownObjects: new Set([...state.knownObjects, ...contents]),
                sceneState: {
                    ...state.sceneState,
                    [scene.id]: {
                        ...state.sceneState[scene.id],
                        objects: {
                            ...state.sceneState[scene.id]?.objects,
                            [container.id]: {
                                ...state.sceneState[scene.id]?.objects?.[container.id],
                                isOpen: true
                            },
                            ...contents.reduce((acc, itemId) => ({
                                ...acc,
                                [itemId]: {
                                    ...state.sceneState[scene.id]?.objects?.[itemId],
                                    isRevealed: true
                                }
                            }), {})
                        }
                    }
                }
            }));
        }

        return { success: true, message: `You open the ${container.name}.` };
    }

    async closeContainer(container: SceneObject): Promise<{ success: boolean; message: string }> {
        if (!container.isContainer) {
            return { success: false, message: 'That is not a container.' };
        }

        if (!this.isOpen(container.id)) {
            return { success: false, message: 'It is already closed.' };
        }

        // Set container as closed
        this.flagMechanics.setContainerOpen(container.id, false);

        // Get the current scene
        const scene = this.sceneService.getCurrentScene();
        if (scene) {
            // Mark all contents as not revealed
            const contents = await this.getContainerContents(container.id);
            
            // Update scene state and remove from known objects
            this.gameState.updateState(state => {
                const newKnownObjects = new Set(state.knownObjects);
                contents.forEach(id => newKnownObjects.delete(id));

                return {
                    ...state,
                    knownObjects: newKnownObjects,
                    sceneState: {
                        ...state.sceneState,
                        [scene.id]: {
                            ...state.sceneState[scene.id],
                            objects: {
                                ...state.sceneState[scene.id]?.objects,
                                [container.id]: {
                                    ...state.sceneState[scene.id]?.objects?.[container.id],
                                    isOpen: false
                                },
                                ...contents.reduce((acc, itemId) => ({
                                    ...acc,
                                    [itemId]: {
                                        ...state.sceneState[scene.id]?.objects?.[itemId],
                                        isRevealed: false
                                    }
                                }), {})
                            }
                        }
                    }
                };
            });
        }

        return { success: true, message: `You close the ${container.name}.` };
    }

    async putInContainer(item: SceneObject, container: SceneObject): Promise<{ success: boolean; message: string }> {
        // First check if it's a valid container
        if (!container.isContainer) {
            return {
                success: false,
                message: `The ${container.name} can't contain things.`
            };
        }

        // Check if container is open
        if (!this.isOpen(container.id)) {
            return {
                success: false,
                message: `The ${container.name} is closed.`
            };
        }

        // Check capacity
        const currentContents = await this.getContainerContents(container.id);
        if (container.capacity && currentContents.length >= container.capacity) {
            return {
                success: false,
                message: `The ${container.name} is full.`
            };
        }

        // Add to container
        await this.addToContainer(container.id, item.id);

        return {
            success: true,
            message: `You put the ${item.name} in the ${container.name}.`
        };
    }

    /**
     * Get the container that holds an item
     * @param itemId The ID of the item to check
     * @returns The container object or null if not in a container
     */
    findContainerWithItem(itemId: string): SceneObject | null {
        const state = this.gameState.getCurrentState();
        const scene = this.sceneService.getCurrentScene();
        if (!scene || !scene.objects) return null;

        const sceneObjects = scene.objects;  // Create a stable reference that TypeScript can track

        for (const [containerId, contents] of Object.entries(state.containers)) {
            if (contents.includes(itemId)) {
                return sceneObjects[containerId] || null;
            }
        }

        return null;
    }
}

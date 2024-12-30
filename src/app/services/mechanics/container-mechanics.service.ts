import { Injectable } from '@angular/core';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { SceneObject } from '../../models/game-state.model';

@Injectable({
    providedIn: 'root'
})
export class ContainerMechanicsService {
    constructor(
        private gameState: GameStateService,
        private sceneService: SceneService
    ) {}

    canAddToContainer(containerId: string, itemId: string): boolean {
        const state = this.gameState.getCurrentState();
        const scene = this.sceneService.getCurrentScene();
        
        if (!scene?.objects?.[containerId]) {
            return false;
        }

        const container = scene.objects[containerId];
        if (!container.isContainer || !container.isOpen) {
            return false;
        }

        // Check capacity
        const currentContents = state.containers[containerId] || [];
        if (container.capacity && currentContents.length >= container.capacity) {
            return false;
        }

        return true;
    }

    addToContainer(containerId: string, itemId: string): boolean {
        if (!this.canAddToContainer(containerId, itemId)) {
            return false;
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
        return true;
    }

    removeFromContainer(containerId: string, itemId: string): boolean {
        const state = this.gameState.getCurrentState();
        const currentContents = state.containers[containerId] || [];
        
        if (!currentContents.includes(itemId)) {
            return false;
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
        return true;
    }

    getContainerContents(containerId: string): string[] {
        return this.gameState.getCurrentState().containers[containerId] || [];
    }

    openContainer(container: SceneObject): { success: boolean; message: string } {
        if (!container.isContainer) {
            return { success: false, message: 'That is not a container.' };
        }

        if (container.isOpen) {
            return { success: false, message: 'It is already open.' };
        }

        if (container.isLocked) {
            return { success: false, message: 'It is locked.' };
        }

        this.gameState.updateState(state => ({
            ...state,
            flags: {
                ...state.flags,
                [`${container.id}_open`]: true
            }
        }));
        return { success: true, message: `You open the ${container.name}.` };
    }

    closeContainer(container: SceneObject): { success: boolean; message: string } {
        if (!container.isContainer) {
            return { success: false, message: 'That is not a container.' };
        }

        if (!container.isOpen) {
            return { success: false, message: 'It is already closed.' };
        }

        this.gameState.updateState(state => {
            const { [`${container.id}_open`]: _, ...remainingFlags } = state.flags;
            return {
                ...state,
                flags: remainingFlags
            };
        });
        return { success: true, message: `You close the ${container.name}.` };
    }
}

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

        this.flagMechanics.setContainerOpen(container.id, true);
        return { success: true, message: `You open the ${container.name}.` };
    }

    async closeContainer(container: SceneObject): Promise<{ success: boolean; message: string }> {
        if (!container.isContainer) {
            return { success: false, message: 'That is not a container.' };
        }

        if (!this.isOpen(container.id)) {
            return { success: false, message: 'It is already closed.' };
        }

        this.flagMechanics.setContainerOpen(container.id, false);
        return { success: true, message: `You close the ${container.name}.` };
    }
}

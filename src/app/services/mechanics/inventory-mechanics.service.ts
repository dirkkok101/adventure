import { Injectable } from '@angular/core';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { SceneObject } from '../../models/game-state.model';
import { ContainerMechanicsService } from './container-mechanics.service';

@Injectable({
    providedIn: 'root'
})
export class InventoryMechanicsService {
    private readonly MAX_INVENTORY_WEIGHT = 20;

    constructor(
        private gameState: GameStateService,
        private sceneService: SceneService,
        private containerMechanics: ContainerMechanicsService
    ) {}

    canAddToInventory(itemId: string): boolean {
        const state = this.gameState.getCurrentState();
        const item = this.findItemById(itemId);

        if (!item || !item.canTake) {
            return false;
        }

        // Calculate current inventory weight
        const currentWeight = this.listInventory().reduce((total, id) => {
            const obj = this.findItemById(id);
            return total + (obj?.weight || 0);
        }, 0);

        return currentWeight + (item.weight || 0) <= this.MAX_INVENTORY_WEIGHT;
    }

    canTakeObject(object: SceneObject): boolean {
        if (!object.canTake) {
            return false;
        }

        const state = this.gameState.getCurrentState();

        // Check if already in inventory
        if (this.hasItem(object.id)) {
            return false;
        }

        // Check weight limit
        if (!this.canAddToInventory(object.id)) {
            return false;
        }

        // Check if it's a container with contents
        if (object.isContainer) {
            const contents = this.containerMechanics.getContainerContents(object.id);
            if (contents.length > 0) {
                return false;
            }
        }

        return true;
    }

    takeObject(object: SceneObject): { success: boolean; message: string } {
        if (!this.canTakeObject(object)) {
            if (object.interactions?.take?.failureMessage) {
                return { success: false, message: object.interactions.take.failureMessage };
            }
            return { success: false, message: `You can't take the ${object.name}.` };
        }

        this.gameState.updateState(state => ({
            ...state,
            inventory: {
                ...state.inventory,
                [object.id]: true
            }
        }));
        this.gameState.addKnownObject(object.id);

        if (object.interactions?.take?.message) {
            return { success: true, message: object.interactions.take.message };
        }

        return { success: true, message: `You take the ${object.name}.` };
    }

    dropObject(object: SceneObject): { success: boolean; message: string } {
        if (!this.hasItem(object.id)) {
            return { success: false, message: `You don't have the ${object.name}.` };
        }

        this.gameState.updateState(state => {
            const { [object.id]: _, ...remainingInventory } = state.inventory;
            return {
                ...state,
                inventory: remainingInventory
            };
        });

        if (object.interactions?.drop?.message) {
            return { success: true, message: object.interactions.drop.message };
        }

        return { success: true, message: `You drop the ${object.name}.` };
    }

    listInventory(): string[] {
        const state = this.gameState.getCurrentState();
        return Object.keys(state.inventory);
    }

    hasItem(objectId: string): boolean {
        return !!this.gameState.getCurrentState().inventory[objectId];
    }

    private findItemById(itemId: string): SceneObject | null {
        const scenes = this.sceneService.getAllScenes();
        for (const scene of scenes) {
            if (scene.objects?.[itemId]) {
                return scene.objects[itemId];
            }
        }
        return null;
    }
}

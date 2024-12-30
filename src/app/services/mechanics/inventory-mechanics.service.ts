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

    async canAddToInventory(itemId: string): Promise<boolean> {
        const state = this.gameState.getCurrentState();
        const item = await this.findItemById(itemId);

        if (!item || !item.canTake) {
            return false;
        }

        // Calculate current inventory weight
        const inventoryItems = await Promise.all(
            this.listInventory().map(id => this.findItemById(id))
        );
        const currentWeight = inventoryItems.reduce((total, obj) => 
            total + (obj?.weight || 0), 0);

        return currentWeight + (item.weight || 0) <= this.MAX_INVENTORY_WEIGHT;
    }

    async canTakeObject(object: SceneObject): Promise<boolean> {
        if (!object.canTake) {
            return false;
        }

        // Check if already in inventory
        if (await this.hasItem(object.id)) {
            return false;
        }

        // Check weight limit
        if (!await this.canAddToInventory(object.id)) {
            return false;
        }

        // Check if it's a container with contents
        if (object.isContainer) {
            const contents = await this.containerMechanics.getContainerContents(object.id);
            if (contents.length > 0) {
                return false;
            }
        }

        return true;
    }

    async takeObject(object: SceneObject): Promise<{ success: boolean; message: string }> {
        if (!await this.canTakeObject(object)) {
            if (object.interactions?.['take']?.failureMessage) {
                return { success: false, message: object.interactions['take'].failureMessage };
            }
            return { success: false, message: `You can't take the ${object.name}.` };
        }

        await this.addToInventory(object.id);
        await this.gameState.addKnownObject(object.id);

        if (object.interactions?.['take']?.message) {
            return { success: true, message: object.interactions['take'].message };
        }

        return { success: true, message: `You take the ${object.name}.` };
    }

    async dropObject(object: SceneObject): Promise<{ success: boolean; message: string }> {
        if (!await this.hasItem(object.id)) {
            return { success: false, message: `You don't have the ${object.name}.` };
        }

        await this.removeFromInventory(object.id);

        if (object.interactions?.['drop']?.message) {
            return { success: true, message: object.interactions['drop']['message'] };
        }

        return { success: true, message: `You drop the ${object.name}.` };
    }

    listInventory(): string[] {
        const state = this.gameState.getCurrentState();
        return Object.keys(state.inventory || {});
    }

    async hasItem(objectId: string): Promise<boolean> {
        const state = this.gameState.getCurrentState();
        return !!state.inventory?.[objectId];
    }

    async addToInventory(itemId: string): Promise<void> {
        this.gameState.updateState(state => ({
            ...state,
            inventory: {
                ...state.inventory,
                [itemId]: true
            }
        }));
    }

    async removeFromInventory(itemId: string): Promise<void> {
        this.gameState.updateState(state => {
            const inventory = state.inventory || {};
            const { [itemId]: _, ...remainingInventory } = inventory;
            return {
                ...state,
                inventory: remainingInventory
            };
        });
    }

    async getCurrentWeight(): Promise<number> {
        const inventoryItems = await Promise.all(
            this.listInventory().map(id => this.findItemById(id))
        );
        return inventoryItems.reduce((total, obj) => 
            total + (obj?.weight || 0), 0);
    }

    getMaxWeight(): number {
        return this.MAX_INVENTORY_WEIGHT;
    }

    async getContainerContents(itemId: string): Promise<string[]> {
        const state = this.gameState.getCurrentState();
        const containers = state.containers || {};
        return containers[itemId] || [];
    }

    private async findItemById(itemId: string): Promise<SceneObject | null> {
        const scenes = this.sceneService.getAllScenes();
        for (const scene of scenes) {
            if (scene.objects?.[itemId]) {
                return scene.objects[itemId];
            }
        }
        return null;
    }
}

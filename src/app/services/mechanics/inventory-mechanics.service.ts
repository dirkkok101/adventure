import { Injectable } from '@angular/core';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { GameTextService } from '../game-text.service';
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
        private containerMechanics: ContainerMechanicsService,
        private gameText: GameTextService
    ) {}

    async canAddToInventory(itemId: string): Promise<boolean> {
        try {
            const state = this.gameState.getCurrentState();
            const item = await this.findItemById(itemId);

            if (!item || !item.canTake) {
                return false;
            }

            // Calculate current inventory weight
            const currentWeight = await this.getCurrentWeight();
            return currentWeight + (item.weight || 0) <= this.MAX_INVENTORY_WEIGHT;
        } catch (error) {
            console.error('Error checking if can add to inventory:', error);
            return false;
        }
    }

    async canTakeObject(object: SceneObject): Promise<boolean> {
        try {
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
        } catch (error) {
            console.error('Error checking if can take object:', error);
            return false;
        }
    }

    async takeObject(object: SceneObject): Promise<{ success: boolean; message: string }> {
        try {
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
        } catch (error) {
            console.error('Error taking object:', error);
            return { success: false, message: 'An error occurred while taking the object.' };
        }
    }

    async dropObject(object: SceneObject): Promise<{ success: boolean; message: string }> {
        try {
            if (!await this.hasItem(object.id)) {
                return { success: false, message: `You don't have the ${object.name}.` };
            }

            await this.removeFromInventory(object.id);

            if (object.interactions?.['drop']?.message) {
                return { success: true, message: object.interactions['drop'].message };
            }

            return { success: true, message: `You drop the ${object.name}.` };
        } catch (error) {
            console.error('Error dropping object:', error);
            return { success: false, message: 'An error occurred while dropping the object.' };
        }
    }

    listInventory(): string[] {
        try {
            const state = this.gameState.getCurrentState();
            return Object.keys(state.inventory || {});
        } catch (error) {
            console.error('Error listing inventory:', error);
            return [];
        }
    }

    async hasItem(objectId: string): Promise<boolean> {
        try {
            const state = this.gameState.getCurrentState();
            return !!state.inventory?.[objectId];
        } catch (error) {
            console.error('Error checking if has item:', error);
            return false;
        }
    }

    async addToInventory(itemId: string): Promise<void> {
        try {
            this.gameState.updateState(state => ({
                ...state,
                inventory: {
                    ...state.inventory,
                    [itemId]: true
                }
            }));
        } catch (error) {
            console.error('Error adding to inventory:', error);
            this.gameText.addText('An error occurred while adding the item to inventory.');
            throw error;
        }
    }

    async removeFromInventory(itemId: string): Promise<void> {
        try {
            this.gameState.updateState(state => {
                const inventory = state.inventory || {};
                const { [itemId]: _, ...remainingInventory } = inventory;
                return {
                    ...state,
                    inventory: remainingInventory
                };
            });
        } catch (error) {
            console.error('Error removing from inventory:', error);
            this.gameText.addText('An error occurred while removing the item from inventory.');
            throw error;
        }
    }

    async getCurrentWeight(): Promise<number> {
        try {
            const inventoryItems = await Promise.all(
                this.listInventory().map(id => this.findItemById(id))
            );
            return inventoryItems.reduce((total, obj) => 
                total + (obj?.weight || 0), 0);
        } catch (error) {
            console.error('Error getting current weight:', error);
            return 0;
        }
    }

    getMaxWeight(): number {
        return this.MAX_INVENTORY_WEIGHT;
    }

    async getContainerContents(itemId: string): Promise<string[]> {
        try {
            const state = this.gameState.getCurrentState();
            const containers = state.containers || {};
            return containers[itemId] || [];
        } catch (error) {
            console.error('Error getting container contents:', error);
            return [];
        }
    }

    private async findItemById(itemId: string): Promise<SceneObject | null> {
        try {
            // First check current scene
            const currentScene = this.sceneService.getCurrentScene();
            if (currentScene?.objects?.[itemId]) {
                return currentScene.objects[itemId];
            }

            // Then check start scene for global objects
            const startScene = this.sceneService.getStartScene();
            if (startScene?.objects?.[itemId]) {
                return startScene.objects[itemId];
            }

            // Finally check scene by item ID as scene ID
            const itemScene = this.sceneService.getScene(itemId.split('.')[0]);
            if (itemScene?.objects?.[itemId]) {
                return itemScene.objects[itemId];
            }

            return null;
        } catch (error) {
            console.error('Error finding item by ID:', error);
            return null;
        }
    }
}

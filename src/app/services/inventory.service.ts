import { Injectable } from '@angular/core';
import { GameStateService } from './game-state.service';
import { SceneService } from './scene.service';

@Injectable({
    providedIn: 'root'
})
export class InventoryService {
    constructor(
        private gameState: GameStateService,
        private sceneService: SceneService
    ) {}

    getInventoryDisplay(): string {
        const state = this.gameState.getCurrentState();
        const inventoryItems = Object.entries(state.inventory)
            .filter(([_, value]) => value)
            .map(([key, _]) => {
                const item = this.findItemById(key);
                return item?.name || key;
            });

        if (inventoryItems.length === 0) {
            return "You are not carrying anything.";
        }

        return "You are carrying:\n" + inventoryItems.join('\n');
    }

    private findItemById(itemId: string) {
        const scenes = this.sceneService.getAllScenes();
        for (const scene of scenes) {
            if (scene.objects?.[itemId]) {
                return scene.objects[itemId];
            }
        }
        return null;
    }

    hasItem(objectId: string): boolean {
        return !!this.gameState.getCurrentState().inventory[objectId];
    }

    addItem(objectId: string): void {
        this.gameState.addToInventory(objectId);
    }

    removeItem(objectId: string): void {
        this.gameState.removeFromInventory(objectId);
    }
}

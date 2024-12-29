import { Injectable } from '@angular/core';
import { Scene } from '../models/game-state.model';
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

    checkInventory(): string {
        const inventory = this.gameState.getCurrentState().inventory;
        if (inventory.length === 0) {
            return 'You are not carrying anything.';
        }
        return 'You are carrying:\n' + inventory.join('\n');
    }

    takeObject(objectId: string): string {
        const scene = this.sceneService.getCurrentScene();
        if (!scene?.objects?.[objectId]) {
            return 'That object is not here.';
        }

        const object = scene.objects[objectId];
        if (object.canTake) {
            this.gameState.addToInventory(objectId);
            return `You took the ${object.name}.`;
        }

        return 'You cannot take that.';
    }

    hasObject(objectId: string): boolean {
        return this.gameState.getCurrentState().inventory.includes(objectId);
    }
}

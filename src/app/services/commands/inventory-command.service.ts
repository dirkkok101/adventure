import { Injectable } from '@angular/core';
import { GameCommand, SceneObject } from '../../models/game-state.model';
import { InventoryMechanicsService } from '../mechanics/inventory-mechanics.service';
import { GameTextService } from '../game-text.service';
import { StateMechanicsService } from '../mechanics/state-mechanics.service';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';

@Injectable({
    providedIn: 'root'
})
export class InventoryCommandService {
    constructor(
        private inventoryMechanics: InventoryMechanicsService,
        private gameText: GameTextService,
        private stateMechanics: StateMechanicsService,
        private gameState: GameStateService,
        private sceneService: SceneService
    ) {}

    canHandle(command: GameCommand): boolean {
        return command.verb === 'inventory' || command.verb === 'i' || command.verb === 'inv';
    }

    async handle(command: GameCommand): Promise<{ success: boolean; message: string; incrementTurn: boolean }> {
        const itemIds = this.inventoryMechanics.listInventory();
        
        if (itemIds.length === 0) {
            return {
                success: true,
                message: "You aren't carrying anything.",
                incrementTurn: false
            };
        }

        const items: SceneObject[] = [];
        for (const id of itemIds) {
            const item = await this.findItem(id);
            if (item) {
                items.push(item);
            }
        }

        if (items.length === 0) {
            return {
                success: true,
                message: "You aren't carrying anything.",
                incrementTurn: false
            };
        }

        const itemDescriptions = items.map(item => {
            const desc = item.descriptions.states?.[item.descriptions.default] || item.descriptions.default;
            return `- ${item.name}${desc !== item.descriptions.default ? `: ${desc}` : ''}`;
        });

        return {
            success: true,
            message: `You are carrying:\n${itemDescriptions.join('\n')}`,
            incrementTurn: false
        };
    }

    private async findItem(id: string): Promise<SceneObject | null> {
        // First check current scene
        const currentScene = this.sceneService.getCurrentScene();
        if (currentScene?.objects?.[id]) {
            return currentScene.objects[id];
        }

        // Then check all scenes
        const scenes = this.sceneService.getAllScenes();
        for (const scene of scenes) {
            if (scene.objects?.[id]) {
                return scene.objects[id];
            }
        }

        return null;
    }

    getSuggestions(command: GameCommand): string[] {
        if (!command.verb || command.verb === 'i' || command.verb.startsWith('inv')) {
            return ['inventory'];
        }
        return [];
    }
}

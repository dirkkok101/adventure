import { Injectable } from '@angular/core';
import { Command } from '../../models/command.model';
import { GameState, SceneInteraction } from '../../models/game-state.model';
import { SceneService } from '../scene.service';
import { GameStateService } from '../game-state.service';
import { handleInteraction } from '../../data/game-mechanics';
import { CommandHandler } from './command-handler.interface';

@Injectable({
    providedIn: 'root'
})
export class ExamineCommandService implements CommandHandler {
    constructor(
        private sceneService: SceneService,
        private gameState: GameStateService
    ) {}

    processCommand(command: Command): string {
        if (!command.object) {
            return "What do you want to examine?";
        }

        return this.examineObject(command.object);
    }

    private examineObject(objectName: string): string {
        const state = this.gameState.getCurrentState();
        const scene = this.sceneService.getCurrentScene();

        if (!scene) {
            return "Error: No current scene";
        }

        // First check inventory
        const inventoryObject = Object.values(scene.objects || {}).find(obj => 
            obj.name.toLowerCase() === objectName.toLowerCase() && 
            state.inventory[obj.id]
        );

        if (inventoryObject) {
            const interaction = inventoryObject.interactions?.['examine'];
            if (interaction) {
                return handleInteraction(interaction, state);
            }
            return inventoryObject.descriptions.default;
        }

        // Then check visible objects in the scene
        const sceneObject = Object.values(scene.objects || {}).find(obj => {
            const isVisible = obj.visibleOnEntry || state.flags[`revealed_${obj.id}`];
            return obj.name.toLowerCase() === objectName.toLowerCase() && isVisible;
        });

        if (!sceneObject) {
            return "You don't see that here.";
        }

        const interaction = sceneObject.interactions?.['examine'];
        if (interaction) {
            return handleInteraction(interaction, state);
        }

        return sceneObject.descriptions.default;
    }
}

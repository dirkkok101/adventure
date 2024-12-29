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
export class InteractionCommandService implements CommandHandler {
    constructor(
        private sceneService: SceneService,
        private gameState: GameStateService
    ) {}

    processCommand(command: Command): string {
        if (!command.object) {
            return `What do you want to ${command.verb}?`;
        }

        // Handle direction-based movement with 'enter' or 'go'
        if ((command.verb === 'enter' || command.verb === 'go') && 
            ['north', 'south', 'east', 'west'].includes(command.object)) {
            return this.sceneService.moveToScene(command.object);
        }

        return this.processObjectInteraction(command.verb, command.object);
    }

    private processObjectInteraction(verb: string, objectId: string): string {
        const state = this.gameState.getCurrentState();
        const scene = this.sceneService.getCurrentScene();

        if (!scene) {
            return "Error: No current scene";
        }

        // First check if the object is in the scene
        let object = scene.objects?.[objectId];
        
        // If not in scene, check inventory
        if (!object && state.inventory[objectId]) {
            object = this.findObjectInAnyScene(objectId);
        }

        if (!object) {
            return `I don't see any ${objectId} here.`;
        }

        // Add to known objects
        state.knownObjects.add(objectId);

        // Check for specific interactions
        if (object.interactions?.[verb]) {
            return handleInteraction(object.interactions[verb], state);
        }

        // Handle standard verbs
        switch (verb) {
            case 'take':
            case 'get':
            case 'pick':
                if (!object.canTake) {
                    return `You can't take the ${object.name}.`;
                }
                if (state.inventory[objectId]) {
                    return `You're already carrying the ${object.name}.`;
                }
                state.inventory[objectId] = true;
                return `Taken.`;

            case 'drop':
            case 'put':
                if (!state.inventory[objectId]) {
                    return `You don't have the ${object.name}.`;
                }
                state.inventory[objectId] = false;
                return `Dropped.`;

            case 'open':
            case 'unlock':
                if (object.interactions?.['open']) {
                    return handleInteraction(object.interactions['open'], state);
                }
                return `You can't open the ${object.name}.`;

            case 'close':
            case 'shut':
                if (object.interactions?.['close']) {
                    return handleInteraction(object.interactions['close'], state);
                }
                return `You can't close the ${object.name}.`;

            case 'read':
                if (object.interactions?.['read']) {
                    return handleInteraction(object.interactions['read'], state);
                }
                return `There's nothing to read on the ${object.name}.`;

            case 'enter':
            case 'go':
                if (object.interactions?.['enter']) {
                    return handleInteraction(object.interactions['enter'], state);
                }
                return `You can't enter the ${object.name}.`;

            default:
                return `You can't ${verb} the ${object.name}.`;
        }
    }

    private findObjectInAnyScene(objectId: string): any {
        const allScenes = this.sceneService.getAllScenes();
        for (const scene of allScenes) {
            if (scene.objects?.[objectId]) {
                return scene.objects[objectId];
            }
        }
        return null;
    }
}

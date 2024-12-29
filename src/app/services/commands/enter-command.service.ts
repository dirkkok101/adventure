import { Injectable } from '@angular/core';
import { Command } from '../../models/command.model';
import { SceneService } from '../scene.service';
import { GameStateService } from '../game-state.service';
import { BaseObjectCommandService } from './base-object-command.service';

@Injectable({
    providedIn: 'root'
})
export class EnterCommandService extends BaseObjectCommandService {
    constructor(
        sceneService: SceneService,
        gameState: GameStateService
    ) {
        super(sceneService, gameState);
    }

    processCommand(command: Command): string {
        if (!command.object) {
            return `What do you want to enter?`;
        }

        // Handle direction-based movement
        if (['north', 'south', 'east', 'west'].includes(command.object)) {
            return this.sceneService.moveToScene(command.object);
        }

        const { object, state } = this.findObject(command.object);

        if (!object) {
            return `I don't see any ${command.object} here.`;
        }

        // Add to known objects
        state.knownObjects.add(object.id);

        // Check for enter interaction
        if (object.interactions?.['enter']) {
            return this.handleObjectInteraction(object, 'enter', state);
        }

        return `You can't enter the ${object.name}.`;
    }
}

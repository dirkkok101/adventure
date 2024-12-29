import { Injectable } from '@angular/core';
import { Command } from '../../models/command.model';
import { SceneService } from '../scene.service';
import { GameStateService } from '../game-state.service';
import { BaseObjectCommandService } from './base-object-command.service';

@Injectable({
    providedIn: 'root'
})
export class TakeCommandService extends BaseObjectCommandService {
    constructor(
        sceneService: SceneService,
        gameState: GameStateService
    ) {
        super(sceneService, gameState);
    }

    processCommand(command: Command): string {
        if (!command.object) {
            return `What do you want to take?`;
        }

        const { object, state } = this.findObject(command.object);

        if (!object) {
            return `I don't see any ${command.object} here.`;
        }

        // Add to known objects
        state.knownObjects.add(object.id);

        // Check for specific take interaction
        if (object.interactions?.['take']) {
            return this.handleObjectInteraction(object, 'take', state);
        }

        // Handle standard take
        if (!object.canTake) {
            return `You can't take the ${object.name}.`;
        }

        if (state.inventory[object.id]) {
            return `You're already carrying the ${object.name}.`;
        }

        state.inventory[object.id] = true;
        return `Taken.`;
    }
}

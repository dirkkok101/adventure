import { Injectable } from '@angular/core';
import { Command } from '../../models/command.model';
import { SceneService } from '../scene.service';
import { GameStateService } from '../game-state.service';
import { BaseObjectCommandService } from './base-object-command.service';

@Injectable({
    providedIn: 'root'
})
export class ReadCommandService extends BaseObjectCommandService {
    constructor(
        sceneService: SceneService,
        gameState: GameStateService
    ) {
        super(sceneService, gameState);
    }

    processCommand(command: Command): string {
        if (!command.object) {
            return `What do you want to read?`;
        }

        const { object, state } = this.findObject(command.object);

        if (!object) {
            return `I don't see any ${command.object} here.`;
        }

        // Add to known objects
        state.knownObjects.add(object.id);

        // Check for read interaction
        if (object.interactions?.['read']) {
            return this.handleObjectInteraction(object, 'read', state);
        }

        return `There's nothing to read on the ${object.name}.`;
    }
}

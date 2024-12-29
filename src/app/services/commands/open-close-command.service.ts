import { Injectable } from '@angular/core';
import { Command } from '../../models/command.model';
import { SceneService } from '../scene.service';
import { GameStateService } from '../game-state.service';
import { BaseObjectCommandService } from './base-object-command.service';

@Injectable({
    providedIn: 'root'
})
export class OpenCloseCommandService extends BaseObjectCommandService {
    constructor(
        sceneService: SceneService,
        gameState: GameStateService
    ) {
        super(sceneService, gameState);
    }

    processCommand(command: Command): string {
        if (!command.object) {
            return `What do you want to ${command.verb}?`;
        }

        const { object, state } = this.findObject(command.object);

        if (!object) {
            return `I don't see any ${command.object} here.`;
        }

        // Add to known objects
        state.knownObjects.add(object.id);

        const verb = command.verb === 'unlock' ? 'open' : 
                    command.verb === 'shut' ? 'close' : 
                    command.verb;

        // Check for specific open/close interaction
        if (object.interactions?.[verb]) {
            return this.handleObjectInteraction(object, verb, state);
        }

        return `You can't ${verb} the ${object.name}.`;
    }
}

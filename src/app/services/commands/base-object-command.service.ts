import { Injectable } from '@angular/core';
import { Command } from '../../models/command.model';
import { GameState, SceneObject } from '../../models/game-state.model';
import { SceneService } from '../scene.service';
import { GameStateService } from '../game-state.service';
import { CommandHandler } from './command-handler.interface';
import { handleInteraction } from '../../data/game-mechanics';

@Injectable()
export abstract class BaseObjectCommandService implements CommandHandler {
    constructor(
        protected sceneService: SceneService,
        protected gameState: GameStateService
    ) {}

    abstract processCommand(command: Command): string;

    protected findObject(objectId: string): { object: SceneObject | undefined, state: GameState } {
        const state = this.gameState.getCurrentState();
        const scene = this.sceneService.getCurrentScene();

        if (!scene) {
            return { object: undefined, state };
        }

        // First check if the object is in the scene
        let object = scene.objects?.[objectId];
        
        // If not in scene, check inventory
        if (!object && state.inventory[objectId]) {
            object = this.findObjectInAnyScene(objectId);
        }

        return { object, state };
    }

    protected findObjectInAnyScene(objectId: string): SceneObject | undefined {
        const allScenes = this.sceneService.getAllScenes();
        for (const scene of allScenes) {
            if (scene.objects?.[objectId]) {
                return scene.objects[objectId];
            }
        }
        return undefined;
    }

    protected handleObjectInteraction(object: SceneObject, verb: string, state: GameState): string {
        // Add to known objects
        state.knownObjects.add(object.id);

        // Check for specific interaction
        if (object.interactions?.[verb]) {
            return handleInteraction(object.interactions[verb], state);
        }

        return `You can't ${verb} the ${object.name}.`;
    }
}

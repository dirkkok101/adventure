import { Injectable } from '@angular/core';
import { Command } from '../../models/command.model';
import { CommandHandler } from './command-handler.interface';
import { SceneService } from '../scene.service';

@Injectable({
    providedIn: 'root'
})
export class LookCommandService implements CommandHandler {
    constructor(private sceneService: SceneService) {}

    canHandle(command: Command): boolean {
        return command.verb === 'look';
    }

    handle(command: Command): string {
        const scene = this.sceneService.getCurrentScene();
        if (!scene) {
            return 'Error: Invalid scene';
        }

        if (!command.object) {
            return this.sceneService.getSceneDescription(scene);
        }

        // If looking at an object, treat it as examine
        return this.handleObjectLook(command.object);
    }

    private handleObjectLook(objectId: string): string {
        const scene = this.sceneService.getCurrentScene();
        if (!scene?.objects?.[objectId]) {
            return `I don't see any ${objectId} here.`;
        }

        const object = scene.objects[objectId];
        return object.descriptions.default;
    }
}

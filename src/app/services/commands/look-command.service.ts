import { Injectable } from '@angular/core';
import { Command } from '../../models/command.model';
import { SceneService } from '../scene.service';
import { CommandHandler } from './command-handler.interface';

@Injectable({
    providedIn: 'root'
})
export class LookCommandService implements CommandHandler {
    constructor(private sceneService: SceneService) {}

    processCommand(command: Command): string {
        const scene = this.sceneService.getCurrentScene();
        if (!scene) {
            return "Error: No current scene";
        }

        return this.sceneService.getSceneDescription(scene);
    }
}

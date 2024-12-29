import { Injectable } from '@angular/core';
import { Command } from '../../models/command.model';
import { CommandHandler } from './command-handler.interface';
import { SceneService } from '../scene.service';

@Injectable({
    providedIn: 'root'
})
export class MovementCommandService implements CommandHandler {
    private readonly directionCommands = ['go', 'north', 'south', 'east', 'west'];

    constructor(private sceneService: SceneService) {}

    canHandle(command: Command): boolean {
        return this.directionCommands.includes(command.verb);
    }

    handle(command: Command): string {
        const direction = command.verb === 'go' ? command.object : command.verb;
        
        if (!direction) {
            return 'Which direction do you want to go?';
        }

        const scene = this.sceneService.getCurrentScene();
        if (!scene) {
            return 'Error: Invalid scene';
        }

        const moveResult = this.sceneService.canMove(direction);
        if (!moveResult.canMove) {
            return moveResult.message || 'You cannot go that way.';
        }

        if (moveResult.targetScene) {
            this.sceneService.initializeScene(moveResult.targetScene);
            const newScene = this.sceneService.getCurrentScene();
            return newScene ? this.sceneService.getSceneDescription(newScene) : 'Error: Invalid scene';
        }

        return 'Error: No target scene specified';
    }
}

import { Injectable } from '@angular/core';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { GameCommand } from '../../models/game-state.model';
import { StateMechanicsService } from '../mechanics/state-mechanics.service';

@Injectable({
    providedIn: 'root'
})
export class LookCommandService {
    constructor(
        private gameState: GameStateService,
        private sceneService: SceneService,
        private stateMechanics: StateMechanicsService
    ) {}

    handle(command: GameCommand): { success: boolean; message: string; incrementTurn: boolean } {
        const scene = this.sceneService.getCurrentScene();
        if (!scene) {
            return { success: false, message: 'Error: No current scene', incrementTurn: false };
        }

        // If no object specified, describe the current scene
        if (!command.object) {
            return {
                success: true,
                message: this.sceneService.getSceneDescription(scene),
                incrementTurn: true
            };
        }

        // Look at a specific object
        const object = scene.objects?.[command.object];
        if (!object) {
            return { 
                success: false, 
                message: `You don't see any ${command.object} here.`,
                incrementTurn: false
            };
        }

        // Check if object has a specific look interaction
        if (object.interactions?.look) {
            const result = this.stateMechanics.handleInteraction(object.interactions.look);
            return {
                success: result.success,
                message: result.message,
                incrementTurn: true
            };
        }

        // Default to object description
        return {
            success: true,
            message: this.stateMechanics.getStateBasedDescription(object, object.descriptions.default),
            incrementTurn: true
        };
    }
}

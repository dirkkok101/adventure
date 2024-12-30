import { Injectable } from '@angular/core';
import { CommandHandler } from './command-handler.interface';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { LightMechanicsService } from '../mechanics/light-mechanics.service';
import { StateMechanicsService } from '../mechanics/state-mechanics.service';
import { ScoreMechanicsService } from '../mechanics/score-mechanics.service';

@Injectable({
    providedIn: 'root'
})
export class EnterCommandService implements CommandHandler {
    constructor(
        private gameState: GameStateService,
        private sceneService: SceneService,
        private lightMechanics: LightMechanicsService,
        private stateMechanics: StateMechanicsService,
        private scoreMechanics: ScoreMechanicsService
    ) {}

    canHandle(command: string): boolean {
        return command.toLowerCase().startsWith('enter ');
    }

    handle(command: string): string {
        const words = command.toLowerCase().split(' ');
        const objectName = words.slice(1).join(' ');

        if (!objectName) {
            return 'What do you want to enter?';
        }

        const scene = this.sceneService.getCurrentScene();
        if (!scene) {
            return 'Error: No current scene';
        }

        // Check light
        if (!this.lightMechanics.isLightPresent()) {
            return 'It is too dark to see where you are going.';
        }

        // First check if it's an exit
        const exit = scene.exits?.find(exit => 
            exit.direction.toLowerCase() === objectName
        );

        if (exit) {
            // Check if exit has required flags
            if (exit.requiredFlags) {
                if (!this.stateMechanics.checkRequiredFlags(exit.requiredFlags)) {
                    return exit.failureMessage || 'You cannot go that way.';
                }
            }

            // Add score if specified
            if (exit.score) {
                this.scoreMechanics.addScore(exit.score);
            }

            this.gameState.setCurrentScene(exit.targetScene);
            return exit.description || `You enter the ${exit.direction}`;
        }

        // If not an exit, check if it's an enterable object
        const object = Object.values(scene.objects || {}).find(obj => 
            obj.name.toLowerCase() === objectName && 
            this.lightMechanics.isObjectVisible(obj)
        );

        if (!object) {
            return `You don't see any ${objectName} here.`;
        }

        // Handle interaction using state mechanics
        const result = this.stateMechanics.handleInteraction(object, 'enter');
        if (!result.success) {
            return result.message;
        }

        return result.message;
    }
}

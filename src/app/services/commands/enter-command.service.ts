import { Injectable } from '@angular/core';
import { GameCommand } from '../../models/game-state.model';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { LightMechanicsService } from '../mechanics/light-mechanics.service';
import { StateMechanicsService } from '../mechanics/state-mechanics.service';
import { ScoreMechanicsService } from '../mechanics/score-mechanics.service';
import { FlagMechanicsService } from '../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../mechanics/progress-mechanics.service';

@Injectable({
    providedIn: 'root'
})
export class EnterCommandService {
    constructor(
        private gameState: GameStateService,
        private sceneService: SceneService,
        private lightMechanics: LightMechanicsService,
        private stateMechanics: StateMechanicsService,
        private scoreMechanics: ScoreMechanicsService,
        private flagMechanics: FlagMechanicsService,
        private progressMechanics: ProgressMechanicsService
    ) {}

    canHandle(command: GameCommand): boolean {
        return command.verb === 'enter';
    }

    async handle(command: GameCommand): Promise<{ success: boolean; message: string; incrementTurn: boolean }> {
        if (!command.object) {
            return {
                success: false,
                message: 'What do you want to enter?',
                incrementTurn: false
            };
        }

        const scene = this.sceneService.getCurrentScene();
        if (!scene) {
            return {
                success: false,
                message: 'Error: No current scene',
                incrementTurn: false
            };
        }

        // Check light
        if (!this.lightMechanics.isLightPresent() && !scene.light) {
            return {
                success: false,
                message: 'It is too dark to see where you are going.',
                incrementTurn: false
            };
        }

        // First check if it's an exit
        const exit = scene.exits?.find(exit => 
            exit.direction.toLowerCase() === command.object?.toLowerCase()
        );

        if (exit) {
            // Check if exit has required flags
            if (exit.requiredFlags && !this.flagMechanics.checkFlags(exit.requiredFlags)) {
                return {
                    success: false,
                    message: exit.failureMessage || 'You cannot go that way.',
                    incrementTurn: false
                };
            }

            // Handle score for first time visiting
            if (exit.score && !this.flagMechanics.hasFlag(`visited_${exit.targetScene}`)) {
                this.scoreMechanics.addScore(exit.score);
                this.flagMechanics.setFlag(`visited_${exit.targetScene}`);
            }

            // Move to new scene
            this.gameState.setCurrentScene(exit.targetScene);
            const newScene = this.sceneService.getScene(exit.targetScene);

            if (!newScene) {
                return {
                    success: false,
                    message: 'Error: Target scene not found.',
                    incrementTurn: true
                };
            }

            // Get scene description with state-based variations
            const description = this.sceneService.getSceneDescription(newScene);
            return {
                success: true,
                message: description,
                incrementTurn: true
            };
        }

        // If not an exit, check if it's an enterable object
        const object = Object.values(scene.objects || {}).find(obj => 
            obj.name.toLowerCase() === command.object?.toLowerCase() && 
            this.lightMechanics.isObjectVisible(obj)
        );

        if (!object) {
            return {
                success: false,
                message: `You don't see any ${command.object} here.`,
                incrementTurn: false
            };
        }

        // Handle interaction using state mechanics
        const result = await this.stateMechanics.handleInteraction(object, 'enter');
        return {
            success: result.success,
            message: result.message,
            incrementTurn: result.success // Only increment turn if interaction was successful
        };
    }
}

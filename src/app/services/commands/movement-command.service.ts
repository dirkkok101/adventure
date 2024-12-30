import { Injectable } from '@angular/core';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { FlagMechanicsService } from '../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../mechanics/progress-mechanics.service';
import { GameCommand } from '../../models/game-state.model';

@Injectable({
    providedIn: 'root'
})
export class MovementCommandService {
    constructor(
        private gameState: GameStateService,
        private sceneService: SceneService,
        private flagMechanics: FlagMechanicsService,
        private progressMechanics: ProgressMechanicsService
    ) {}

    handle(command: GameCommand): { success: boolean; message: string; incrementTurn: boolean } {
        const currentScene = this.sceneService.getCurrentScene();
        if (!currentScene) {
            return { success: false, message: "You can't go that way.", incrementTurn: false };
        }

        const direction = command.verb;
        const exit = currentScene.exits?.find(e => e.direction === direction);

        if (!exit) {
            return { success: false, message: "You can't go that way.", incrementTurn: false };
        }

        // Check required flags
        if (exit.requiredFlags && !this.flagMechanics.checkFlags(exit.requiredFlags)) {
            return { 
                success: false, 
                message: exit.failureMessage || "You can't go that way.", 
                incrementTurn: false 
            };
        }

        // Handle score for first time visiting
        if (exit.score && !this.flagMechanics.hasFlag(`visited_${exit.targetScene}`)) {
            this.progressMechanics.addScore(exit.score);
            this.flagMechanics.setFlag(`visited_${exit.targetScene}`);
        }

        // Move to new scene
        this.gameState.setCurrentScene(exit.targetScene);
        const newScene = this.sceneService.getScene(exit.targetScene);

        if (!newScene) {
            return { success: false, message: "Error: Scene not found.", incrementTurn: false };
        }

        return {
            success: true,
            message: this.sceneService.getSceneDescription(newScene),
            incrementTurn: true
        };
    }
}

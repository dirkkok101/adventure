import { Injectable } from '@angular/core';
import { GameCommand } from '../../models/game-state.model';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { FlagMechanicsService } from '../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../mechanics/progress-mechanics.service';
import { LightMechanicsService } from '../mechanics/light-mechanics.service';
import { StateMechanicsService } from '../mechanics/state-mechanics.service';
import { ScoreMechanicsService } from '../mechanics/score-mechanics.service';

@Injectable({
    providedIn: 'root'
})
export class MovementCommandService {
    private readonly DIRECTIONS = new Set([
        'north', 'south', 'east', 'west', 'up', 'down',
        'n', 's', 'e', 'w', 'u', 'd'
    ]);

    private readonly DIRECTION_ALIASES: { [key: string]: string } = {
        'n': 'north',
        's': 'south',
        'e': 'east',
        'w': 'west',
        'u': 'up',
        'd': 'down'
    };

    constructor(
        private gameState: GameStateService,
        private sceneService: SceneService,
        private flagMechanics: FlagMechanicsService,
        private progressMechanics: ProgressMechanicsService,
        private lightMechanics: LightMechanicsService,
        private stateMechanics: StateMechanicsService,
        private scoreMechanics: ScoreMechanicsService
    ) {}

    canHandle(command: GameCommand): boolean {
        return this.DIRECTIONS.has(command.verb) || 
               command.verb === 'go' || 
               command.verb === 'move';
    }

    async handle(command: GameCommand): Promise<{ success: boolean; message: string; incrementTurn: boolean }> {
        const currentScene = this.sceneService.getCurrentScene();
        if (!currentScene) {
            return { 
                success: false, 
                message: "You can't go that way.", 
                incrementTurn: false 
            };
        }

        // Get direction from command
        let direction = command.verb;
        if (command.verb === 'go' || command.verb === 'move') {
            if (!command.object || !this.DIRECTIONS.has(command.object)) {
                return {
                    success: false,
                    message: "Which direction do you want to go?",
                    incrementTurn: false
                };
            }
            direction = command.object;
        }

        // Resolve direction alias
        direction = this.DIRECTION_ALIASES[direction] || direction;

        // Check if we can see where we're going
        if (!this.lightMechanics.isLightPresent() && !currentScene.light) {
            return {
                success: false,
                message: "It's too dark to see where you're going.",
                incrementTurn: false
            };
        }

        const exit = currentScene.exits?.find(e => e.direction === direction);
        if (!exit) {
            return { 
                success: false, 
                message: "You can't go that way.", 
                incrementTurn: false 
            };
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
            this.scoreMechanics.addScore(exit.score);
            this.flagMechanics.setFlag(`visited_${exit.targetScene}`);
        }

        // Move to new scene
        this.gameState.setCurrentScene(exit.targetScene);
        const newScene = this.sceneService.getScene(exit.targetScene);

        if (!newScene) {
            return { 
                success: false, 
                message: "Error: Target scene not found.", 
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
}

import { Injectable } from '@angular/core';
import { Command } from '../../models/command.model';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { CommandHandler } from './command-handler.interface';
import { Scene, SceneExit } from '../../models/game-state.model';

type Direction = 'north' | 'south' | 'east' | 'west';
type DirectionAlias = 'n' | 's' | 'e' | 'w';

@Injectable({
    providedIn: 'root'
})
export class MovementCommandService implements CommandHandler {
    private readonly directionMap: Record<DirectionAlias, Direction> = {
        'n': 'north',
        's': 'south',
        'e': 'east',
        'w': 'west'
    };

    constructor(
        private gameState: GameStateService,
        private sceneService: SceneService
    ) {}

    canHandle(command: Command): boolean {
        return Object.keys(this.directionMap).includes(command.verb) || ['go', 'north', 'south', 'east', 'west'].includes(command.verb);
    }

    handle(command: Command): string {
        return this.processCommand(command);
    }

    processCommand(command: Command): string {
        const direction = this.directionMap[command.verb as DirectionAlias] || command.verb as Direction;
        const scene = this.sceneService.getCurrentScene();
        
        if (!scene) {
            return "Error: No current scene";
        }

        // Check if the direction exists
        const exit = (scene.exits || []).find((e: SceneExit) => e.direction === direction);
        if (!exit) {
            return "You can't go that way.";
        }

        // Check if the exit has required flags
        if (exit.requiredFlags && exit.requiredFlags.length > 0) {
            const state = this.gameState.getCurrentState();
            const hasAllFlags = exit.requiredFlags.every(flag => state.flags[flag]);
            if (!hasAllFlags) {
                return exit.failureMessage || "You can't go that way.";
            }
        }

        // Move to the new scene
        this.gameState.setCurrentScene(exit.targetScene);
        const newScene = this.sceneService.getCurrentScene();
        
        if (!newScene) {
            return "Error: Invalid scene";
        }

        return this.sceneService.getSceneDescription(newScene);
    }
}

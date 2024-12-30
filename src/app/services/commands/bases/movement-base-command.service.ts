import { Injectable } from '@angular/core';
import { GameCommand, SceneExit, CommandResponse } from '../../../models/game-state.model';
import { BaseCommandService } from './base-command.service';
import { GameStateService } from '../../game-state.service';
import { SceneService } from '../../scene.service';
import { StateMechanicsService } from '../../mechanics/state-mechanics.service';
import { FlagMechanicsService } from '../../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../../mechanics/progress-mechanics.service';
import { LightMechanicsService } from '../../mechanics/light-mechanics.service';
import { InventoryMechanicsService } from '../../mechanics/inventory-mechanics.service';
import { ScoreMechanicsService } from '../../mechanics/score-mechanics.service';
import { ErrorResponse, SuccessResponse } from './command-types';

@Injectable()
export abstract class MovementBaseCommandService extends BaseCommandService {
    protected readonly DIRECTIONS = new Set([
        'north', 'south', 'east', 'west', 'up', 'down',
        'n', 's', 'e', 'w', 'u', 'd'
    ]);

    protected readonly DIRECTION_ALIASES: { [key: string]: string } = {
        'n': 'north',
        's': 'south',
        'e': 'east',
        'w': 'west',
        'u': 'up',
        'd': 'down'
    };

    constructor(
        gameState: GameStateService,
        sceneService: SceneService,
        stateMechanics: StateMechanicsService,
        flagMechanics: FlagMechanicsService,
        progress: ProgressMechanicsService,
        lightMechanics: LightMechanicsService,
        inventoryMechanics: InventoryMechanicsService,
        scoreMechanics: ScoreMechanicsService
    ) {
        super(
            gameState,
            sceneService,
            stateMechanics,
            flagMechanics,
            progress,
            lightMechanics,
            inventoryMechanics,
            scoreMechanics
        );
    }

    protected resolveDirection(command: GameCommand): string | null {
        let direction = command.verb;
        
        // Handle 'go' or 'move' commands
        if ((command.verb === 'go' || command.verb === 'move') && command.object) {
            direction = command.object;
        }

        // Check if it's a valid direction
        if (!this.DIRECTIONS.has(direction.toLowerCase())) {
            return null;
        }

        // Resolve aliases
        return this.DIRECTION_ALIASES[direction.toLowerCase()] || direction.toLowerCase();
    }

    protected async checkExit(exit: SceneExit): Promise<CommandResponse> {
        // Check required flags
        if (exit.requiredFlags && !this.flagMechanics.checkFlags(exit.requiredFlags)) {
            return {
                success: false,
                message: exit.failureMessage || "You can't go that way.",
                incrementTurn: false
            };
        }

        return {
            success: true,
            message: '',
            incrementTurn: false
        };
    }

    protected async handleMovement(direction: string): Promise<CommandResponse> {
        const scene = this.sceneService.getCurrentScene();
        if (!scene) {
            return this.noSceneError();
        }

        // Check if we can see
        if (!this.checkLightInScene()) {
            return {
                success: false,
                message: "It's too dark to see where you're going.",
                incrementTurn: false
            };
        }

        // Find matching exit
        const exit = scene.exits?.find(e => e.direction.toLowerCase() === direction.toLowerCase());
        if (!exit) {
            return {
                success: false,
                message: "You can't go that way.",
                incrementTurn: false
            };
        }

        // Check if we can use this exit
        const exitCheck = await this.checkExit(exit);
        if (!exitCheck.success) {
            return exitCheck;
        }

        // Handle scoring for first visit
        if (exit.score && !this.flagMechanics.hasFlag(`visited_${exit.targetScene}`)) {
            await this.scoreMechanics.addScore(exit.score);
            await this.flagMechanics.setFlag(`visited_${exit.targetScene}`);
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

        // Get scene description
        const description = this.sceneService.getSceneDescription(newScene);
        return {
            success: true,
            message: description,
            incrementTurn: true
        };
    }

    protected getDirectionSuggestions(): string[] {
        const scene = this.sceneService.getCurrentScene();
        if (!scene?.exits || !this.checkLightInScene()) {
            return [];
        }

        return scene.exits
            .filter(exit => !exit.requiredFlags || this.flagMechanics.checkFlags(exit.requiredFlags))
            .map(exit => exit.direction);
    }
}
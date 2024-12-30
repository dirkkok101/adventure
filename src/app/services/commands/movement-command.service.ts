import { Injectable } from '@angular/core';
import { GameCommand, CommandResponse } from '../../models/game-state.model';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { FlagMechanicsService } from '../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../mechanics/progress-mechanics.service';
import { LightMechanicsService } from '../mechanics/light-mechanics.service';
import { StateMechanicsService } from '../mechanics/state-mechanics.service';
import { ScoreMechanicsService } from '../mechanics/score-mechanics.service';
import { InventoryMechanicsService } from '../mechanics/inventory-mechanics.service';
import { MovementBaseCommandService } from './bases/movement-base-command.service';

@Injectable({
    providedIn: 'root'
})
export class MovementCommandService extends MovementBaseCommandService {
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

    canHandle(command: GameCommand): boolean {
        return command.verb === 'enter' || this.resolveDirection(command) !== null;
    }

    async handle(command: GameCommand): Promise<CommandResponse> {
        // Try directional movement first
        const direction = this.resolveDirection(command);
        if (direction) {
            return this.handleMovement(direction);
        }

        // If not a direction and it's an enter command, try object movement
        if (command.verb === 'enter') {
            if (!command.object) {
                return {
                    success: false,
                    message: 'What do you want to enter?',
                    incrementTurn: false
                };
            }
            return this.handleObjectMovement(command.object);
        }

        return {
            success: false,
            message: "I don't understand that direction.",
            incrementTurn: false
        };
    }

    getSuggestions(command: GameCommand): string[] {
        if (command.verb === 'enter' && !command.object) {
            const scene = this.sceneService.getCurrentScene();
            if (!scene?.objects || !this.checkLightInScene()) {
                return [];
            }
            // Return names of visible objects that might be enterable
            return Object.values(scene.objects)
                .filter(obj => this.lightMechanics.isObjectVisible(obj))
                .map(obj => obj.name);
        }
        return this.getDirectionSuggestions();
    }
}

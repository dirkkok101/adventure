import { Injectable } from '@angular/core';
import { GameCommand, SceneObject, CommandResponse } from '../../models/game-state.model';
import { MovementBaseCommandService } from './bases/movement-base-command.service';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { StateMechanicsService } from '../mechanics/state-mechanics.service';
import { FlagMechanicsService } from '../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../mechanics/progress-mechanics.service';
import { LightMechanicsService } from '../mechanics/light-mechanics.service';
import { InventoryMechanicsService } from '../mechanics/inventory-mechanics.service';
import { ScoreMechanicsService } from '../mechanics/score-mechanics.service';
import { GameTextService } from '../game-text.service';

@Injectable({
    providedIn: 'root'
})
export class MoveCommandService extends MovementBaseCommandService {
    constructor(
        gameState: GameStateService,
        sceneService: SceneService,
        stateMechanics: StateMechanicsService,
        flagMechanics: FlagMechanicsService,
        progress: ProgressMechanicsService,
        lightMechanics: LightMechanicsService,
        inventoryMechanics: InventoryMechanicsService,
        scoreMechanics: ScoreMechanicsService,
        private gameTextService: GameTextService
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
        return command.verb === 'move' && !!command.object;
    }

    async handle(command: GameCommand): Promise<CommandResponse> {
        if (!command.object) {
            return {
                success: false,
                message: "What do you want to move?",
                incrementTurn: false
            };
        }

        return this.handleObjectMovement(command.object);
    }

    protected override async handleObjectMovement(objectName: string): Promise<CommandResponse> {
        const object = await this.findObject(objectName);
        if (!object) {
            return {
                success: false,
                message: `I don't see any ${objectName} here.`,
                incrementTurn: false
            };
        }

        if (!await this.checkVisibility(object)) {
            return {
                success: false,
                message: "It's too dark to see that.",
                incrementTurn: false
            };
        }

        if (!object.moveable) {
            return {
                success: false,
                message: `You can't move the ${object.name}.`,
                incrementTurn: false
            };
        }

        // Handle any special movement logic here
        if (object.onMove) {
            return {
                success: true,
                message: object.onMove,
                incrementTurn: true
            };
        }

        return {
            success: true,
            message: `You move the ${object.name}.`,
            incrementTurn: true
        };
    }

    getSuggestions(command: GameCommand): string[] {
        if (!command.verb) {
            return ['move'];
        }

        if (command.verb === 'move' && !command.object) {
            const scene = this.sceneService.getCurrentScene();
            if (!scene?.objects || !this.checkLightInScene()) {
                return [];
            }

            return Object.values(scene.objects)
                .filter(obj => 
                    this.lightMechanics.isObjectVisible(obj) &&
                    obj.interactions?.['enter'])
                .map(obj => obj.name.toLowerCase());
        }

        return [];
    }
}

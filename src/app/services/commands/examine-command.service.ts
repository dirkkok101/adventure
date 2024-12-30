import { Injectable } from '@angular/core';
import { GameCommand, CommandResponse } from '../../models/game-state.model';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { StateMechanicsService } from '../mechanics/state-mechanics.service';
import { ContainerMechanicsService } from '../mechanics/container-mechanics.service';
import { FlagMechanicsService } from '../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../mechanics/progress-mechanics.service';
import { LightMechanicsService } from '../mechanics/light-mechanics.service';
import { InventoryMechanicsService } from '../mechanics/inventory-mechanics.service';
import { ScoreMechanicsService } from '../mechanics/score-mechanics.service';
import { ExaminationBaseCommandService } from './bases/examination-base-command.service';

@Injectable({
    providedIn: 'root'
})
export class ExamineCommandService extends ExaminationBaseCommandService {

    constructor(
        gameState: GameStateService,
        sceneService: SceneService,
        stateMechanics: StateMechanicsService,
        flagMechanics: FlagMechanicsService,
        progress: ProgressMechanicsService,
        lightMechanics: LightMechanicsService,
        inventoryMechanics: InventoryMechanicsService,
        containerMechanics: ContainerMechanicsService,
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
            containerMechanics,
            scoreMechanics
        );
    }

    canHandle(command: GameCommand): boolean {
        return command.verb === 'examine' || 
               command.verb === 'x' ||
               command.verb === 'look at';
    }

    async handle(command: GameCommand): Promise<CommandResponse> {
        if (!command.object) {
            return {
                success: false,
                message: 'What do you want to examine?',
                incrementTurn: false
            };
        }

        const object = await this.findObject(command.object);
        if (!object) {
            return {
                success: false,
                message: `You don't see any ${command.object} here.`,
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

        const description = await this.getObjectDescription(object, true);
        return {
            success: true,
            message: description,
            incrementTurn: true
        };
    }

    getSuggestions(command: GameCommand): string[] {
        // Return an empty array since we can't get the examinable objects synchronously
        return [];
    }
}

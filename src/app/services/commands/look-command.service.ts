import { Injectable } from '@angular/core';
import { GameCommand, CommandResponse } from '../../models/game-state.model';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { StateMechanicsService } from '../mechanics/state-mechanics.service';
import { FlagMechanicsService } from '../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../mechanics/progress-mechanics.service';
import { LightMechanicsService } from '../mechanics/light-mechanics.service';
import { InventoryMechanicsService } from '../mechanics/inventory-mechanics.service';
import { ContainerMechanicsService } from '../mechanics/container-mechanics.service';
import { ScoreMechanicsService } from '../mechanics/score-mechanics.service';
import { GameTextService } from '../game-text.service';
import { ExaminationBaseCommandService } from './bases/examination-base-command.service';

@Injectable({
    providedIn: 'root'
})
export class LookCommandService extends ExaminationBaseCommandService {
    constructor(
        gameState: GameStateService,
        sceneService: SceneService,
        stateMechanics: StateMechanicsService,
        flagMechanics: FlagMechanicsService,
        progress: ProgressMechanicsService,
        lightMechanics: LightMechanicsService,
        inventoryMechanics: InventoryMechanicsService,
        containerMechanics: ContainerMechanicsService,
        scoreMechanics: ScoreMechanicsService,
        gameText: GameTextService
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
            scoreMechanics,
            gameText
        );
    }

    canHandle(command: GameCommand): boolean {
        return command.verb === 'look' || command.verb === 'l';
    }

    async handle(command: GameCommand): Promise<CommandResponse> {
        // If no object specified, describe the current scene
        if (!command.object) {
            const scene = this.sceneService.getCurrentScene();
            if (!scene) {
                return {
                    success: false,
                    message: 'Error: No current scene',
                    incrementTurn: false
                };
            }

            // Check if we can see
            if (!this.checkLightInScene()) {
                return {
                    success: false,
                    message: "It's too dark to see anything.",
                    incrementTurn: false
                };
            }

            return {
                success: true,
                message: this.sceneService.getSceneDescription(scene),
                incrementTurn: true
            };
        }

        // If looking at something specific, use examination base functionality
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

        const description = await this.getObjectDescription(object, false);
        return {
            success: true,
            message: description,
            incrementTurn: true
        };
    }

}

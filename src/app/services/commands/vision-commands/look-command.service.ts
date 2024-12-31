import { Injectable } from '@angular/core';
import { GameCommand, CommandResponse, SceneObject } from '../../../models/game-state.model';
import { GameStateService } from '../../game-state.service';
import { SceneService } from '../../scene.service';
import { FlagMechanicsService } from '../../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../../mechanics/progress-mechanics.service';
import { LightMechanicsService } from '../../mechanics/light-mechanics.service';
import { InventoryMechanicsService } from '../../mechanics/inventory-mechanics.service';
import { ContainerMechanicsService } from '../../mechanics/container-mechanics.service';
import { ScoreMechanicsService } from '../../mechanics/score-mechanics.service';
import { GameTextService } from '../../game-text.service';
import { ExaminationBaseCommandService } from '../bases/examination-base-command.service';

@Injectable({
    providedIn: 'root'
})
export class LookCommandService extends ExaminationBaseCommandService {
    constructor(
        gameState: GameStateService,
        sceneService: SceneService,
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

        return {
            success: false,
            message: "There is nothing to see here.",
            incrementTurn: true
        };
    }

    override async getSuggestions(command: GameCommand): Promise<string[]> {
        console.log('LookCommandService.getSuggestions called with:', command);
        
        if (!command.verb || !['look', 'l'].includes(command.verb)) {
            return [];
        }

        // Only suggest the basic look command since we don't support looking at specific objects
        return [command.verb];
    }
}

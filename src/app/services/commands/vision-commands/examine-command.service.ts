import { Injectable } from '@angular/core';
import { BaseCommandService } from '../bases/base-command.service';
import { GameStateService } from '../../game-state.service';
import { SceneMechanicsService } from '../../mechanics/scene-mechanics.service';
import { FlagMechanicsService } from '../../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../../mechanics/progress-mechanics.service';
import { LightMechanicsService } from '../../mechanics/light-mechanics.service';
import { InventoryMechanicsService } from '../../mechanics/inventory-mechanics.service';
import { ContainerMechanicsService } from '../../mechanics/container-mechanics.service';
import { ScoreMechanicsService } from '../../mechanics/score-mechanics.service';
import { ExaminationMechanicsService } from '../../mechanics/examination-mechanics.service';
import { GameTextService } from '../../game-text.service';
import { GameCommand, CommandResponse } from '../../../models';

/**
 * Command service for handling examine/look at commands.
 * 
 * Key Responsibilities:
 * - Handle examine/look at commands
 * - Validate examination targets
 * - Provide examination suggestions
 * 
 * Dependencies:
 * - ExaminationMechanicsService: Core examination logic
 * - SceneMechanicsService: Scene and object access
 * - LightMechanicsService: Visibility checks
 */
@Injectable({
    providedIn: 'root'
})
export class ExamineCommandService extends BaseCommandService {
    constructor(
        gameState: GameStateService,
        sceneService: SceneMechanicsService,
        flagMechanics: FlagMechanicsService,
        progress: ProgressMechanicsService,
        lightMechanics: LightMechanicsService,
        inventoryMechanics: InventoryMechanicsService,
        containerMechanics: ContainerMechanicsService,
        scoreMechanics: ScoreMechanicsService,
        private examinationMechanics: ExaminationMechanicsService,
        private gameText: GameTextService
    ) {
        super(
            gameState,
            sceneService,
            flagMechanics,
            progress,
            lightMechanics,
            inventoryMechanics,
            scoreMechanics,
            containerMechanics
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
                message: this.gameText.get('error.noExamineTarget'),
                incrementTurn: false
            };
        }

        const object = await this.sceneService.findObjectById(command.object);
        if (!object) {
            return {
                success: false,
                message: this.gameText.get('error.objectNotFound', { item: command.object }),
                incrementTurn: false
            };
        }

        // Check if we can examine the object
        const canExamine = await this.examinationMechanics.canExamine(object);
        if (!canExamine.success) {
            return canExamine;
        }

        // Get the object description
        const description = await this.examinationMechanics.getObjectDescription(object, true);
        return {
            success: true,
            message: description,
            incrementTurn: true
        };
    }

    override async getSuggestions(command: GameCommand): Promise<string[]> {
        if (!command.verb || !['examine', 'x', 'look at'].includes(command.verb)) {
            return [];
        }

        const examinableObjects = await this.examinationMechanics.getExaminableObjects();
        return examinableObjects.map(obj => `${command.verb} ${obj}`);
    }
}

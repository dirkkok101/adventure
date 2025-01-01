import { Injectable } from '@angular/core';
import { SceneMechanicsService } from '../../mechanics/scene-mechanics.service';
import { GameStateService } from '../../game-state.service';
import { FlagMechanicsService } from '../../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../../mechanics/progress-mechanics.service';
import { InventoryMechanicsService } from '../../mechanics/inventory-mechanics.service';
import { LightMechanicsService } from '../../mechanics/light-mechanics.service';
import { ErrorResponse } from '../bases/command-types';
import { BaseCommandService } from '../bases/base-command.service';
import { ScoreMechanicsService } from '../../mechanics/score-mechanics.service';
import { ContainerMechanicsService } from '../../mechanics/container-mechanics.service';
import { GameCommand, CommandResponse } from '../../../models';

@Injectable({
    providedIn: 'root'
})
export class ClimbCommandService extends BaseCommandService {
    constructor(
        gameState: GameStateService,
        sceneService: SceneMechanicsService,
        flagMechanics: FlagMechanicsService,
        progress: ProgressMechanicsService,
        lightMechanics: LightMechanicsService,
        inventoryMechanics: InventoryMechanicsService,
        scoreMechanics: ScoreMechanicsService,
        containerMechanics: ContainerMechanicsService
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
        return command.verb === 'climb';
    }

    async handle(command: GameCommand): Promise<CommandResponse> {
        if (!command.object) {
            return this.noObjectError('climb');
        }

        // Check if we can see
        if (!this.checkLightInScene()) {
            return this.tooDarkError();
        }

        const object = await this.findObject(command.object);
        if (!object) {
            return this.objectNotFoundError(command.object);
        }

        // Check if object has climb interaction
        if (!object.interactions?.['climb']) {
            return {
                success: false,
                message: "Climbing that would serve no purpose.",
                incrementTurn: true
            } as ErrorResponse;
        }

        throw new Error('Not implemented');
    }

    override async getSuggestions(command: GameCommand): Promise<string[]> {
        const currentScene = this.sceneService.getCurrentScene();
        if (!currentScene) {
            return [];
        }
        
        const visibleObjects = this.sceneService.getVisibleObjects(currentScene);

        // Filter for objects that have a climb interaction
        return visibleObjects
            .filter(obj => obj.interactions && obj.interactions['climb'] !== undefined)
            .map(obj => obj.name);
    }
}

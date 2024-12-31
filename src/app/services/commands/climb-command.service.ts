import { Injectable } from '@angular/core';
import { GameCommand, CommandResponse } from '../../models/game-state.model';
import { SceneService } from '../scene.service';
import { GameStateService } from '../game-state.service';
import { StateMechanicsService } from '../mechanics/state-mechanics.service';
import { FlagMechanicsService } from '../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../mechanics/progress-mechanics.service';
import { InventoryMechanicsService } from '../mechanics/inventory-mechanics.service';
import { LightMechanicsService } from '../mechanics/light-mechanics.service';
import { BaseObjectCommandService } from './base-object-command.service';
import { ErrorResponse } from './bases/command-types';

@Injectable({
    providedIn: 'root'
})
export class ClimbCommandService extends BaseObjectCommandService {
    constructor(
        gameState: GameStateService,
        sceneService: SceneService,
        stateMechanics: StateMechanicsService,
        flagMechanics: FlagMechanicsService,
        progress: ProgressMechanicsService,
        lightMechanics: LightMechanicsService,
        inventoryMechanics: InventoryMechanicsService
    ) {
        super(
            gameState,
            sceneService,
            stateMechanics,
            flagMechanics,
            progress,
            lightMechanics,
            inventoryMechanics
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

        // Handle the climb interaction using state mechanics
        return this.handleStateInteraction(object, 'climb');
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

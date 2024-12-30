import { Injectable } from '@angular/core';
import { GameCommand, SceneObject } from '../../models/game-state.model';
import { BaseObjectCommandService } from './base-object-command.service';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { LightMechanicsService } from '../mechanics/light-mechanics.service';
import { InventoryMechanicsService } from '../mechanics/inventory-mechanics.service';
import { StateMechanicsService } from '../mechanics/state-mechanics.service';
import { ContainerMechanicsService } from '../mechanics/container-mechanics.service';
import { FlagMechanicsService } from '../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../mechanics/progress-mechanics.service';

@Injectable({
    providedIn: 'root'
})
export class TakeCommandService extends BaseObjectCommandService {
    constructor(
        gameState: GameStateService,
        sceneService: SceneService,
        private stateMechanics: StateMechanicsService,
        private flagMechanics: FlagMechanicsService,
        private progress: ProgressMechanicsService,
        private lightMechanics: LightMechanicsService,
        private inventoryMechanics: InventoryMechanicsService,
        private containerMechanics: ContainerMechanicsService
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
        return command.verb === 'take' || command.verb === 'get' || command.verb === 'pick';
    }

    protected async handleInteraction(object: SceneObject, command: GameCommand): Promise<{ success: boolean; message: string; incrementTurn: boolean }> {
        // Check light
        if (!this.lightMechanics.isLightPresent()) {
            return {
                success: false,
                message: 'It is too dark to see what you are trying to take.',
                incrementTurn: false
            };
        }

        // Check if object can be taken
        if (!this.inventoryMechanics.canTakeObject(object)) {
            // Try state-based interaction first
            const stateResult = this.stateMechanics.handleInteraction(object, 'take');
            if (stateResult.success) {
                return { ...stateResult, incrementTurn: true };
            }

            // If no state handling, give generic message
            return {
                success: false,
                message: `You can't take the ${object.name}.`,
                incrementTurn: false
            };
        }

        // Check if it's in a closed container
        if (object.containerId) {
            const container = await this.findObject(object.containerId);
            if (container && !this.containerMechanics.isOpen(container.id)) {
                return {
                    success: false,
                    message: `The ${object.name} is inside the closed ${container.name}.`,
                    incrementTurn: false
                };
            }
        }

        // Take the object
        const result = this.inventoryMechanics.takeObject(object);
        return {
            ...result,
            incrementTurn: true
        };
    }
}

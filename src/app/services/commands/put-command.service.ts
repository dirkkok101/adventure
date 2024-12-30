import { Injectable } from '@angular/core';
import { GameCommand, SceneObject, CommandResponse } from '../../models/game-state.model';
import { ContainerBaseCommandService } from './bases/container-base-command.service';
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

@Injectable({
    providedIn: 'root'
})
export class PutCommandService extends ContainerBaseCommandService {
    constructor(
        gameState: GameStateService,
        sceneService: SceneService,
        stateMechanics: StateMechanicsService,
        flagMechanics: FlagMechanicsService,
        progress: ProgressMechanicsService,
        lightMechanics: LightMechanicsService,
        inventoryMechanics: InventoryMechanicsService,
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
        return command.verb === 'put';
    }

    async handle(command: GameCommand): Promise<CommandResponse> {
        if (!command.object) {
            return this.noObjectError(command.verb);
        }

        const object = await this.findObject(command.object);
        if (!object) {
            return this.objectNotFoundError(command.object);
        }

        return this.handleInteraction(object, command);
    }

    protected async handleInteraction(object: SceneObject, command: GameCommand): Promise<CommandResponse> {
        // Check light
        if (!this.lightMechanics.isLightPresent()) {
            return {
                success: false,
                message: 'It is too dark to see what you are doing.',
                incrementTurn: false
            };
        }

        if (!command.preposition || !command.indirect) {
            return {
                success: false,
                message: 'Put what where?',
                incrementTurn: false
            };
        }

        // Get the container object
        const container = await this.findObject(command.indirect);
        if (!container) {
            return {
                success: false,
                message: `You don't see any ${command.indirect} here.`,
                incrementTurn: false
            };
        }

        // Check if object is in inventory
        if (!await this.inventoryMechanics.hasItem(object.id)) {
            return {
                success: false,
                message: `You don't have the ${object.name}.`,
                incrementTurn: false
            };
        }

        // Check for state-based interactions first
        const stateResult = await this.stateMechanics.handleInteraction(container, 'put');
        if (stateResult.success) {
            // If state handling was successful, remove from inventory
            await this.inventoryMechanics.removeFromInventory(object.id);
            return { ...stateResult, incrementTurn: true };
        }

        // If no state handling, try container mechanics
        const result = await this.containerMechanics.putInContainer(object, container);
        if (result.success) {
            await this.inventoryMechanics.removeFromInventory(object.id);
            
            // Increment turns for successful action
            this.progress.incrementTurns();
        }

        return { ...result, incrementTurn: result.success };
    }
}

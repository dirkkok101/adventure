import { Injectable } from '@angular/core';
import { GameCommand, SceneObject } from '../../models/game-state.model';
import { BaseObjectCommandService } from './base-object-command.service';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { LightMechanicsService } from '../mechanics/light-mechanics.service';
import { StateMechanicsService } from '../mechanics/state-mechanics.service';
import { InventoryMechanicsService } from '../mechanics/inventory-mechanics.service';

@Injectable({
    providedIn: 'root'
})
export class ReadCommandService extends BaseObjectCommandService {
    constructor(
        gameState: GameStateService,
        sceneService: SceneService,
        private lightMechanics: LightMechanicsService,
        private stateMechanics: StateMechanicsService,
        private inventoryMechanics: InventoryMechanicsService
    ) {
        super(gameState, sceneService);
    }

    canHandle(command: GameCommand): boolean {
        return command.verb === 'read';
    }

    protected async handleInteraction(object: SceneObject, command: GameCommand): Promise<{ success: boolean; message: string; incrementTurn: boolean }> {
        // Check light
        if (!this.lightMechanics.isLightPresent()) {
            return {
                success: false,
                message: 'It is too dark to read anything.',
                incrementTurn: false
            };
        }

        // Check if object is readable
        if (!object.canRead && !object.interactions?.read) {
            return {
                success: false,
                message: `There's nothing to read on the ${object.name}.`,
                incrementTurn: false
            };
        }

        // Try state-based interaction first
        const stateResult = this.stateMechanics.handleInteraction(object, 'read');
        if (stateResult.success) {
            return { ...stateResult, incrementTurn: true };
        }

        // If it has readable content but no specific interaction
        if (object.readableContent) {
            return {
                success: true,
                message: object.readableContent,
                incrementTurn: true
            };
        }

        // Default response
        return {
            success: false,
            message: `You can't make out anything readable on the ${object.name}.`,
            incrementTurn: false
        };
    }
}

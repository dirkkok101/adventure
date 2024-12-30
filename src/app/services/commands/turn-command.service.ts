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
export class TurnCommandService extends BaseObjectCommandService {
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
        return command.verb === 'turn';
    }

    async handle(command: GameCommand): Promise<{ success: boolean; message: string; incrementTurn: boolean }> {
        if (!command.preposition || !command.object) {
            return {
                success: false,
                message: 'Turn what on or off?',
                incrementTurn: false
            };
        }

        if (!['on', 'off'].includes(command.preposition)) {
            return {
                success: false,
                message: 'You can only turn things on or off.',
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

        return this.handleInteraction(object, command);
    }

    protected async handleInteraction(object: SceneObject, command: GameCommand): Promise<{ success: boolean; message: string; incrementTurn: boolean }> {
        // Check if object can be turned on/off
        if (!object.canTurnOnOff && !object.interactions?.turn) {
            return {
                success: false,
                message: `You can't turn the ${object.name} on or off.`,
                incrementTurn: false
            };
        }

        // Try state-based interaction first
        const stateResult = this.stateMechanics.handleInteraction(object, `turn_${command.preposition}`);
        if (stateResult.success) {
            // If this is a light source, update light state
            if (object.isLightSource) {
                this.lightMechanics.setLightSourceState(object.id, command.preposition === 'on');
            }
            return { ...stateResult, incrementTurn: true };
        }

        // Handle default turn behavior for light sources
        if (object.isLightSource) {
            const newState = command.preposition === 'on';
            this.lightMechanics.setLightSourceState(object.id, newState);
            return {
                success: true,
                message: `You turn the ${object.name} ${command.preposition}.`,
                incrementTurn: true
            };
        }

        return {
            success: false,
            message: `Nothing happens when you try to turn the ${object.name} ${command.preposition}.`,
            incrementTurn: false
        };
    }
}

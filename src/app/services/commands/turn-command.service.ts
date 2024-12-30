import { Injectable } from '@angular/core';
import { GameCommand, SceneObject } from '../../models/game-state.model';
import { BaseObjectCommandService } from './base-object-command.service';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { LightMechanicsService } from '../mechanics/light-mechanics.service';
import { StateMechanicsService } from '../mechanics/state-mechanics.service';
import { InventoryMechanicsService } from '../mechanics/inventory-mechanics.service';
import { FlagMechanicsService } from '../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../mechanics/progress-mechanics.service';

@Injectable({
    providedIn: 'root'
})
export class TurnCommandService extends BaseObjectCommandService {
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

        // Find the object and check if it's visible
        const object = await this.findObject(command.object);
        if (!object) {
            return {
                success: false,
                message: `You don't see any ${command.object} here.`,
                incrementTurn: false
            };
        }

        // Check if we can see the object
        if (!this.lightMechanics.isObjectVisible(object)) {
            return {
                success: false,
                message: "It's too dark to see that.",
                incrementTurn: false
            };
        }

        return this.handleInteraction(object, command);
    }

    protected async handleInteraction(object: SceneObject, command: GameCommand): Promise<{ success: boolean; message: string; incrementTurn: boolean }> {
        // Check if object can be turned on/off
        if (!object.interactions?.['turn'] && !object.providesLight) {
            return {
                success: false,
                message: `You can't turn the ${object.name} on or off.`,
                incrementTurn: false
            };
        }

        // For portable light sources, check if they're in inventory
        if (object.providesLight && object.canTake && !await this.inventoryMechanics.hasItem(object.id)) {
            return {
                success: false,
                message: `You need to take the ${object.name} first.`,
                incrementTurn: false
            };
        }

        // Try state-based interaction first
        const stateResult = await this.stateMechanics.handleInteraction(object, `turn_${command.preposition}`);
        if (stateResult.success) {
            // If this is a light source, update light state
            if (object.providesLight) {
                const lightResult = this.lightMechanics.handleLightSource(object.id, command.preposition === 'on');
                if (!lightResult.success) {
                    return { ...lightResult, incrementTurn: false };
                }
            }
            return { ...stateResult, incrementTurn: true };
        }

        // Handle default turn behavior for light sources
        if (object.providesLight) {
            // For lantern, show battery status when turning on
            if (object.id === 'lantern' && command.preposition === 'on') {
                const batteryStatus = this.lightMechanics.getLanternBatteryStatus();
                if (batteryStatus.includes('dead')) {
                    return {
                        success: false,
                        message: batteryStatus,
                        incrementTurn: false
                    };
                }
            }

            const lightResult = this.lightMechanics.handleLightSource(object.id, command.preposition === 'on');
            return {
                success: lightResult.success,
                message: lightResult.message,
                incrementTurn: lightResult.success
            };
        }

        return {
            success: false,
            message: `Nothing happens when you try to turn the ${object.name} ${command.preposition}.`,
            incrementTurn: false
        };
    }
}

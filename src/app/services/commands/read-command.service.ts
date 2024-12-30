import { Injectable } from '@angular/core';
import { GameCommand, SceneObject, CommandResponse } from '../../models/game-state.model';
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
export class ReadCommandService extends BaseObjectCommandService {
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
        return command.verb === 'read';
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
                message: 'It is too dark to read anything.',
                incrementTurn: false
            };
        }

        // Check if object is visible
        if (!await this.checkVisibility(object)) {
            return {
                success: false,
                message: `You don't see any ${command.object} here.`,
                incrementTurn: false
            };
        }

        // Try state-based interaction first
        const stateResult = await this.stateMechanics.handleInteraction(object, 'read');
        if (stateResult.success) {
            // Increment turns for successful read
            this.progress.incrementTurns();
            return { ...stateResult, incrementTurn: true };
        }

        // Check if object has a read interaction
        if (!object.interactions?.['read']) {
            return {
                success: false,
                message: `There's nothing to read on the ${object.name}.`,
                incrementTurn: false
            };
        }

        // Check if any flags are required for reading
        const readInteraction = object.interactions['read'];
        if (readInteraction.requiredFlags && 
            !this.flagMechanics.checkFlags(readInteraction.requiredFlags)) {
            return {
                success: false,
                message: readInteraction.failureMessage || `You can't read the ${object.name} right now.`,
                incrementTurn: false
            };
        }

        // Handle successful read
        const message = readInteraction.message;
        
        // Grant any flags for reading
        if (readInteraction.grantsFlags) {
            readInteraction.grantsFlags.forEach(flag => this.flagMechanics.setFlag(flag));
        }

        // Remove any flags for reading
        if (readInteraction.removesFlags) {
            readInteraction.removesFlags.forEach(flag => this.flagMechanics.removeFlag(flag));
        }

        // Increment turns for successful read
        this.progress.incrementTurns();

        return {
            success: true,
            message,
            incrementTurn: true
        };
    }
}

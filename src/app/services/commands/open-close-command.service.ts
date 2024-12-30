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
export class OpenCloseCommandService extends ContainerBaseCommandService {
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
        return command.verb === 'open' || command.verb === 'close' || command.verb === 'shut';
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
        // Check if we can see what we're trying to interact with
        if (!this.lightMechanics.isLightPresent()) {
            return {
                success: false,
                message: `It's too dark to see what you're trying to ${command.verb}.`,
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

        const isOpenCommand = command.verb === 'open';
        const action = isOpenCommand ? 'open' : 'close';

        // Try state-based interaction first
        const stateResult = await this.stateMechanics.handleInteraction(object, action);
        if (stateResult.success) {
            this.progress.incrementTurns();
            return { ...stateResult, incrementTurn: true };
        }

        // Check if object has the specific interaction
        if (!object.isContainer && !object.interactions?.[action]) {
            return {
                success: false,
                message: `You can't ${action} the ${object.name}.`,
                incrementTurn: false
            };
        }

        // If it's a container, use container mechanics
        if (object.isContainer) {
            const result = isOpenCommand ? 
                await this.containerMechanics.openContainer(object) :
                await this.containerMechanics.closeContainer(object);

            if (result.success) {
                this.progress.incrementTurns();
            }
            return { ...result, incrementTurn: result.success };
        }

        // Handle non-container interactions
        const interaction = object.interactions?.[action];
        if (!interaction) {
            return {
                success: false,
                message: `You can't ${action} the ${object.name}.`,
                incrementTurn: false
            };
        }

        // Check required flags
        if (interaction.requiredFlags && 
            !this.flagMechanics.checkFlags(interaction.requiredFlags)) {
            return {
                success: false,
                message: interaction.failureMessage || `You can't ${action} the ${object.name} right now.`,
                incrementTurn: false
            };
        }

        // Handle flags
        if (interaction.grantsFlags) {
            interaction.grantsFlags.forEach(flag => this.flagMechanics.setFlag(flag));
        }
        if (interaction.removesFlags) {
            interaction.removesFlags.forEach(flag => this.flagMechanics.removeFlag(flag));
        }

        // Increment turns for successful action
        this.progress.incrementTurns();

        return {
            success: true,
            message: interaction.message,
            incrementTurn: true
        };
    }
}

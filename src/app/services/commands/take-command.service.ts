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
export class TakeCommandService extends ContainerBaseCommandService {
    constructor(
        gameState: GameStateService,
        sceneService: SceneService,
        stateMechanics: StateMechanicsService,
        flagMechanics: FlagMechanicsService,
        progress: ProgressMechanicsService,
        lightMechanics: LightMechanicsService,
        inventoryMechanics: InventoryMechanicsService,
        scoreMechanics: ScoreMechanicsService,
        protected override containerMechanics: ContainerMechanicsService,
        private gameText: GameTextService
    ) {
        super(
            gameState,
            sceneService,
            stateMechanics,
            flagMechanics,
            progress,
            lightMechanics,
            inventoryMechanics,
            scoreMechanics,
            containerMechanics
        );
    }

    canHandle(command: GameCommand): boolean {
        return command.verb === 'take' || command.verb === 'get' || command.verb === 'pick';
    }

    async handle(command: GameCommand): Promise<CommandResponse> {
        if (!command.object) {
            return {
                success: false,
                message: this.gameText.get('error.noObject', { action: command.verb }),
                incrementTurn: false
            };
        }

        const object = await this.findObject(command.object);
        if (!object) {
            return {
                success: false,
                message: this.gameText.get('error.objectNotFound', { item: command.object }),
                incrementTurn: false
            };
        }

        // Check light first
        if (!this.lightMechanics.isLightPresent()) {
            return {
                success: false,
                message: this.gameText.get('error.tooDark', { action: 'take' }),
                incrementTurn: false
            };
        }

        // Check if object is visible
        if (!await this.checkVisibility(object)) {
            return {
                success: false,
                message: this.gameText.get('error.objectNotVisible', { item: object.name }),
                incrementTurn: false
            };
        }

        // Try state-based interaction first
        const stateResult = await this.stateMechanics.handleInteraction(object, 'take');
        if (stateResult.success) {
            return { ...stateResult, incrementTurn: true };
        }

        // Check if object can be taken
        if (!this.inventoryMechanics.canTakeObject(object)) {
            return {
                success: false,
                message: this.gameText.get('error.cantTake', { item: object.name }),
                incrementTurn: false
            };
        }

        // Check if the object is in any container
        const state = this.gameState.getCurrentState();
        for (const [containerId, contents] of Object.entries(state.containers)) {
            if (contents.includes(object.id)) {
                const container = await this.findObject(containerId);
                if (container) {
                    const containerCheck = await this.checkContainer(container, 'take');
                    if (!containerCheck.success) {
                        return containerCheck;
                    }
                }
                break;
            }
        }

        // Take the object
        const result = await this.inventoryMechanics.takeObject(object);
        
        if (result.success) {
            // Handle scoring if object was in a container
            for (const [containerId, contents] of Object.entries(state.containers)) {
                if (contents.includes(object.id)) {
                    const container = await this.findObject(containerId);
                    if (container) {
                        await this.handleContainerInteraction(object, container, 'take');
                    }
                    break;
                }
            }
            
            // Increment turns for successful action
            this.progress.incrementTurns();
        }

        return { ...result, incrementTurn: result.success };
    }

    override async getSuggestions(command: GameCommand): Promise<string[]> {
        const suggestions = await super.getSuggestions(command);

        // Only suggest objects that can be taken
        if (!command.object) {
            const scene = this.sceneService.getCurrentScene();
            if (!scene?.objects) return suggestions;

            const sceneObjects = scene.objects;  // Create a stable reference that TypeScript can track
            return suggestions.filter(name => {
                const obj = Object.values(sceneObjects).find(o => o.name.toLowerCase() === name);
                return obj?.canTake;
            });
        }

        return suggestions;
    }
}

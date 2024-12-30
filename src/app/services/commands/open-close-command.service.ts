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
        return command.verb === 'open' || command.verb === 'close' || command.verb === 'shut';
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

        const isOpenCommand = command.verb === 'open';
        const action = isOpenCommand ? 'open' : 'close';

        // Check light first
        if (!this.lightMechanics.isLightPresent()) {
            return {
                success: false,
                message: this.gameText.get('error.tooDark', { action }),
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
        const stateResult = await this.stateMechanics.handleInteraction(object, action);
        if (stateResult.success) {
            return { ...stateResult, incrementTurn: true };
        }

        // If not a container and no specific interaction, return error
        if (!object.isContainer && !object.interactions?.[action]) {
            return {
                success: false,
                message: this.gameText.get('error.cantPerformAction', { action, item: object.name }),
                incrementTurn: false
            };
        }

        // Check container validity and state
        const containerCheck = await this.checkContainer(object, action);
        if (!containerCheck.success) {
            return containerCheck;
        }

        // Handle container action
        const result = isOpenCommand ? 
            await this.containerMechanics.openContainer(object) :
            await this.containerMechanics.closeContainer(object);

        if (result.success) {
            // Handle scoring
            await this.handleContainerInteraction(object, object, action);
            
            // Increment turns for successful action
            this.progress.incrementTurns();
        }

        return { ...result, incrementTurn: result.success };
    }

    override async getSuggestions(command: GameCommand): Promise<string[]> {
        const suggestions = await super.getSuggestions(command);

        // Only suggest objects that can be opened/closed
        if (!command.object) {
            const scene = this.sceneService.getCurrentScene();
            if (!scene) return suggestions;
            if (!scene.objects) return suggestions;
            
            const sceneObjects = scene.objects;  // Create a stable reference that TypeScript can track
            return suggestions.filter(name => {
                const obj = Object.values(sceneObjects).find(o => o.name.toLowerCase() === name);
                return obj && 
                    this.lightMechanics.isObjectVisible(obj) && 
                    (obj.isContainer || obj.interactions?.['open'] || obj.interactions?.['close']);
            });
        }

        return suggestions;
    }
}

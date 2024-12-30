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
        protected override containerMechanics: ContainerMechanicsService,
        scoreMechanics: ScoreMechanicsService,
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
        return command.verb === 'put' && !!command.object && !!command.target;
    }

    async handle(command: GameCommand): Promise<CommandResponse> {
        const item = await this.findObject(command.object || '');
        if (!item) {
            return {
                success: false,
                message: this.gameText.get('error.itemNotFound', { item: command.object || '' }),
                incrementTurn: false
            };
        }

        // Check if item is in inventory
        if (!await this.inventoryMechanics.hasItem(item.id)) {
            return {
                success: false,
                message: this.gameText.get('error.notHoldingItem', { item: item.name }),
                incrementTurn: false
            };
        }

        const container = await this.findObject(command.target || '');
        if (!container) {
            return {
                success: false,
                message: this.gameText.get('error.containerNotFound', { container: command.target || '' }),
                incrementTurn: false
            };
        }

        // Check container validity and state
        const containerCheck = await this.checkContainer(container, 'put');
        if (!containerCheck.success) {
            return containerCheck;
        }

        // Check container capacity
        if (!await this.containerMechanics.canAddToContainer(container.id, item.id)) {
            return {
                success: false,
                message: this.gameText.get('error.containerFull', { container: container.name }),
                incrementTurn: false
            };
        }

        // Add item to container and remove from inventory
        await this.containerMechanics.addToContainer(container.id, item.id);
        await this.inventoryMechanics.removeFromInventory(item.id);

        // Check for scoring
        const score = item.scoring?.containerTargets?.[container.id] || 0;
        if (score > 0) {
            await this.scoreMechanics.addScore(score);
        }

        return {
            success: true,
            message: this.gameText.get('success.putInContainer', { item: item.name, container: container.name }),
            incrementTurn: true
        };
    }

    override async getSuggestions(command: GameCommand): Promise<string[]> {
        // Only suggest if we have a verb
        if (!command.verb) {
            return [];
        }

        const scene = this.sceneService.getCurrentScene();
        if (!scene?.objects) return [];

        const suggestions = new Set<string>();
        const state = this.gameState.getCurrentState();

        // If we don't have an object yet, suggest inventory items
        if (!command.object) {
            for (const id of Object.keys(state.inventory)) {
                const obj = scene.objects[id];
                if (obj) {
                    suggestions.add(obj.name.toLowerCase());
                }
            }
            return Array.from(suggestions);
        }

        // If we have an object but no target, suggest containers
        if (!command.target) {
            for (const obj of Object.values(scene.objects)) {
                if (obj.isContainer && this.lightMechanics.isObjectVisible(obj)) {
                    suggestions.add(obj.name.toLowerCase());
                }
            }
            return Array.from(suggestions);
        }

        return [];
    }
}

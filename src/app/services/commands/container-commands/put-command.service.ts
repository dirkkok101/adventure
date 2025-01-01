import { Injectable } from '@angular/core';
import { BaseCommandService } from '../bases/base-command.service';
import { GameStateService } from '../../game-state.service';
import { SceneMechanicsService } from '../../mechanics/scene-mechanics.service';
import { FlagMechanicsService } from '../../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../../mechanics/progress-mechanics.service';
import { LightMechanicsService } from '../../mechanics/light-mechanics.service';
import { InventoryMechanicsService } from '../../mechanics/inventory-mechanics.service';
import { ContainerMechanicsService } from '../../mechanics/container-mechanics.service';
import { ScoreMechanicsService } from '../../mechanics/score-mechanics.service';
import { GameTextService } from '../../game-text.service';
import { ContainerSuggestionService } from '../../mechanics/container-suggestion.service';
import { GameCommand, CommandResponse, SceneObject } from '../../../models';

/**
 * Command service for handling 'put' commands that place items into containers.
 * 
 * Key Responsibilities:
 * - Validate item and container existence
 * - Check container accessibility and capacity
 * - Manage item transfer between inventory and container
 * - Handle scoring for special container placements
 * 
 * Dependencies:
 * - ContainerMechanicsService: Container state and operations
 * - InventoryMechanicsService: Inventory management
 * - ScoreMechanicsService: Scoring for special placements
 * - LightMechanicsService: Visibility checks
 * 
 * Command Format:
 * - "put [item] in [container]"
 * - Requires both item and container parameters
 */
@Injectable({
    providedIn: 'root'
})
export class PutCommandService extends BaseCommandService {
    constructor(
        gameState: GameStateService,
        sceneService: SceneMechanicsService,
        flagMechanics: FlagMechanicsService,
        progress: ProgressMechanicsService,
        lightMechanics: LightMechanicsService,
        inventoryMechanics: InventoryMechanicsService,
        containerMechanics: ContainerMechanicsService,
        scoreMechanics: ScoreMechanicsService,
        private containerSuggestions: ContainerSuggestionService,
        private gameText: GameTextService
    ) {
        super(
            gameState,
            sceneService,
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
        if (!command.object || !command.target) {
            return this.noObjectError('put');
        }

        const scene = this.sceneService.getCurrentScene();
        if (!scene) {
            return this.noSceneError();
        }

        if (!await this.lightMechanics.isSceneVisible(scene.id)) {
            return this.tooDarkError();
        }

        // Find the item and container
        const item = await this.findObject(command.object);
        const container = await this.findObject(command.target);

        if (!item) {
            return {
                success: false,
                message: `You don't have a ${command.object}.`,
                incrementTurn: false
            };
        }

        if (!container) {
            return {
                success: false,
                message: `You don't see a ${command.target} here.`,
                incrementTurn: false
            };
        }

        // Validate container access
        const validationResult = await this.containerMechanics.validateContainerAccess(container, 'put');
        if (!validationResult.success) {
            return validationResult;
        }

        // Check if the item is in the inventory
        if (!await this.inventoryMechanics.hasItem(item.id)) {
            return {
                success: false,
                message: `You don't have the ${item.name}.`,
                incrementTurn: false
            };
        }

        // Move the item to the container
        await this.containerMechanics.addToContainer(container.id, item.id);
        await this.inventoryMechanics.removeFromInventory(item.id);

        // Check for special container placements and award score
        await this.checkSpecialPlacement(item, container);

        return {
            success: true,
            message: `You put the ${item.name} in the ${container.name}.`,
            incrementTurn: true
        };
    }

    async getSuggestions(command: GameCommand): Promise<string[]> {
        if (!command.verb) {
            return [];
        }

        return this.containerSuggestions.getContainerSuggestions(command);
    }

    private async checkSpecialPlacement(item: SceneObject, container: SceneObject): Promise<void> {
        // Check for special container placements and award score
        if (item.specialContainers?.includes(container.id)) {
            await this.scoreMechanics.awardPoints(10, `Putting ${item.name} in ${container.name}`);
        }
    }
}

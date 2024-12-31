import { Injectable } from '@angular/core';
import { GameCommand, SceneObject, CommandResponse } from '../../../models/game-state.model';
import { GameStateService } from '../../game-state.service';
import { SceneService } from '../../scene.service';
import { FlagMechanicsService } from '../../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../../mechanics/progress-mechanics.service';
import { LightMechanicsService } from '../../mechanics/light-mechanics.service';
import { InventoryMechanicsService } from '../../mechanics/inventory-mechanics.service';
import { ScoreMechanicsService } from '../../mechanics/score-mechanics.service';
import { ContainerMechanicsService } from '../../mechanics/container-mechanics.service';
import { BaseCommandService } from '../bases/base-command.service';

@Injectable({
    providedIn: 'root'
})
export class InventoryCommandService extends BaseCommandService {
    constructor(
        gameState: GameStateService,
        sceneService: SceneService,
        flagMechanics: FlagMechanicsService,
        progress: ProgressMechanicsService,
        lightMechanics: LightMechanicsService,
        inventoryMechanics: InventoryMechanicsService,
        scoreMechanics: ScoreMechanicsService,
        containerMechanics: ContainerMechanicsService
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
        return command.verb === 'inventory' || command.verb === 'i' || command.verb === 'inv';
    }

    async handle(command: GameCommand): Promise<CommandResponse> {
        // Get inventory items
        const itemIds = this.inventoryMechanics.listInventory();
        
        // No items case
        if (itemIds.length === 0) {
            return {
                success: true,
                message: "You aren't carrying anything.",
                incrementTurn: false
            };
        }

        // Get objects and their descriptions
        const items: SceneObject[] = [];
        for (const id of itemIds) {
            const item = await this.sceneService.findObject(id);
            if (item) {
                items.push(item);
            }
        }

        // Build inventory list with descriptions
        const itemDescriptions = items.map(item => {
            return `${item.name}: ${item.descriptions}`;
        });


        // Calculate total weight if weight tracking is enabled
        const totalWeight = await this.inventoryMechanics.getCurrentWeight();
        const maxWeight = await this.inventoryMechanics.getMaxWeight();
        const weightInfo = totalWeight > 0 ? `\nTotal weight: ${totalWeight}/${maxWeight}` : '';

        return {
            success: true,
            message: `You are carrying:\n${itemDescriptions.join('\n')}${weightInfo}`,
            incrementTurn: false
        };
    }

}

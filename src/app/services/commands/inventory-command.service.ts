import { Injectable } from '@angular/core';
import { GameCommand, SceneObject, CommandResponse } from '../../models/game-state.model';
import { BaseObjectCommandService } from './base-object-command.service';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { StateMechanicsService } from '../mechanics/state-mechanics.service';
import { FlagMechanicsService } from '../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../mechanics/progress-mechanics.service';
import { LightMechanicsService } from '../mechanics/light-mechanics.service';
import { InventoryMechanicsService } from '../mechanics/inventory-mechanics.service';
import { GameTextService } from '../game-text.service';

@Injectable({
    providedIn: 'root'
})
export class InventoryCommandService extends BaseObjectCommandService {
    constructor(
        gameState: GameStateService,
        sceneService: SceneService,
        stateMechanics: StateMechanicsService,
        flagMechanics: FlagMechanicsService,
        progress: ProgressMechanicsService,
        lightMechanics: LightMechanicsService,
        inventoryMechanics: InventoryMechanicsService,
        private gameText: GameTextService
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
        const itemDescriptions = await Promise.all(items.map(async item => {
            // Check if item has a special state description
            const defaultDesc = item.descriptions?.['default'] || '';
            const stateDesc = await this.stateMechanics.getStateBasedDescription(
                { states: item.descriptions?.states },
                defaultDesc
            );
            if (stateDesc && stateDesc !== defaultDesc) {
                return `- ${item.name}: ${stateDesc}`;
            }

            // Check if item is a container and has contents
            const contents = await this.inventoryMechanics.getContainerContents(item.id);
            if (contents && contents.length > 0) {
                const contentItems = await Promise.all(contents.map(id => this.sceneService.findObject(id)));
                const contentNames = contentItems.filter(Boolean).map(obj => obj?.name).join(', ');
                return `- ${item.name} (containing: ${contentNames})`;
            }

            // Default description
            return `- ${item.name}`;
        }));

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

    getSuggestions(command: GameCommand): string[] {
        if (!command.verb || command.verb === 'i' || command.verb.startsWith('inv')) {
            return ['inventory'];
        }
        return [];
    }
}

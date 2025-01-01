import { Injectable } from '@angular/core';
import { GameStateService } from '../../game-state.service';
import { SceneMechanicsService } from '../../mechanics/scene-mechanics.service';
import { LightMechanicsService } from '../../mechanics/light-mechanics.service';
import { InventoryMechanicsService } from '../../mechanics/inventory-mechanics.service';
import { FlagMechanicsService } from '../../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../../mechanics/progress-mechanics.service';
import { BaseCommandService } from '../bases/base-command.service';
import { ContainerMechanicsService } from '../../mechanics/container-mechanics.service';
import { ScoreMechanicsService } from '../../mechanics/score-mechanics.service';
import { GameCommand, CommandResponse } from '../../../models';

@Injectable({
    providedIn: 'root'
})
export class ReadObjectCommandService extends BaseCommandService {
    constructor(
        gameState: GameStateService,
        sceneService: SceneMechanicsService,
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

    override canHandle(command: GameCommand): boolean {
        console.log('ReadCommandService.canHandle called with:', command);
        const result = command.verb === 'read';
        console.log('ReadCommandService.canHandle result:', result);
        return result;
    }

    override async handle(command: GameCommand): Promise<CommandResponse> {
        console.log('ReadCommandService.handle called with:', command);
        if (!command.object) {
            return this.noObjectError('read');
        }

        const object = await this.findObject(command.object);
        if (!object) {
            return this.objectNotFoundError(command.object);
        }

        if (!object.interactions?.['read']) {
            return { 
                success: false, 
                message: `You can't read the ${object.name}.`,
                incrementTurn: false
            };
        }

        if (!await this.checkVisibility(object)) {
            return this.tooDarkError();
        }

        return { 
            success: true, 
            message: object.interactions['read'].message,
            incrementTurn: true
        };
    }

    override async getSuggestions(command: GameCommand): Promise<string[]> {
        const suggestions = await super.getSuggestions(command);

        console.log('ReadCommandService.getSuggestions called');
        const scene = this.sceneService.getCurrentScene();
        console.log('Current scene:', scene?.id);
        if (!scene) return [];
        
        // Get readable objects from inventory
        const inventoryItems = await this.inventoryMechanics.listInventory();
        console.log('Inventory items:', inventoryItems);
        
        for (const itemId of inventoryItems) {
            const item = await this.sceneService.findObjectById(itemId);
            console.log('Checking inventory item:', itemId, item?.name, 'has read interaction:', !!item?.interactions?.['read']);
            if (item && item.interactions?.['read']) {
                suggestions.push(`read ${item.name.toLowerCase()}`);
            }
        }

        // Get readable objects from current scene
        if (scene.objects) {
            console.log('Scene objects:', Object.keys(scene.objects));
            for (const object of Object.values(scene.objects)) {
                const isVisible = await this.checkVisibility(object);
                console.log('Checking scene object:', object.id, object.name, 
                    'visible:', isVisible,
                    'has read interaction:', !!object.interactions?.['read']);
                if (isVisible && object.interactions?.['read']) {
                    suggestions.push(`read ${object.name.toLowerCase()}`);
                }
            }
        }

        console.log('Read suggestions:', suggestions);
        return suggestions;
    }
}

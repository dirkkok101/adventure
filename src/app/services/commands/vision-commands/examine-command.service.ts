import { Injectable } from '@angular/core';
import { GameCommand, CommandResponse } from '../../../models/game-state.model';
import { GameStateService } from '../../game-state.service';
import { SceneService } from '../../scene.service';
import { ContainerMechanicsService } from '../../mechanics/container-mechanics.service';
import { FlagMechanicsService } from '../../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../../mechanics/progress-mechanics.service';
import { LightMechanicsService } from '../../mechanics/light-mechanics.service';
import { InventoryMechanicsService } from '../../mechanics/inventory-mechanics.service';
import { ScoreMechanicsService } from '../../mechanics/score-mechanics.service';
import { GameTextService } from '../../game-text.service';
import { ExaminationBaseCommandService } from '../bases/examination-base-command.service';

@Injectable({
    providedIn: 'root'
})
export class ExamineCommandService extends ExaminationBaseCommandService {

    constructor(
        gameState: GameStateService,
        sceneService: SceneService,
        flagMechanics: FlagMechanicsService,
        progress: ProgressMechanicsService,
        lightMechanics: LightMechanicsService,
        inventoryMechanics: InventoryMechanicsService,
        containerMechanics: ContainerMechanicsService,
        scoreMechanics: ScoreMechanicsService,
        gameText: GameTextService
    ) {
        super(
            gameState,
            sceneService,
            flagMechanics,
            progress,
            lightMechanics,
            inventoryMechanics,
            containerMechanics,
            scoreMechanics,
            gameText
        );
    }

    canHandle(command: GameCommand): boolean {
        return command.verb === 'examine' || 
               command.verb === 'x' ||
               command.verb === 'look at';
    }

    async handle(command: GameCommand): Promise<CommandResponse> {
        if (!command.object) {
            return {
                success: false,
                message: 'What do you want to examine?',
                incrementTurn: false
            };
        }

        const object = await this.findObject(command.object);
        if (!object) {
            return {
                success: false,
                message: `You don't see any ${command.object} here.`,
                incrementTurn: false
            };
        }

        if (!await this.checkVisibility(object)) {
            return {
                success: false,
                message: "It's too dark to see that.",
                incrementTurn: false
            };
        }

        const description = await this.getObjectDescription(object, true);
        return {
            success: true,
            message: description,
            incrementTurn: true
        };
    }

    override async getSuggestions(command: GameCommand): Promise<string[]> {
        console.log('ExamineCommandService.getSuggestions called with:', command);
        const suggestions = await super.getSuggestions(command);
        console.log('Base suggestions:', suggestions);

        if (!command.verb || !['examine', 'x', 'look at'].includes(command.verb)) {
            return [];
        }

        const scene = await this.sceneService.getCurrentScene();
        if (!scene) return [];

        const result: string[] = [];
        
        // Get examinable objects from inventory
        const inventoryItems = await this.inventoryMechanics.listInventory();
        console.log('Inventory items:', inventoryItems);
        
        for (const itemId of inventoryItems) {
            const item = await this.sceneService.findObjectById(itemId);
            console.log('Checking inventory item:', itemId, item?.name, 
                'has examine interaction:', !!item?.interactions?.['examine'],
                'has look interaction:', !!item?.interactions?.['look']);
            
            if (item) {
                result.push(`${command.verb} ${item.name.toLowerCase()}`);
            }
        }

        // Get examinable objects from current scene
        if (scene.objects) {
            console.log('Scene objects:', Object.keys(scene.objects));
            for (const object of Object.values(scene.objects)) {
                const isVisible = await this.checkVisibility(object);
                console.log('Checking scene object:', object.id, object.name, 
                    'visible:', isVisible,
                    'has examine interaction:', !!object.interactions?.['examine'],
                    'has look interaction:', !!object.interactions?.['look']);
                
                if (isVisible) {
                    result.push(`${command.verb} ${object.name.toLowerCase()}`);
                }
            }
        }

        // Get objects from open containers
        const state = this.gameState.getCurrentState();
        for (const [containerId, contents] of Object.entries(state.containers)) {
            // Skip if container is closed
            const isOpen = await this.containerMechanics.isOpen(containerId);
            if (!isOpen) {
                continue;
            }

            console.log('Checking container:', containerId, 'contents:', contents);
            for (const itemId of contents) {
                const item = await this.sceneService.findObjectById(itemId);
                if (!item) continue;

                console.log('Checking container item:', itemId, item.name,
                    'has examine interaction:', !!item.interactions?.['examine'],
                    'has look interaction:', !!item.interactions?.['look']);

                result.push(`${command.verb} ${item.name.toLowerCase()}`);
            }
        }

        console.log('Examine suggestions:', result);
        return result;
    }
}

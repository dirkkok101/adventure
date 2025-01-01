import { Injectable } from '@angular/core';
import { ContainerBaseCommandService } from '../bases/container-base-command.service';
import { GameStateService } from '../../game-state.service';
import { SceneMechanicsService } from '../../mechanics/scene-mechanics.service';
import { FlagMechanicsService } from '../../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../../mechanics/progress-mechanics.service';
import { LightMechanicsService } from '../../mechanics/light-mechanics.service';
import { InventoryMechanicsService } from '../../mechanics/inventory-mechanics.service';
import { ContainerMechanicsService } from '../../mechanics/container-mechanics.service';
import { ScoreMechanicsService } from '../../mechanics/score-mechanics.service';
import { GameTextService } from '../../game-text.service';
import { GameCommand, CommandResponse } from '../../../models';
import { ContainerSuggestionService } from '../../mechanics/container-suggestion.service';
import { BaseCommandService } from '../bases/base-command.service';

@Injectable({
    providedIn: 'root'
})
export class OpenCloseContainerCommandService extends BaseCommandService {
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

        // First try to find an exit with this name/direction
        const exit = this.sceneService.findExit(command.object);
        if (exit) {
            const result = isOpenCommand ? 
                await this.sceneService.openExit(exit) :
                await this.sceneService.closeExit(exit);

            if (result.success && result.score) {
                await this.scoreMechanics.addScore(result.score);
            }

            return {
                success: result.success,
                message: result.message,
                incrementTurn: result.success
            };
        }

        // If not an exit, try to find an object
        const object = await this.findObject(command.object);
        if (!object) {
            return {
                success: false,
                message: this.gameText.get('error.objectNotFound', { item: command.object }),
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

        // Check if object has specific interaction for this action
        if (object.interactions?.[action]) {
            const interaction = object.interactions[action];
            
            // Check required flags
            if (interaction.requiredFlags && !await this.flagMechanics.checkFlags(interaction.requiredFlags)) {
                return {
                    success: false,
                    message: interaction.failureMessage || 
                            this.gameText.get('error.cantPerformAction', { action, item: object.name }),
                    incrementTurn: false
                };
            }

            // Handle scoring
            if (interaction.score) {
                await this.scoreMechanics.addScore(interaction.score);
            }
            
            // Increment turns for successful action
            this.progress.incrementTurns();

            return {
                success: true,
                message: interaction.message,
                incrementTurn: true
            };
        }

        // If no interaction and not a container, return error
        if (!object.isContainer) {
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
            const score = object.scoring?.[action];
            if (score) {
                await this.scoreMechanics.addScore(score);
            }
            
            // Increment turns for successful action
            this.progress.incrementTurns();
        }

        return { ...result, incrementTurn: result.success };
    }

    override async getSuggestions(command: GameCommand): Promise<string[]> {
        console.log('OpenCloseCommandService.getSuggestions called with:', command);
        const suggestions = await super.getSuggestions(command);
        console.log('Base suggestions:', suggestions);

        if (!command.verb || !['open', 'close', 'shut'].includes(command.verb)) {
            return [];
        }

        const scene = this.sceneService.getCurrentScene();
        if (!scene) return [];

        const result: string[] = [];
        
        // Get openable/closeable objects from inventory
        const inventoryItems = await this.inventoryMechanics.listInventory();
        console.log('Inventory items:', inventoryItems);
        
        for (const itemId of inventoryItems) {
            const item = await this.sceneService.findObjectById(itemId);
            console.log('Checking inventory item:', itemId, item?.name, 
                'is container:', item?.isContainer,
                'has open interaction:', !!item?.interactions?.['open'],
                'has close interaction:', !!item?.interactions?.['close']);
            
            if (item && (item.isContainer || item.interactions?.[command.verb])) {
                result.push(`${command.verb} ${item.name.toLowerCase()}`);
            }
        }

        // Get openable/closeable objects from current scene
        if (scene.objects) {
            console.log('Scene objects:', Object.keys(scene.objects));
            for (const object of Object.values(scene.objects)) {
                const isVisible = await this.checkVisibility(object);
                console.log('Checking scene object:', object.id, object.name, 
                    'visible:', isVisible,
                    'is container:', object.isContainer,
                    'has open interaction:', !!object.interactions?.['open'],
                    'has close interaction:', !!object.interactions?.['close']);
                
                if (isVisible && (object.isContainer || object.interactions?.[command.verb])) {
                    result.push(`${command.verb} ${object.name.toLowerCase()}`);
                }
            }
        }

        console.log('Open/close suggestions:', result);
        return result;
    }
}

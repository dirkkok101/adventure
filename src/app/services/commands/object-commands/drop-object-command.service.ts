import { Injectable } from '@angular/core';
import { GameCommand, SceneObject, CommandResponse } from '../../../models/game-state.model';
import { GameStateService } from '../../game-state.service';
import { SceneService } from '../../scene.service';
import { InventoryMechanicsService } from '../../mechanics/inventory-mechanics.service';
import { ScoreMechanicsService } from '../../mechanics/score-mechanics.service';
import { ProgressMechanicsService } from '../../mechanics/progress-mechanics.service';
import { FlagMechanicsService } from '../../mechanics/flag-mechanics.service';
import { LightMechanicsService } from '../../mechanics/light-mechanics.service';
import { BaseCommandService } from '../bases/base-command.service';
import { ContainerMechanicsService } from '../../mechanics/container-mechanics.service';

@Injectable({
    providedIn: 'root'
})
export class DropObjectCommandService extends BaseCommandService {
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
        // Only handle 'drop' without preposition, use PutCommandService for 'put in'
        return command.verb === 'drop' && !command.preposition;
    }

    async handle(command: GameCommand): Promise<CommandResponse> {
        if (!command.object) {
            return this.noObjectError('drop');
        }

        const object = await this.findObject(command.object);
        if (!object) {
            return this.objectNotFoundError(command.object);
        }

        // Check if we have the object
        if (!await this.inventoryMechanics.hasItem(object.id)) {
            return {
                success: false,
                message: `You don't have the ${object.name}.`,
                incrementTurn: false
            };
        }

        // Remove from inventory
        const dropResult = await this.inventoryMechanics.dropObject(object);
        if (!dropResult.success) {
            return { ...dropResult, incrementTurn: false };
        }

        // Add to current scene
        const sceneResult = await this.sceneService.addObjectToScene(object);
        if (!sceneResult.success) {
            // If adding to scene fails, we need to handle this error case
            // Ideally we should have a way to rollback the inventory change
            return { ...sceneResult, incrementTurn: false };
        }

        // Handle scoring
        const dropScore = object.scoring?.drop;
        if (dropScore) {
            await this.scoreMechanics.addScore(dropScore);
        }
        this.progress.incrementTurns();

        return { 
            success: true, 
            message: dropResult.message, 
            incrementTurn: true 
        };
    }

    override async getSuggestions(command: GameCommand): Promise<string[]> {
        if (!command.verb || command.verb !== 'drop') {
            return [];
        }

        const result: string[] = [];
        
        // Get droppable objects from inventory
        const inventoryItems = await this.inventoryMechanics.listInventory();
        for (const itemId of inventoryItems) {
            const item = await this.sceneService.findObjectById(itemId);
            if (item) {
                result.push(`drop ${item.name.toLowerCase()}`);
            }
        }

        return result;
    }
}

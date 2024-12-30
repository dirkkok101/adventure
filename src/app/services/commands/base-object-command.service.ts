import { Injectable } from '@angular/core';
import { GameCommand, SceneObject, CommandResponse } from '../../models/game-state.model';
import { SceneService } from '../scene.service';
import { GameStateService } from '../game-state.service';
import { StateMechanicsService } from '../mechanics/state-mechanics.service';
import { FlagMechanicsService } from '../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../mechanics/progress-mechanics.service';
import { LightMechanicsService } from '../mechanics/light-mechanics.service';
import { InventoryMechanicsService } from '../mechanics/inventory-mechanics.service';

@Injectable()
export abstract class BaseObjectCommandService {
    constructor(
        protected gameState: GameStateService,
        protected sceneService: SceneService,
        protected stateMechanics: StateMechanicsService,
        protected flagMechanics: FlagMechanicsService,
        protected progress: ProgressMechanicsService,
        protected lightMechanics: LightMechanicsService,
        protected inventoryMechanics: InventoryMechanicsService
    ) {}

    abstract canHandle(command: GameCommand): boolean;

    abstract handle(command: GameCommand): Promise<CommandResponse>;

    protected async checkVisibility(object: SceneObject): Promise<boolean> {
        return this.lightMechanics.isObjectVisible(object) || await this.inventoryMechanics.hasItem(object.id);
    }

    protected checkLightInScene(): boolean {
        const scene = this.sceneService.getCurrentScene();
        return scene ? (this.lightMechanics.isLightPresent() || !!scene.light) : false;
    }

    protected async findObject(objectName: string): Promise<SceneObject | null> {
        const scene = this.sceneService.getCurrentScene();
        if (!scene) return null;

        // Check inventory first
        const inventoryItems = this.inventoryMechanics.listInventory();
        for (const itemId of inventoryItems) {
            const item = await this.sceneService.findObject(itemId);
            if (item && item.name.toLowerCase() === objectName.toLowerCase()) {
                return item;
            }
        }

        // Then check scene
        const objects = scene.objects || {};
        const sceneObjects = Object.values(objects);
        
        // Find matching objects
        for (const obj of sceneObjects) {
            if (obj.name.toLowerCase() === objectName.toLowerCase() && 
                await this.checkVisibility(obj)) {
                return obj;
            }
        }

        return null;
    }

    protected async handleStateInteraction(object: SceneObject, verb: string): Promise<CommandResponse> {
        const result = await this.stateMechanics.handleInteraction(object, verb);
        if (result.success) {
            await this.gameState.addKnownObject(object.id);
        }
        return {
            success: result.success,
            message: result.message,
            incrementTurn: result.success
        };
    }

    protected noObjectError(verb: string): CommandResponse {
        return { 
            success: false, 
            message: `What do you want to ${verb}?`,
            incrementTurn: false 
        };
    }

    protected noSceneError(): CommandResponse {
        return { 
            success: false, 
            message: 'Error: No current scene',
            incrementTurn: false 
        };
    }

    protected tooDarkError(): CommandResponse {
        return {
            success: false,
            message: "It's too dark to see anything.",
            incrementTurn: false
        };
    }

    protected objectNotFoundError(objectName: string): CommandResponse {
        return { 
            success: false, 
            message: `You don't see any ${objectName} here.`,
            incrementTurn: false 
        };
    }

    protected cannotInteractError(verb: string, objectName: string): CommandResponse {
        return { 
            success: false, 
            message: `You can't ${verb} the ${objectName}.`,
            incrementTurn: false 
        };
    }

    async getSuggestions(command: GameCommand): Promise<string[]> {
        // Only suggest objects if we have a verb
        if (!command.verb) {
            return [];
        }

        // Only suggest objects if we don't have one yet
        if (command.object) {
            return [];
        }

        return [];
    }
}

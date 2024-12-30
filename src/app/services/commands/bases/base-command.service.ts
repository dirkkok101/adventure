import { Injectable } from '@angular/core';
import { GameCommand, SceneObject, CommandResponse } from '../../../models/game-state.model';
import { GameStateService } from '../../game-state.service';
import { SceneService } from '../../scene.service';
import { StateMechanicsService } from '../../mechanics/state-mechanics.service';
import { FlagMechanicsService } from '../../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../../mechanics/progress-mechanics.service';
import { LightMechanicsService } from '../../mechanics/light-mechanics.service';
import { InventoryMechanicsService } from '../../mechanics/inventory-mechanics.service';
import { ScoreMechanicsService } from '../../mechanics/score-mechanics.service';
import { ICommandService, ScoringOptions, ErrorResponse, SuccessResponse } from './command-types';

@Injectable()
export abstract class BaseCommandService implements ICommandService {
    constructor(
        protected gameState: GameStateService,
        protected sceneService: SceneService,
        protected stateMechanics: StateMechanicsService,
        protected flagMechanics: FlagMechanicsService,
        protected progress: ProgressMechanicsService,
        protected lightMechanics: LightMechanicsService,
        protected inventoryMechanics: InventoryMechanicsService,
        protected scoreMechanics: ScoreMechanicsService
    ) {}

    abstract canHandle(command: GameCommand): boolean;
    abstract handle(command: GameCommand): Promise<CommandResponse>;
    abstract getSuggestions?(command: GameCommand): string[];

    protected async handleScoring({ action, object, container, skipGeneralScore = false }: ScoringOptions): Promise<void> {
        await this.scoreMechanics.handleObjectScoring(
            { action, object, container, skipGeneralScore },
            this.flagMechanics
        );
    }

    protected async checkVisibility(object: SceneObject): Promise<boolean> {
        if (!this.lightMechanics.isLightPresent()) {
            return false;
        }
        return this.lightMechanics.isObjectVisible(object) || await this.inventoryMechanics.hasItem(object.id);
    }

    protected checkLightInScene(): boolean {
        const scene = this.sceneService.getCurrentScene();
        if (!scene) return false;
        
        return this.lightMechanics.isLightPresent() || !!scene.light;
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
        for (const obj of Object.values(objects)) {
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

    // Error responses
    protected noObjectError(verb: string): ErrorResponse {
        return { 
            success: false, 
            message: `What do you want to ${verb}?`,
            incrementTurn: false 
        };
    }

    protected noSceneError(): ErrorResponse {
        return { 
            success: false, 
            message: 'Error: No current scene',
            incrementTurn: false 
        };
    }

    protected tooDarkError(): ErrorResponse {
        return {
            success: false,
            message: "It's too dark to see anything.",
            incrementTurn: false
        };
    }

    protected objectNotFoundError(objectName: string): ErrorResponse {
        return { 
            success: false, 
            message: `You don't see any ${objectName} here.`,
            incrementTurn: false 
        };
    }

    protected objectNotVisibleError(objectName: string): ErrorResponse {
        return {
            success: false,
            message: `You can't see the ${objectName} clearly in the dark.`,
            incrementTurn: false
        };
    }

    protected cannotInteractError(action: string, objectName: string): ErrorResponse {
        return {
            success: false,
            message: `You can't ${action} the ${objectName}.`,
            incrementTurn: false
        };
    }
}

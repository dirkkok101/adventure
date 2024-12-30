import { Injectable } from '@angular/core';
import { GameCommand, SceneObject, CommandResponse } from '../../../models/game-state.model';
import { BaseCommandService } from './base-command.service';
import { GameStateService } from '../../game-state.service';
import { SceneService } from '../../scene.service';
import { StateMechanicsService } from '../../mechanics/state-mechanics.service';
import { FlagMechanicsService } from '../../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../../mechanics/progress-mechanics.service';
import { LightMechanicsService } from '../../mechanics/light-mechanics.service';
import { InventoryMechanicsService } from '../../mechanics/inventory-mechanics.service';
import { ContainerMechanicsService } from '../../mechanics/container-mechanics.service';
import { ScoreMechanicsService } from '../../mechanics/score-mechanics.service';
import { ErrorResponse, SuccessResponse } from './command-types';

@Injectable()
export abstract class ExaminationBaseCommandService extends BaseCommandService {
    constructor(
        gameState: GameStateService,
        sceneService: SceneService,
        stateMechanics: StateMechanicsService,
        flagMechanics: FlagMechanicsService,
        progress: ProgressMechanicsService,
        lightMechanics: LightMechanicsService,
        inventoryMechanics: InventoryMechanicsService,
        private containerMechanics: ContainerMechanicsService,
        scoreMechanics: ScoreMechanicsService
    ) {
        super(
            gameState,
            sceneService,
            stateMechanics,
            flagMechanics,
            progress,
            lightMechanics,
            inventoryMechanics,
            scoreMechanics
        );
    }

    protected async getObjectDescription(object: SceneObject, detailed: boolean = false): Promise<string> {
        // Get base description
        let description = await this.stateMechanics.getStateBasedDescription(
            { states: object.descriptions.states }, 
            detailed ? object.descriptions.examine || object.descriptions.default : object.descriptions.default
        );

        // Add container contents if applicable
        if (object.isContainer) {
            const containerContents = await this.getContainerContents(object);
            description += containerContents;
        }

        // Handle first-time examination scoring
        await this.handleExaminationScoring(object, detailed);

        return description;
    }

    protected async getContainerContents(container: SceneObject): Promise<string> {
        if (!this.containerMechanics.isOpen(container.id)) {
            return '\nIt is closed.';
        }

        const contents = await this.containerMechanics.getContainerContents(container.id);
        if (contents.length === 0) {
            return container.descriptions.empty 
                ? `\n${container.descriptions.empty}` 
                : '\nIt is empty.';
        }

        const contentsList = await Promise.all(
            contents.map(async id => {
                const item = await this.findObject(id);
                return item ? item.name : '';
            })
        );

        const validContents = contentsList.filter(Boolean);
        if (validContents.length === 0) {
            return '\nIt is empty.';
        }

        return container.descriptions.contents 
            ? `\n${container.descriptions.contents}\n${validContents.join(', ')}` 
            : `\nIt contains: ${validContents.join(', ')}`;
    }

    protected async handleExaminationScoring(object: SceneObject, detailed: boolean): Promise<void> {
        await this.handleScoring({
            action: detailed ? 'examine' : 'look',
            object,
            skipGeneralScore: !detailed // Only award general score for detailed examination
        });
    }

    protected async getExaminableSuggestions(): Promise<string[]> {
        const scene = await this.sceneService.getCurrentScene();
        if (!scene?.objects || !this.checkLightInScene()) {
            return [];
        }

        // Get all visible objects in the scene
        const sceneObjects = Object.values(scene.objects)
            .filter(obj => this.lightMechanics.isObjectVisible(obj))
            .map(obj => obj.name);

        // Add inventory items
        const inventoryItems = this.inventoryMechanics.listInventory()
            .map(async (id) => {
                const item = await this.sceneService.findObject(id);
                return item ? item.name : '';
            });

        const resolvedItems = await Promise.all(inventoryItems);
        return [...new Set([...sceneObjects, ...resolvedItems])];
    }

    protected async handleLookAround(): Promise<CommandResponse> {
        const scene = await this.sceneService.getCurrentScene();
        if (!scene) {
            return this.noSceneError();
        }

        if (!this.checkLightInScene()) {
            return this.tooDarkError();
        }

        const sceneDescription = await this.sceneService.getSceneDescription(scene);
        return {
            success: true,
            message: sceneDescription,
            incrementTurn: true
        };
    }
}

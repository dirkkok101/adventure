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
import { GameTextService } from '../../game-text.service';
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
        protected containerMechanics: ContainerMechanicsService,
        scoreMechanics: ScoreMechanicsService,
        private gameText: GameTextService
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
        // Try state-based interaction first
        const action = detailed ? 'examine' : 'look';
        const stateResult = await this.stateMechanics.handleInteraction(object, action);
        if (stateResult.success) {
            return stateResult.message;
        }

        // Get base description based on examination type
        let description = detailed && object.descriptions.examine ? 
            object.descriptions.examine : 
            object.descriptions.default;

        // Check for state-based descriptions
        if (object.descriptions.states) {
            const state = this.gameState.getCurrentState();
            for (const [flagCombo, desc] of Object.entries(object.descriptions.states)) {
                const flags = flagCombo.split(',');
                const matches = flags.every(flag => {
                    if (flag.startsWith('!')) {
                        return !state.flags[flag.substring(1)];
                    }
                    return state.flags[flag];
                });

                if (matches) {
                    description = desc;
                    break;
                }
            }
        }

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
            return `\n${this.gameText.get('container.closed')}`;
        }

        const contents = await this.containerMechanics.getContainerContents(container.id);
        if (contents.length === 0) {
            return container.descriptions.empty ? 
                `\n${container.descriptions.empty}` : 
                `\n${this.gameText.get('container.empty')}`;
        }

        const contentsList = await Promise.all(
            contents.map(async id => {
                const item = await this.findObject(id);
                return item ? item.name : '';
            })
        );

        const validContents = contentsList.filter(Boolean);
        if (validContents.length === 0) {
            return `\n${this.gameText.get('container.empty')}`;
        }

        return container.descriptions.contents ? 
            `\n${container.descriptions.contents}\n${validContents.join(', ')}` : 
            `\n${this.gameText.get('container.contents', { items: validContents.join(', ') })}`;
    }

    protected async handleExaminationScoring(object: SceneObject, detailed: boolean): Promise<void> {
        await this.handleScoring({
            action: detailed ? 'examine' : 'look',
            object,
            skipGeneralScore: !detailed // Only award general score for detailed examination
        });
    }

    protected async getExaminableSuggestions(): Promise<string[]> {
        const scene = this.sceneService.getCurrentScene();
        if (!scene?.objects || !this.lightMechanics.isLightPresent()) {
            return [];
        }

        // Get visible scene objects
        const visibleObjects = this.sceneService.getVisibleObjects(scene);

        // Get inventory objects
        const inventoryItems = await Promise.all(
            this.inventoryMechanics.listInventory()
                .map(id => this.findObject(id))
        );

        // Combine and filter objects that can be examined
        return [...visibleObjects, ...inventoryItems.filter((obj): obj is SceneObject => obj !== null)]
            .filter(obj => obj.descriptions?.examine || obj.interactions?.['examine'])
            .map(obj => obj.name.toLowerCase());
    }

    protected async handleExamination(object: SceneObject, detailed: boolean = false): Promise<CommandResponse> {
        // Check light first
        if (!this.lightMechanics.isLightPresent()) {
            return {
                success: false,
                message: this.gameText.get('error.tooDark', { action: detailed ? 'examine' : 'look' }),
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

        const description = await this.getObjectDescription(object, detailed);
        return {
            success: true,
            message: description,
            incrementTurn: true
        };
    }
}

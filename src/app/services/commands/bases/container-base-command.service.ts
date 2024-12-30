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
export abstract class ContainerBaseCommandService extends BaseCommandService {
    constructor(
        gameState: GameStateService,
        sceneService: SceneService,
        stateMechanics: StateMechanicsService,
        flagMechanics: FlagMechanicsService,
        progress: ProgressMechanicsService,
        lightMechanics: LightMechanicsService,
        inventoryMechanics: InventoryMechanicsService,
        scoreMechanics: ScoreMechanicsService,
        protected override containerMechanics: ContainerMechanicsService
    ) {
        super(
            gameState,
            sceneService,
            stateMechanics,
            flagMechanics,
            progress,
            lightMechanics,
            inventoryMechanics,
            scoreMechanics,
            containerMechanics
        );
    }

    protected async checkContainer(container: SceneObject, action: string): Promise<CommandResponse> {
        if (!container.isContainer) {
            return {
                success: false,
                message: `The ${container.name} isn't a container.`,
                incrementTurn: false
            };
        }

        // Check if container is closed for relevant actions
        if (['take', 'put'].includes(action) && !this.containerMechanics.isOpen(container.id)) {
            return {
                success: false,
                message: `The ${container.name} is closed.`,
                incrementTurn: false
            };
        }

        // Check if container is locked for open action
        if (action === 'open' && container.isLocked) {
            return this.handleLockedContainer(container);
        }

        return {
            success: true,
            message: '',
            incrementTurn: false
        };
    }

    protected async handleLockedContainer(container: SceneObject): Promise<CommandResponse> {
        // Check if we have a key that could work
        const keyId = container.contents?.find(id => id.startsWith('key_'));
        if (keyId && await this.inventoryMechanics.hasItem(keyId)) {
            const key = await this.findObject(keyId);
            if (key) {
                // Use the key automatically
                container.isLocked = false;
                return {
                    success: true,
                    message: `You unlock the ${container.name} with the ${key.name}.`,
                    incrementTurn: true
                };
            }
        }

        return {
            success: false,
            message: `The ${container.name} is locked.`,
            incrementTurn: false
        };
    }

    protected async handleContainerInteraction(object: SceneObject, container: SceneObject, action: string): Promise<void> {
        await this.handleScoring({
            action,
            object,
            container
        });
    }

    protected getContainerSuggestions(command: GameCommand): string[] {
        const scene = this.sceneService.getCurrentScene();
        if (!scene?.objects || !this.checkLightInScene()) {
            return [];
        }

        // Get visible containers
        return Object.values(scene.objects)
            .filter(obj => 
                obj.isContainer && 
                this.lightMechanics.isObjectVisible(obj) &&
                (!obj.isLocked || command.verb === 'unlock')
            )
            .map(obj => obj.name);
    }

    override async getSuggestions(command: GameCommand): Promise<string[]> {
        // Only suggest objects if we have a verb
        if (!command.verb) {
            return [];
        }

        const scene = this.sceneService.getCurrentScene();
        if (!scene?.objects) return [];

        const suggestions = new Set<string>();

        // Add visible containers
        for (const obj of Object.values(scene.objects)) {
            if (obj.isContainer && this.lightMechanics.isObjectVisible(obj)) {
                suggestions.add(obj.name.toLowerCase());
            }
        }

        return Array.from(suggestions);
    }
}

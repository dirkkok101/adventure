import { Injectable } from '@angular/core';
import { GameCommand, SceneObject, CommandResponse } from '../../../models/game-state.model';
import { ContainerBaseCommandService } from '../bases/container-base-command.service';
import { GameStateService } from '../../game-state.service';
import { SceneService } from '../../scene.service';
import { FlagMechanicsService } from '../../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../../mechanics/progress-mechanics.service';
import { LightMechanicsService } from '../../mechanics/light-mechanics.service';
import { InventoryMechanicsService } from '../../mechanics/inventory-mechanics.service';
import { ContainerMechanicsService } from '../../mechanics/container-mechanics.service';
import { ScoreMechanicsService } from '../../mechanics/score-mechanics.service';
import { GameTextService } from '../../game-text.service';

@Injectable({
    providedIn: 'root'
})
export class TakeObjectCommandService extends ContainerBaseCommandService {
    constructor(
        gameState: GameStateService,
        sceneService: SceneService,
        flagMechanics: FlagMechanicsService,
        progress: ProgressMechanicsService,
        lightMechanics: LightMechanicsService,
        inventoryMechanics: InventoryMechanicsService,
        scoreMechanics: ScoreMechanicsService,
        protected override containerMechanics: ContainerMechanicsService,
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
        return command.verb === 'take' || command.verb === 'get' || command.verb === 'pick';
    }

    async handle(command: GameCommand): Promise<CommandResponse> {
        if (!command.object) {
            return {
                success: false,
                message: this.gameText.get('error.noObject', { action: command.verb }),
                incrementTurn: false
            };
        }

        const object = await this.findObject(command.object);
        if (!object) {
            return {
                success: false,
                message: this.gameText.get('error.objectNotFound', { item: command.object }),
                incrementTurn: false
            };
        }

        // Check light first
        if (!this.lightMechanics.isLightPresent()) {
            return {
                success: false,
                message: this.gameText.get('error.tooDark', { action: 'take' }),
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

        // Check if object can be taken
        if (!await this.inventoryMechanics.canTakeObject(object)) {
            return {
                success: false,
                message: this.gameText.get('error.cantTake', { item: object.name }),
                incrementTurn: false
            };
        }

        // First check if the object is in a container
        const container = await this.containerMechanics.findContainerWithItem(object.id);
        if (container) {
            // Check if container is open
            if (!await this.containerMechanics.isOpen(container.id)) {
                return {
                    success: false,
                    message: this.gameText.get('error.containerClosed', { container: container.name }),
                    incrementTurn: false
                };
            }

            // Remove from container
            await this.containerMechanics.removeFromContainer(container.id, object.id);
        } else {
            // If not in a container, must be in scene
            const removeResult = await this.sceneService.removeObjectFromScene(object.id);
            if (!removeResult.success) {
                return {
                    success: false,
                    message: this.gameText.get('error.cantTake', { item: object.name }),
                    incrementTurn: false
                };
            }
        }

        // Add to inventory
        const takeResult = await this.inventoryMechanics.takeObject(object);
        if (!takeResult.success) {
            // If adding to inventory fails, we should put the object back where it came from
            if (container) {
                await this.containerMechanics.addToContainer(container.id, object.id);
            } else {
                await this.sceneService.addObjectToScene(object);
            }
            return { ...takeResult, incrementTurn: false };
        }

        // Handle scoring
        const takeScore = object.scoring?.take;
        if (takeScore) {
            await this.scoreMechanics.addScore(takeScore);
            
            // Additional score if taken from a specific container
            if (container && object.scoring?.containerTargets?.[container.id]) {
                await this.scoreMechanics.addScore(object.scoring.containerTargets[container.id]);
            }
        }

        this.progress.incrementTurns();
        return { ...takeResult, incrementTurn: true };
    }

    override async getSuggestions(command: GameCommand): Promise<string[]> {
        if (!command.verb || !['take', 'get', 'pick'].includes(command.verb)) {
            return [];
        }

        const scene = this.sceneService.getCurrentScene();
        if (!scene) return [];

        const result: string[] = [];
        
        // Get takeable objects from current scene
        if (scene.objects) {
            for (const object of Object.values(scene.objects)) {
                const isVisible = await this.checkVisibility(object);
                const canTake = await this.inventoryMechanics.canTakeObject(object);
                
                if (isVisible && canTake) {
                    result.push(`${command.verb} ${object.name.toLowerCase()}`);
                }
            }
        }

        // Get objects from open containers
        const containers = Object.values(scene.objects || {}).filter(obj => obj.isContainer);
        for (const container of containers) {
            if (!this.containerMechanics.isOpen(container.id)) continue;

            const contents = await this.containerMechanics.getContainerContents(container.id);
            for (const itemId of contents) {
                const item = await this.sceneService.findObjectById(itemId);
                if (!item) continue;

                const canTake = await this.inventoryMechanics.canTakeObject(item);
                if (canTake) {
                    result.push(`${command.verb} ${item.name.toLowerCase()}`);
                }
            }
        }

        return result;
    }
}

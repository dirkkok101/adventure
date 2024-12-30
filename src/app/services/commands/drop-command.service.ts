import { Injectable } from '@angular/core';
import { GameCommand, SceneObject, CommandResponse } from '../../models/game-state.model';
import { BaseObjectCommandService } from './base-object-command.service';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { LightMechanicsService } from '../mechanics/light-mechanics.service';
import { InventoryMechanicsService } from '../mechanics/inventory-mechanics.service';
import { StateMechanicsService } from '../mechanics/state-mechanics.service';
import { ContainerMechanicsService } from '../mechanics/container-mechanics.service';
import { FlagMechanicsService } from '../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../mechanics/progress-mechanics.service';
import { ScoreMechanicsService } from '../mechanics/score-mechanics.service';

@Injectable({
    providedIn: 'root'
})
export class DropCommandService extends BaseObjectCommandService {
    constructor(
        gameState: GameStateService,
        sceneService: SceneService,
        stateMechanics: StateMechanicsService,
        flagMechanics: FlagMechanicsService,
        progress: ProgressMechanicsService,
        lightMechanics: LightMechanicsService,
        inventoryMechanics: InventoryMechanicsService,
        private containerMechanics: ContainerMechanicsService,
        private scoreMechanics: ScoreMechanicsService
    ) {
        super(
            gameState, 
            sceneService, 
            stateMechanics, 
            flagMechanics, 
            progress,
            lightMechanics,
            inventoryMechanics
        );
    }

    canHandle(command: GameCommand): boolean {
        return command.verb === 'drop' || command.verb === 'put';
    }

    async handle(command: GameCommand): Promise<CommandResponse> {
        if (!command.object) {
            return this.noObjectError(command.verb);
        }

        const object = await this.findObject(command.object);
        if (!object) {
            return this.objectNotFoundError(command.object);
        }

        return this.handleInteraction(object, command);
    }

    protected async handleInteraction(object: SceneObject, command: GameCommand): Promise<CommandResponse> {
        // Check if we have the object
        if (!await this.inventoryMechanics.hasItem(object.id)) {
            return {
                success: false,
                message: `You don't have the ${object.name}.`,
                incrementTurn: false
            };
        }

        // If we're putting it in a container
        if (command.preposition === 'in' && command.indirect) {
            const container = await this.findObject(command.indirect);
            if (!container) {
                return {
                    success: false,
                    message: `You don't see the ${command.indirect} here.`,
                    incrementTurn: false
                };
            }

            if (!container.isContainer) {
                return {
                    success: false,
                    message: `The ${container.name} isn't a container.`,
                    incrementTurn: false
                };
            }

            if (!this.containerMechanics.isOpen(container.id)) {
                return {
                    success: false,
                    message: `The ${container.name} is closed.`,
                    incrementTurn: false
                };
            }

            // Try to put the object in the container
            const result = await this.containerMechanics.addToContainer(object.id, container.id);
            if (result.success) {
                await this.inventoryMechanics.dropObject(object);
                
                // Check for container-specific score
                const containerScore = object.scoring?.containerTargets?.[container.id];
                if (containerScore && !this.flagMechanics.hasFlag(`dropped_${object.id}_in_${container.id}`)) {
                    this.scoreMechanics.addScore(containerScore);
                    this.flagMechanics.setFlag(`dropped_${object.id}_in_${container.id}`);
                }
                // Check for general drop score
                else if (object.scoring?.drop && !this.flagMechanics.hasFlag(`dropped_${object.id}`)) {
                    this.scoreMechanics.addScore(object.scoring.drop);
                    this.flagMechanics.setFlag(`dropped_${object.id}`);
                }

                return {
                    success: true,
                    message: `You put the ${object.name} in the ${container.name}.`,
                    incrementTurn: true
                };
            } else {
                return {
                    ...result,
                    incrementTurn: false
                };
            }
        }

        // Try state-based interaction first
        const stateResult = await this.stateMechanics.handleInteraction(object, 'drop');
        if (stateResult.success) {
            // Check for drop score
            if (object.scoring?.drop && !this.flagMechanics.hasFlag(`dropped_${object.id}`)) {
                this.scoreMechanics.addScore(object.scoring.drop);
                this.flagMechanics.setFlag(`dropped_${object.id}`);
            }
            
            return { ...stateResult, incrementTurn: true };
        }

        // Regular drop
        const result = await this.inventoryMechanics.dropObject(object);
        if (result.success && object.scoring?.drop && !this.flagMechanics.hasFlag(`dropped_${object.id}`)) {
            this.scoreMechanics.addScore(object.scoring.drop);
            this.flagMechanics.setFlag(`dropped_${object.id}`);
        }

        return {
            ...result,
            incrementTurn: true
        };
    }

    async getSuggestions(command: GameCommand): Promise<string[]> {
        const suggestions: string[] = [];
        if (!command.object) {
            // Suggest items from inventory
            const inventoryItems = this.inventoryMechanics.listInventory();
            for (const itemId of inventoryItems) {
                const item = await this.sceneService.findObject(itemId);
                if (item) {
                    suggestions.push(item.name);
                }
            }
        } else if (command.preposition === 'in' && !command.indirect) {
            // Suggest containers in the scene
            const scene = this.sceneService.getCurrentScene();
            if (scene?.objects) {
                Object.values(scene.objects)
                    .filter(obj => obj.isContainer && this.lightMechanics.isObjectVisible(obj))
                    .forEach(obj => suggestions.push(obj.name));
            }
        }
        return suggestions;
    }
}

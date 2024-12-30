import { Injectable } from '@angular/core';
import { GameCommand, SceneObject, CommandResponse } from '../../models/game-state.model';
import { SceneService } from '../scene.service';
import { GameStateService } from '../game-state.service';
import { StateMechanicsService } from '../mechanics/state-mechanics.service';
import { BaseObjectCommandService } from './base-object-command.service';
import { FlagMechanicsService } from '../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../mechanics/progress-mechanics.service';
import { InventoryMechanicsService } from '../mechanics/inventory-mechanics.service';
import { LightMechanicsService } from '../mechanics/light-mechanics.service';
import { ScoreMechanicsService } from '../mechanics/score-mechanics.service';

@Injectable({
    providedIn: 'root'
})
export class InteractionCommandService extends BaseObjectCommandService {
    constructor(
        gameState: GameStateService,
        sceneService: SceneService,
        stateMechanics: StateMechanicsService,
        flagMechanics: FlagMechanicsService,
        progress: ProgressMechanicsService,
        lightMechanics: LightMechanicsService,
        inventoryMechanics: InventoryMechanicsService,
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
        // Only handle general interaction verbs
        // Specialized verbs should be handled by their respective services
        return command.verb === 'use' || 
               command.verb === 'push' ||
               command.verb === 'pull';
    }

    async handle(command: GameCommand): Promise<CommandResponse> {
        if (!command.object) {
            return this.noObjectError(command.verb);
        }

        // Check if we can see
        if (!this.lightMechanics.isLightPresent()) {
            return this.tooDarkError();
        }

        const object = await this.findObject(command.object);
        if (!object) {
            return this.objectNotFoundError(command.object);
        }

        // Check object visibility
        if (!await this.checkVisibility(object)) {
            return {
                success: false,
                message: `You don't see any ${command.object} here.`,
                incrementTurn: false
            };
        }

        // If it's a two-object interaction (e.g., "use key with door")
        if ((command.preposition === 'with' || command.preposition === 'on') && command.indirect) {
            const target = await this.findObject(command.indirect);
            if (!target) {
                return this.objectNotFoundError(command.indirect);
            }
            return this.handleTwoObjectInteraction(object, target, command);
        }

        return this.handleSingleObjectInteraction(object, command);
    }

    private async handleSingleObjectInteraction(object: SceneObject, command: GameCommand): Promise<CommandResponse> {
        // Check if object is usable for this verb
        if (!object.usable && command.verb === 'use') {
            return this.cannotInteractError(command.verb, object.name);
        }

        // Check if object has the specific interaction
        const interaction = object.interactions?.[command.verb];
        if (!interaction) {
            return {
                success: false,
                message: `You can't ${command.verb} the ${object.name}.`,
                incrementTurn: false
            };
        }

        // Check required flags
        if (interaction.requiredFlags && 
            !this.flagMechanics.checkFlags(interaction.requiredFlags)) {
            return {
                success: false,
                message: interaction.failureMessage || `You can't ${command.verb} the ${object.name} right now.`,
                incrementTurn: false
            };
        }

        // Try state-based interaction first
        const stateResult = await this.stateMechanics.handleInteraction(object, command.verb);
        if (stateResult.success) {
            // Handle scoring if applicable
            if (command.verb === 'use' && 
                object.scoring?.['use'] && 
                !this.flagMechanics.hasFlag(`used_${object.id}`)) {
                this.scoreMechanics.addScore(object.scoring['use']);
                this.flagMechanics.setFlag(`used_${object.id}`);
            }

            // Handle flags
            if (interaction.grantsFlags) {
                interaction.grantsFlags.forEach(flag => this.flagMechanics.setFlag(flag));
            }
            if (interaction.removesFlags) {
                interaction.removesFlags.forEach(flag => this.flagMechanics.removeFlag(flag));
            }

            this.progress.incrementTurns();
            return { ...stateResult, incrementTurn: true };
        }

        return {
            success: false,
            message: interaction.failureMessage || `You can't ${command.verb} the ${object.name} right now.`,
            incrementTurn: false
        };
    }

    private async handleTwoObjectInteraction(object: SceneObject, target: SceneObject, command: GameCommand): Promise<CommandResponse> {
        // Check if we have the first object if it's not in the scene
        if (!await this.checkVisibility(object) && !await this.inventoryMechanics.hasItem(object.id)) {
            return {
                success: false,
                message: `You don't have the ${object.name}.`,
                incrementTurn: false
            };
        }

        // Check target visibility
        if (!await this.checkVisibility(target)) {
            return {
                success: false,
                message: `You don't see any ${command.indirect} here.`,
                incrementTurn: false
            };
        }

        // Try interaction with target using object
        const interactionVerb = `${command.verb}_with_${object.id}`;
        const interaction = target.interactions?.[interactionVerb];

        if (!interaction) {
            return {
                success: false,
                message: `You can't ${command.verb} the ${target.name} with the ${object.name}.`,
                incrementTurn: false
            };
        }

        // Check required flags
        if (interaction.requiredFlags && 
            !this.flagMechanics.checkFlags(interaction.requiredFlags)) {
            return {
                success: false,
                message: interaction.failureMessage || `You can't ${command.verb} the ${target.name} with the ${object.name} right now.`,
                incrementTurn: false
            };
        }

        // Try state-based interaction
        const stateResult = await this.stateMechanics.handleInteraction(target, interactionVerb);
        if (stateResult.success) {
            // Handle scoring if applicable
            if (object.scoring?.containerTargets?.[target.id] && 
                !this.flagMechanics.hasFlag(`used_${object.id}_with_${target.id}`)) {
                this.scoreMechanics.addScore(object.scoring.containerTargets[target.id]);
                this.flagMechanics.setFlag(`used_${object.id}_with_${target.id}`);
            }

            // Handle flags
            if (interaction.grantsFlags) {
                interaction.grantsFlags.forEach(flag => this.flagMechanics.setFlag(flag));
            }
            if (interaction.removesFlags) {
                interaction.removesFlags.forEach(flag => this.flagMechanics.removeFlag(flag));
            }

            this.progress.incrementTurns();
            return { ...stateResult, incrementTurn: true };
        }

        return {
            success: false,
            message: interaction.failureMessage || `That doesn't work.`,
            incrementTurn: false
        };
    }

    async getSuggestions(command: GameCommand): Promise<string[]> {
        const scene = this.sceneService.getCurrentScene();
        const suggestions: string[] = [];

        if (!command.verb) {
            // Only suggest verbs this service actually handles
            return ['use', 'push', 'pull'];
        }

        if (!command.object && scene?.objects) {
            // Get visible scene objects that can be interacted with
            const sceneObjects = Object.values(scene.objects)
                .filter(obj => 
                    this.lightMechanics.isObjectVisible(obj) && 
                    (obj.usable || obj.interactions?.[command.verb]));
            
            suggestions.push(...sceneObjects.map(obj => obj.name));

            // Add usable inventory items
            const inventoryItems = await Promise.all(
                this.inventoryMechanics.listInventory()
                    .map(async id => {
                        const item = await this.sceneService.findObject(id);
                        if (item && (item.usable || item.interactions?.[command.verb])) {
                            return item.name;
                        }
                        return null;
                    })
            );
            suggestions.push(...inventoryItems.filter((name): name is string => name !== null));
        }

        if (command.preposition === 'with' && !command.indirect && scene?.objects) {
            // Suggest visible potential targets for the interaction
            const targetObjects = Object.values(scene.objects)
                .filter(obj => this.lightMechanics.isObjectVisible(obj))
                .map(obj => obj.name);
            
            suggestions.push(...targetObjects);
        }

        return suggestions;
    }
}

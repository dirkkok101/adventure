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
        // Handle general interaction verbs
        return command.verb === 'use' || 
               command.verb === 'open' || 
               command.verb === 'close' ||
               command.verb === 'turn' ||
               command.verb === 'push' ||
               command.verb === 'pull' ||
               command.verb === 'read' ||
               command.verb === 'examine';
    }

    async handle(command: GameCommand): Promise<CommandResponse> {
        if (!command.object) {
            return this.noObjectError(command.verb);
        }

        // Check if we can see
        if (!this.checkLightInScene()) {
            return this.tooDarkError();
        }

        const object = await this.findObject(command.object);
        if (!object) {
            return this.objectNotFoundError(command.object);
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

        // Try state-based interaction
        const result = await this.handleStateInteraction(object, command.verb);
        
        // Check for use score if successful
        if (result.success && command.verb === 'use' && 
            object.scoring?.use && 
            !this.flagMechanics.hasFlag(`used_${object.id}`)) {
            this.scoreMechanics.addScore(object.scoring.use);
            this.flagMechanics.setFlag(`used_${object.id}`);
        }

        return {
            ...result,
            incrementTurn: result.success
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

        // Try interaction with target using object
        const interactionVerb = `${command.verb}_with_${object.id}`;
        const result = await this.handleStateInteraction(target, interactionVerb);

        // Check for special use score for this combination
        if (result.success && 
            object.scoring?.containerTargets?.[target.id] && 
            !this.flagMechanics.hasFlag(`used_${object.id}_with_${target.id}`)) {
            this.scoreMechanics.addScore(object.scoring.containerTargets[target.id]);
            this.flagMechanics.setFlag(`used_${object.id}_with_${target.id}`);
        }

        return {
            ...result,
            incrementTurn: result.success
        };
    }

    getSuggestions(command: GameCommand): string[] {
        const suggestions: string[] = [];
        const scene = this.sceneService.getCurrentScene();

        if (!command.verb) {
            return ['use', 'open', 'close', 'turn', 'push', 'pull', 'read', 'examine'];
        }

        if (!command.object && scene?.objects) {
            // Suggest visible objects that can be interacted with
            Object.values(scene.objects)
                .filter(obj => this.lightMechanics.isObjectVisible(obj) && 
                             (obj.usable || obj.interactions?.[command.verb]))
                .forEach(obj => suggestions.push(obj.name));

            // Add inventory items
            const inventoryItems = this.inventoryMechanics.listInventory();
            for (const itemId of inventoryItems) {
                const item = this.sceneService.findObject(itemId);
                if (item && (item.usable || item.interactions?.[command.verb])) {
                    suggestions.push(item.name);
                }
            }
        }

        if (command.preposition === 'with' && !command.indirect && scene?.objects) {
            // Suggest potential targets for the interaction
            Object.values(scene.objects)
                .filter(obj => this.lightMechanics.isObjectVisible(obj))
                .forEach(obj => suggestions.push(obj.name));
        }

        return suggestions;
    }
}

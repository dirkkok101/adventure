import { Injectable } from '@angular/core';
import { Command } from '../../models/command.model';
import { CommandHandler } from './command-handler.interface';
import { SceneService } from '../scene.service';
import { GameStateService } from '../game-state.service';
import { UIService } from '../ui.service';
import { processInteraction, checkRequiredFlags } from '../../utils/interaction-utils';
import { scenes } from '../../data/scenes';

@Injectable({
    providedIn: 'root'
})
export class InteractionCommandService implements CommandHandler {
    private readonly interactionVerbs = ['take', 'open', 'close', 'read', 'use'];

    constructor(
        private sceneService: SceneService,
        private gameState: GameStateService,
        private uiService: UIService
    ) {}

    canHandle(command: Command): boolean {
        return this.interactionVerbs.includes(command.verb);
    }

    handle(command: Command): string {
        if (!command.object) {
            return `What do you want to ${command.verb}?`;
        }

        return this.handleObjectInteraction(command.verb, command.object);
    }

    private handleObjectInteraction(verb: string, objectId: string): string {
        console.log('\n=== Object Interaction ===');
        console.log('Verb:', verb);
        console.log('Object:', objectId);

        const state = this.gameState.getCurrentState();
        const scene = this.sceneService.getCurrentScene();

        // First check if the object is in the current scene
        let object = scene?.objects?.[objectId];

        // If not in scene, check if it's in inventory
        if (!object && state.inventory.includes(objectId)) {
            // Get the object definition from any scene (since it's in inventory)
            for (const sceneId in scenes) {
                const sceneObjects = scenes[sceneId].objects;
                if (sceneObjects?.[objectId]) {
                    object = sceneObjects[objectId];
                    break;
                }
            }
        }

        // If we still can't find the object, it doesn't exist
        if (!object) {
            return `I don't see any ${objectId} here.`;
        }

        console.log('\nTarget Object:', {
            id: object.id,
            name: object.name,
            visible: object.visibleOnEntry,
            interactions: object.interactions
        });

        const interaction = object.interactions?.[verb];
        if (!interaction) {
            if (verb === 'take' && object.canTake) {
                // Default take behavior if no specific interaction is defined
                this.gameState.addToInventory(objectId);
                return `You took the ${object.name}.`;
            }
            return `You cannot ${verb} that.`;
        }

        console.log('\nInteraction:', {
            verb,
            requiredFlags: interaction.requiredFlags,
            grantsFlags: interaction.grantsFlags,
            removesFlags: interaction.removesFlags,
            revealsObjects: interaction.revealsObjects
        });
        
        // Check if the interaction is allowed based on flags
        if (interaction.requiredFlags) {
            const canInteract = checkRequiredFlags(state, interaction.requiredFlags);
            if (!canInteract) {
                return interaction.failureMessage || `You cannot ${verb} that.`;
            }
        }

        // Process the interaction and update game state
        const result = processInteraction(interaction, state);
        
        // Handle special cases
        if (verb === 'take') {
            this.gameState.addToInventory(objectId);
        }
        
        // If the interaction reveals objects, mark them as revealed
        if (interaction.revealsObjects) {
            console.log('\nRevealing Objects:', interaction.revealsObjects);
            interaction.revealsObjects.forEach(id => {
                this.sceneService.revealObject(id);
            });
        }

        // Update UI if inventory or visible objects changed
        if (interaction.revealsObjects || verb === 'take') {
            this.uiService.updateSidebar();
        }

        return result;
    }
}

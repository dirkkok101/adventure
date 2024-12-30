import { Injectable } from '@angular/core';
import { CommandHandler } from './command-handler.interface';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { ContainerMechanicsService } from '../mechanics/container-mechanics.service';
import { LightMechanicsService } from '../mechanics/light-mechanics.service';
import { StateMechanicsService } from '../mechanics/state-mechanics.service';

@Injectable({
    providedIn: 'root'
})
export class PutCommandService implements CommandHandler {
    constructor(
        private gameState: GameStateService,
        private sceneService: SceneService,
        private containerMechanics: ContainerMechanicsService,
        private lightMechanics: LightMechanicsService,
        private stateMechanics: StateMechanicsService
    ) {}

    canHandle(command: string): boolean {
        return command.toLowerCase().startsWith('put ');
    }

    handle(command: string): string {
        const words = command.toLowerCase().split(' ');
        const itemName = words.slice(1).join(' ');

        // Check for "in" or "on" preposition
        const inIndex = itemName.indexOf(' in ');
        const onIndex = itemName.indexOf(' on ');
        
        if (inIndex === -1 && onIndex === -1) {
            return 'Put what where?';
        }

        const prepositionIndex = Math.max(inIndex, onIndex);
        const preposition = itemName.includes(' in ') ? 'in' : 'on';
        const objectName = itemName.substring(0, prepositionIndex).trim();
        const containerName = itemName.substring(prepositionIndex + 4).trim();

        const scene = this.sceneService.getCurrentScene();
        if (!scene) {
            return 'Error: No current scene';
        }

        // Check light
        if (!this.lightMechanics.isLightPresent()) {
            return 'It is too dark to see what you are doing.';
        }

        // Find the item and container
        const item = Object.values(scene.objects || {}).find(obj => 
            obj.name.toLowerCase() === objectName
        );

        const container = Object.values(scene.objects || {}).find(obj => 
            obj.name.toLowerCase() === containerName && 
            this.lightMechanics.isObjectVisible(obj)
        );

        if (!item) {
            return `You don't have the ${objectName}.`;
        }

        if (!container) {
            return `You don't see any ${containerName} here.`;
        }

        // Check if item is in inventory
        const state = this.gameState.getCurrentState();
        if (!state.inventory[item.id]) {
            return `You're not holding the ${item.name}.`;
        }

        // Check if container can accept items
        if (!container.isContainer) {
            return `You can't put anything ${preposition} that.`;
        }

        if (!container.isOpen) {
            return `The ${container.name} is closed.`;
        }

        // Try to add to container
        if (!this.containerMechanics.canAddToContainer(container.id, item.id)) {
            return `You can't put anything else ${preposition} the ${container.name}.`;
        }

        // Remove from inventory and add to container
        this.gameState.removeFromInventory(item.id);
        this.containerMechanics.addToContainer(container.id, item.id);

        // Handle state changes
        const stateResult = this.stateMechanics.handleInteraction(container, 'put');
        if (stateResult.success) {
            return stateResult.message;
        }

        return `You put the ${item.name} ${preposition} the ${container.name}.`;
    }
}

import { Injectable } from '@angular/core';
import { CommandHandler } from './command-handler.interface';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { LightMechanicsService } from '../mechanics/light-mechanics.service';
import { InventoryMechanicsService } from '../mechanics/inventory-mechanics.service';
import { StateMechanicsService } from '../mechanics/state-mechanics.service';

@Injectable({
    providedIn: 'root'
})
export class DropCommandService implements CommandHandler {
    constructor(
        private gameState: GameStateService,
        private sceneService: SceneService,
        private lightMechanics: LightMechanicsService,
        private inventoryMechanics: InventoryMechanicsService,
        private stateMechanics: StateMechanicsService
    ) {}

    canHandle(command: string): boolean {
        return command.toLowerCase().startsWith('drop ');
    }

    handle(command: string): string {
        const words = command.toLowerCase().split(' ');
        const objectName = words.slice(1).join(' ');

        if (!objectName) {
            return 'What do you want to drop?';
        }

        const scene = this.sceneService.getCurrentScene();
        if (!scene) {
            return 'Error: No current scene';
        }

        // Find object in inventory
        const object = Object.values(scene.objects || {}).find(obj => 
            obj.name.toLowerCase() === objectName &&
            this.inventoryMechanics.hasItem(obj.id)
        );

        if (!object) {
            return 'You are not carrying that.';
        }

        // Try to drop the object
        const result = this.inventoryMechanics.dropObject(object);
        
        // Handle any state changes from dropping the object
        if (result.success) {
            const stateResult = this.stateMechanics.handleInteraction(object, 'drop');
            if (stateResult.success) {
                return stateResult.message;
            }
        }

        return result.message;
    }
}

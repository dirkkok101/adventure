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
export class TakeCommandService implements CommandHandler {
    constructor(
        private gameState: GameStateService,
        private sceneService: SceneService,
        private lightMechanics: LightMechanicsService,
        private inventoryMechanics: InventoryMechanicsService,
        private stateMechanics: StateMechanicsService
    ) {}

    canHandle(command: string): boolean {
        return command.toLowerCase().startsWith('take ') || 
               command.toLowerCase().startsWith('get ') ||
               command.toLowerCase().startsWith('pick up ');
    }

    handle(command: string): string {
        const words = command.toLowerCase().split(' ');
        const verb = words[0];
        let objectName = words.slice(1).join(' ');

        if (verb === 'pick') {
            objectName = words.slice(2).join(' '); // Skip 'pick up'
        }

        if (!objectName) {
            return 'What do you want to take?';
        }

        const scene = this.sceneService.getCurrentScene();
        if (!scene) {
            return 'Error: No current scene';
        }

        // Check light
        if (!this.lightMechanics.isLightPresent()) {
            return 'It is too dark to see what you are trying to take.';
        }

        // Find object in scene
        const object = Object.values(scene.objects || {}).find(obj => 
            obj.name.toLowerCase() === objectName && 
            this.lightMechanics.isObjectVisible(obj)
        );

        if (!object) {
            return 'You don\'t see that here.';
        }

        // Try to take the object
        const result = this.inventoryMechanics.takeObject(object);
        
        // Handle any state changes from taking the object
        if (result.success) {
            const stateResult = this.stateMechanics.handleInteraction(object, 'take');
            if (stateResult.success) {
                return stateResult.message;
            }
        }

        return result.message;
    }
}

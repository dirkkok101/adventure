import { Injectable } from '@angular/core';
import { CommandHandler } from './command-handler.interface';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { LightMechanicsService } from '../mechanics/light-mechanics.service';
import { StateMechanicsService } from '../mechanics/state-mechanics.service';

@Injectable({
    providedIn: 'root'
})
export class ReadCommandService implements CommandHandler {
    constructor(
        private gameState: GameStateService,
        private sceneService: SceneService,
        private lightMechanics: LightMechanicsService,
        private stateMechanics: StateMechanicsService
    ) {}

    canHandle(command: string): boolean {
        return command.toLowerCase().startsWith('read ');
    }

    handle(command: string): string {
        const words = command.toLowerCase().split(' ');
        const objectName = words.slice(1).join(' ');

        if (!objectName) {
            return 'What do you want to read?';
        }

        const scene = this.sceneService.getCurrentScene();
        if (!scene) {
            return 'Error: No current scene';
        }

        // Check light
        if (!this.lightMechanics.isLightPresent()) {
            return 'It is too dark to read anything.';
        }

        // Find object in scene or inventory
        const state = this.gameState.getCurrentState();
        const object = Object.values(scene.objects || {}).find(obj => 
            obj.name.toLowerCase() === objectName && 
            (this.lightMechanics.isObjectVisible(obj) || state.inventory[obj.id])
        );

        if (!object) {
            return `You don't see any ${objectName} here.`;
        }

        // Handle readable objects
        const stateResult = this.stateMechanics.handleInteraction(object, 'read');
        if (stateResult.success) {
            return stateResult.message;
        }

        return `There's nothing to read on the ${object.name}.`;
    }
}

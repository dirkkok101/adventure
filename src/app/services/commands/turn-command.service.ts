import { Injectable } from '@angular/core';
import { CommandHandler } from './command-handler.interface';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { LightMechanicsService } from '../mechanics/light-mechanics.service';
import { StateMechanicsService } from '../mechanics/state-mechanics.service';

@Injectable({
    providedIn: 'root'
})
export class TurnCommandService implements CommandHandler {
    constructor(
        private gameState: GameStateService,
        private sceneService: SceneService,
        private lightMechanics: LightMechanicsService,
        private stateMechanics: StateMechanicsService
    ) {}

    canHandle(command: string): boolean {
        return command.toLowerCase().startsWith('turn ');
    }

    handle(command: string): string {
        const words = command.toLowerCase().split(' ');
        if (words.length < 3) {
            return 'Turn what on or off?';
        }

        const action = words[words.length - 1];
        const objectName = words.slice(1, -1).join(' ');

        if (!['on', 'off'].includes(action)) {
            return `You can only turn things on or off.`;
        }

        const scene = this.sceneService.getCurrentScene();
        if (!scene) {
            return 'Error: No current scene';
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

        // Handle light sources
        if (object.providesLight) {
            const result = this.lightMechanics.handleLightSource(object.id, action === 'on');
            if (result.success) {
                const stateResult = this.stateMechanics.handleInteraction(object, `turn_${action}`);
                if (stateResult.success) {
                    return stateResult.message;
                }
                return result.message;
            }
            return result.message;
        }

        // Handle other devices
        const stateResult = this.stateMechanics.handleInteraction(object, `turn_${action}`);
        if (stateResult.success) {
            return stateResult.message;
        }

        return `You can't turn that ${action}.`;
    }
}

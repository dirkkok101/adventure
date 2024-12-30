import { Injectable } from '@angular/core';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { SceneObject } from '../../models/game-state.model';

@Injectable({
    providedIn: 'root'
})
export class LightMechanicsService {
    constructor(
        private gameState: GameStateService,
        private sceneService: SceneService
    ) {}

    isLightPresent(): boolean {
        const state = this.gameState.getCurrentState();
        const scene = this.sceneService.getCurrentScene();

        // Check scene natural light
        if (scene?.light) {
            return true;
        }

        // Check for light sources in inventory
        return Object.entries(scene?.objects || {}).some(([id, obj]) => 
            obj.providesLight && 
            state.inventory[id] && 
            state.flags['lanternOn'] &&
            !state.flags['lanternDead']
        );
    }

    isObjectVisible(object: SceneObject): boolean {
        const state = this.gameState.getCurrentState();

        // Always visible if in inventory
        if (state.inventory[object.id]) {
            return true;
        }

        // Check if naturally visible
        if (object.visibleOnEntry) {
            return true;
        }

        // Check if revealed by other actions
        return Object.entries(state.flags)
            .some(([flag, isSet]) => 
                isSet && 
                (flag === `revealed_${object.id}` || object.descriptions.states?.[flag])
            );
    }

    handleLightSource(sourceId: string, turnOn: boolean): { success: boolean; message: string } {
        const state = this.gameState.getCurrentState();
        const scene = this.sceneService.getCurrentScene();
        const source = scene?.objects?.[sourceId];

        if (!source?.providesLight) {
            return { success: false, message: 'That is not a light source.' };
        }

        if (turnOn) {
            if (state.flags['lanternDead']) {
                return { success: false, message: 'The lantern is dead.' };
            }
            this.gameState.setFlag('lanternOn');
            this.gameState.setFlag('hasLight');
            return { success: true, message: 'The lantern is now on.' };
        } else {
            this.gameState.removeFlag('lanternOn');
            this.gameState.removeFlag('hasLight');
            return { success: true, message: 'The lantern is now off.' };
        }
    }
}

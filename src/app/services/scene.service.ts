import { Injectable } from '@angular/core';
import { GameStateService } from './game-state.service';
import { Scene, SceneObject } from '../models/game-state.model';
import { FlagMechanicsService } from './mechanics/flag-mechanics.service';
import { StateMechanicsService } from './mechanics/state-mechanics.service';

@Injectable({
    providedIn: 'root'
})
export class SceneService {
    private scenes: { [key: string]: Scene } = {};

    constructor(
        private gameState: GameStateService,
        private flagMechanics: FlagMechanicsService,
        private stateMechanics: StateMechanicsService
    ) {}

    loadScenes(scenes: { [key: string]: Scene }) {
        this.scenes = scenes;
    }

    getStartScene(): Scene | null {
        return this.scenes['start'] || null;
    }

    getScene(id: string): Scene | null {
        return this.scenes[id] || null;
    }

    getCurrentScene(): Scene | null {
        const state = this.gameState.getCurrentState();
        return this.getScene(state.currentScene);
    }

    getSceneDescription(scene: Scene): string {
        const state = this.gameState.getCurrentState();

        // Check for darkness
        if (!state.light && !scene.light) {
            return scene.descriptions.dark || "It is pitch dark. You are likely to be eaten by a grue.";
        }

        // Get base description
        let description = this.stateMechanics.getStateBasedDescription(
            scene,
            scene.descriptions.default
        );

        // Add visible objects descriptions
        const visibleObjects = this.getVisibleObjects(scene);
        if (visibleObjects.length > 0) {
            description += '\n\n' + visibleObjects.map(obj => 
                this.stateMechanics.getStateBasedDescription(obj, obj.descriptions.default)
            ).join('\n');
        }

        // Add exit descriptions
        const exitDescriptions = this.getVisibleExits(scene);
        if (exitDescriptions) {
            description += '\n\n' + exitDescriptions;
        }

        return description;
    }

    private getVisibleObjects(scene: Scene): SceneObject[] {
        if (!scene.objects) return [];

        return Object.values(scene.objects).filter(obj => {
            // Check if object should be visible
            if (!obj.visibleOnEntry && !this.flagMechanics.hasFlag(`revealed_${obj.id}`)) {
                return false;
            }

            // Check if object is in inventory
            if (this.gameState.getCurrentState().inventory[obj.id]) {
                return false;
            }

            return true;
        });
    }

    private getVisibleExits(scene: Scene): string {
        if (!scene.exits || scene.exits.length === 0) return '';

        const visibleExits = scene.exits
            .filter(exit => !exit.requiredFlags || this.flagMechanics.checkFlags(exit.requiredFlags))
            .map(exit => this.stateMechanics.getStateBasedDescription(exit, exit.description))
            .filter(desc => desc);

        return visibleExits.join('\n');
    }
}

import { Injectable } from '@angular/core';
import { Scene, SceneObject } from '../models/game-state.model';
import { GameStateService } from './game-state.service';
import { scenes } from '../data/scenes';

@Injectable({
    providedIn: 'root'
})
export class SceneService {
    constructor(private gameState: GameStateService) {}

    getCurrentScene(): Scene | null {
        const state = this.gameState.getCurrentState();
        return scenes[state.currentScene] || null;
    }

    getAllScenes(): Scene[] {
        return Object.values(scenes);
    }

    getSceneById(id: string): Scene | null {
        return scenes[id] || null;
    }

    moveToScene(direction: string): string {
        const currentScene = this.getCurrentScene();
        if (!currentScene) {
            return "Error: No current scene";
        }

        const exit = currentScene.exits?.find(e => e.direction.toLowerCase() === direction.toLowerCase());
        if (!exit) {
            return "You can't go that way.";
        }

        // Check if the exit has required flags
        if (exit.requiredFlags) {
            const state = this.gameState.getCurrentState();
            const hasRequiredFlags = exit.requiredFlags.every(flag => state.flags[flag]);
            if (!hasRequiredFlags) {
                return exit.failureMessage || "You can't go that way right now.";
            }
        }

        const targetScene = this.getSceneById(exit.targetScene);
        if (!targetScene) {
            return "Error: Invalid target scene";
        }

        // Update game state with new scene
        this.gameState.setCurrentScene(exit.targetScene);

        // Return the description of the new scene
        return this.getSceneDescription(targetScene);
    }

    getSceneDescription(scene: Scene): string {
        const state = this.gameState.getCurrentState();

        // Check for state-specific descriptions
        if (scene.descriptions.states) {
            for (const [flagCombo, description] of Object.entries(scene.descriptions.states)) {
                const flags = flagCombo.split(',');
                if (flags.every(flag => {
                    if (flag.startsWith('!')) {
                        return !state.flags[flag.substring(1)];
                    }
                    return !!state.flags[flag];
                })) {
                    return this.addVisibleObjects(scene, description);
                }
            }
        }

        // Return default description if no state-specific description matches
        return this.addVisibleObjects(scene, scene.descriptions.default);
    }

    getVisibleObjects(scene: Scene): string[] {
        const state = this.gameState.getCurrentState();
        if (!scene.objects) return [];

        return Object.values(scene.objects)
            .filter(obj => {
                const isVisibleByDefault = obj.visibleOnEntry ?? false;
                const isRevealed = !!state.flags[`revealed_${obj.id}`];
                return isVisibleByDefault || isRevealed;
            })
            .map(obj => obj.name);
    }

    getAvailableExits(scene: Scene): string[] {
        if (!scene.exits) return [];

        const state = this.gameState.getCurrentState();
        return scene.exits
            .filter(exit => {
                if (!exit.requiredFlags) return true;
                return exit.requiredFlags.every(flag => state.flags[flag]);
            })
            .map(exit => exit.direction);
    }

    private addVisibleObjects(scene: Scene, baseDescription: string): string {
        const visibleObjects = this.getVisibleObjects(scene);
        if (visibleObjects.length === 0) {
            return baseDescription;
        }

        return `${baseDescription}\n\nYou can see:\n${visibleObjects.map(obj => `- ${obj}`).join('\n')}`;
    }
}

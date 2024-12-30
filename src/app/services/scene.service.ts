import { Injectable } from '@angular/core';
import { GameStateService } from './game-state.service';
import { Scene, SceneObject, SceneExit, GameState } from '../models/game-state.model';
import { FlagMechanicsService } from './mechanics/flag-mechanics.service';
import { StateMechanicsService } from './mechanics/state-mechanics.service';
import { GameTextService } from './game-text.service';
import { Observable, map } from 'rxjs';

interface SidebarInfo {
    location: string;
    score: number;
    turns: number;
    maxScore: number;
}

@Injectable({
    providedIn: 'root'
})
export class SceneService {
    private scenes: { [key: string]: Scene } = {};

    constructor(
        private gameState: GameStateService,
        private flagMechanics: FlagMechanicsService,
        private stateMechanics: StateMechanicsService,
        private gameText: GameTextService
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
        let description = scene.descriptions.states?.[scene.descriptions.default] || scene.descriptions.default;

        // Add visible objects descriptions
        const visibleObjects = this.getVisibleObjects(scene);
        if (visibleObjects.length > 0) {
            description += '\n\n' + visibleObjects.map(obj => 
                obj.descriptions.states?.[obj.descriptions.default] || obj.descriptions.default
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
            .map(exit => exit.description)
            .filter(desc => desc);

        return visibleExits.join('\n');
    }

    getScenes(): { [key: string]: Scene } {
        return this.scenes;
    }

    getSidebarInfo(): Observable<SidebarInfo> {
        return this.gameState.state$.pipe(
            map((state: GameState) => {
                const currentScene = this.getScene(state.currentScene);
                return {
                    location: currentScene?.name || 'Unknown',
                    score: state.score,
                    turns: state.turns,
                    maxScore: state.maxScore
                };
            })
        );
    }

    initializeGame() {
        const startScene = this.getStartScene();
        if (!startScene) {
            throw new Error('No start scene found');
        }

        this.gameState.initializeState(startScene.id);
        this.gameText.clearGameText();
        this.gameText.addText(this.getSceneDescription(startScene));
    }

    getAllScenes(): Scene[] {
        return Object.values(this.scenes);
    }

    findObject(objectId: string): SceneObject | null {
        const currentScene = this.getCurrentScene();
        return currentScene?.objects?.[objectId] || null;
    }
}

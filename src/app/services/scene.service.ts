import { Injectable } from '@angular/core';
import { GameStateService } from './game-state.service';
import { Scene, SceneObject, SceneExit, GameState } from '../models/game-state.model';
import { FlagMechanicsService } from './mechanics/flag-mechanics.service';
import { GameTextService } from './game-text.service';
import { Observable, map } from 'rxjs';
import { scenes, startingScene } from '../data/scenes';

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
    private scenes: { [key: string]: Scene } = scenes;

    constructor(
        private gameState: GameStateService,
        private flagMechanics: FlagMechanicsService,
        private gameText: GameTextService
    ) {}

    /**
     * Load scenes into the service
     * @param scenes Scene dictionary to load
     */
    loadScenes(scenes: { [key: string]: Scene }): void {
        this.scenes = scenes;
    }

    /**
     * Get the start scene of the game
     */
    getStartScene(): Scene | null {
        return this.scenes[startingScene] || null;
    }

    /**
     * Get a scene by ID
     * @param id Scene ID to retrieve
     */
    getScene(id: string): Scene | null {
        return this.scenes[id] || null;
    }

    /**
     * Get the current scene based on game state
     */
    getCurrentScene(): Scene | null {
        const state = this.gameState.getCurrentState();
        return this.getScene(state.currentScene);
    }

    /**
     * Get the appropriate description for a scene
     * @param scene Scene to get description for
     */
    getSceneDescription(scene: Scene): string {
        const state = this.gameState.getCurrentState();

        // Check for darkness
        if (!state.light && !scene.light) {
            return scene.descriptions.dark || this.gameText.get('scene.dark');
        }

        // Get description based on state flags
        if (scene.descriptions.states) {
            for (const [flagCombo, desc] of Object.entries(scene.descriptions.states)) {
                const flags = flagCombo.split(',');
                const matches = flags.every(flag => {
                    if (flag.startsWith('!')) {
                        return !state.flags[flag.substring(1)];
                    }
                    return state.flags[flag];
                });

                if (matches) {
                    return desc;
                }
            }
        }

        // Return visited or default description
        return scene.visited && scene.descriptions.visited ? 
            scene.descriptions.visited : 
            scene.descriptions.default;
    }

    /**
     * Get visible objects in a scene
     * @param scene Scene to get objects from
     */
    getVisibleObjects(scene: Scene): SceneObject[] {
        if (!scene.objects) return [];

        const state = this.gameState.getCurrentState();
        return Object.values(scene.objects).filter(obj => {
            // Always show if visible on entry
            if (obj.visibleOnEntry) return true;

            // Check if object has been revealed
            return state.knownObjects.has(obj.id);
        });
    }

    /**
     * Get available exits in a scene
     * @param scene Scene to get exits from
     */
    getAvailableExits(scene: Scene): SceneExit[] {
        if (!scene.exits) return [];

        return scene.exits.filter(exit => {
            if (!exit.requiredFlags) return true;
            return this.flagMechanics.checkFlags(exit.requiredFlags);
        });
    }

    /**
     * Get sidebar information for display
     */
    getSidebarInfo(): Observable<SidebarInfo> {
        return this.gameState.state$.pipe(
            map(state => {
                const scene = this.getScene(state.currentScene);
                return {
                    location: scene?.name || 'Unknown',
                    score: state.score,
                    turns: state.turns,
                    maxScore: state.maxScore
                };
            })
        );
    }

    async findObject(objectName: string): Promise<SceneObject | null> {
        const scene = this.getCurrentScene();
        if (!scene?.objects) return null;

        // First try exact match
        const exactMatch = Object.values(scene.objects).find(obj => 
            obj.name.toLowerCase() === objectName.toLowerCase()
        );
        if (exactMatch) return exactMatch;

        // Then try partial match
        return Object.values(scene.objects).find(obj => 
            obj.name.toLowerCase().includes(objectName.toLowerCase())
        ) || null;
    }
}

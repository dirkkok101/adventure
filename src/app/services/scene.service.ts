import { Injectable } from '@angular/core';
import { Scene, SceneExit } from '../models/game-state.model';
import { scenes } from '../data/scenes';
import { GameStateService } from './game-state.service';
import { checkRequiredFlags } from '../utils/interaction-utils';
import { SceneStateLoggerService } from './logging/scene-state-logger.service';

@Injectable({
    providedIn: 'root'
})
export class SceneService {
    constructor(
        private gameState: GameStateService,
        private logger: SceneStateLoggerService
    ) {}

    getCurrentScene(): Scene | undefined {
        const currentSceneId = this.gameState.getCurrentState().currentScene;
        return scenes[currentSceneId];
    }

    initializeScene(sceneId: string): void {
        this.logger.logSceneInitialization(sceneId);
        this.gameState.updateState({ currentScene: sceneId });
    }

    getSceneDescription(scene: Scene): string {
        const state = this.gameState.getCurrentState();
        this.logger.logSceneDescription(scene, state.flags);

        // Get base description, considering state-based variations
        let description = scene.descriptions.default;
        if (scene.descriptions.states) {
            for (const [flag, stateDesc] of Object.entries(scene.descriptions.states)) {
                if (state.flags.includes(flag)) {
                    description = stateDesc;
                    break;
                }
            }
        }

        // Get visible objects, including both visibleOnEntry and revealed objects
        const visibleObjects = scene.objects ? 
            Object.entries(scene.objects)
                .filter(([id, obj]) => {
                    const isVisibleByDefault = obj.visibleOnEntry ?? false;
                    const isRevealedByFlag = state.flags.some(flag => flag === `revealed_${id}`);
                    const isVisibleByExamineFlags = (obj.interactions?.['examine']?.requiredFlags || []).every(flag => 
                        flag.startsWith('!') ? !state.flags.includes(flag.slice(1)) : 
                        state.flags.includes(flag)
                    );

                    this.logger.logObjectVisibility(id, {
                        isVisibleByDefault,
                        isRevealedByFlag,
                        isVisibleByExamineFlags,
                        flags: state.flags
                    });

                    return isVisibleByDefault || isRevealedByFlag || isVisibleByExamineFlags;
                })
                .map(([_, obj]) => {
                    // Get state-specific description if available
                    if (obj.descriptions.states) {
                        for (const [flag, stateDesc] of Object.entries(obj.descriptions.states)) {
                            if (state.flags.includes(flag)) {
                                return stateDesc;
                            }
                        }
                    }
                    return obj.descriptions.default;
                })
            : [];

        this.logger.logVisibleObjects(visibleObjects);

        if (visibleObjects.length > 0) {
            description += '\n\n' + visibleObjects.join('\n');
        }

        // Add obvious exits
        const exits = this.getAvailableExits(scene);
        if (exits.length > 0) {
            description += '\n\nObvious exits:';
            exits.forEach(exit => {
                description += `\n${exit.direction} - ${exit.description}`;
            });
        }

        return description;
    }

    getAvailableExits(scene: Scene): SceneExit[] {
        if (!scene.exits) return [];
        
        const state = this.gameState.getCurrentState();
        const exits = scene.exits.filter(exit => !exit.requiredFlags || checkRequiredFlags(state, exit.requiredFlags));
        
        this.logger.logAvailableExits(exits);
        return exits;
    }

    canMove(direction: string): { canMove: boolean; message?: string; targetScene?: string } {
        const scene = this.getCurrentScene();
        if (!scene) {
            return { canMove: false, message: 'Error: Invalid scene' };
        }

        const exit = scene.exits?.find(e => e.direction === direction);
        this.logger.logMovementCheck(direction, scene, exit);

        if (!exit) {
            return { canMove: false, message: 'You cannot go that way.' };
        }

        const state = this.gameState.getCurrentState();
        if (exit.requiredFlags && !checkRequiredFlags(state, exit.requiredFlags)) {
            return { canMove: false, message: exit.failureMessage || 'You cannot go that way.' };
        }

        return { canMove: true, targetScene: exit.targetScene };
    }

    getVisibleObjects(scene: Scene): string[] {
        if (!scene.objects) return [];
        const state = this.gameState.getCurrentState();
        
        return Object.entries(scene.objects)
            .filter(([id, obj]) => {
                const isVisibleByDefault = obj.visibleOnEntry ?? false;
                const isRevealedByFlag = state.flags.some(flag => flag === `revealed_${id}`);
                const isVisibleByExamineFlags = (obj.interactions?.['examine']?.requiredFlags || []).every(flag => 
                    flag.startsWith('!') ? !state.flags.includes(flag.slice(1)) : 
                    state.flags.includes(flag)
                );
                return isVisibleByDefault || isRevealedByFlag || isVisibleByExamineFlags;
            })
            .map(([_, obj]) => obj.name);
    }

    revealObject(objectId: string): void {
        const scene = this.getCurrentScene();
        if (!scene?.objects?.[objectId]) {
            return;
        }

        this.logger.logObjectReveal(objectId, scene);

        const revealFlag = `revealed_${objectId}`;
        const state = this.gameState.getCurrentState();
        if (!state.flags.includes(revealFlag)) {
            this.gameState.updateState({
                flags: [...state.flags, revealFlag]
            });
        }
    }
}

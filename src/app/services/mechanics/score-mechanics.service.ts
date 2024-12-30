import { Injectable } from '@angular/core';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { ContainerMechanicsService } from './container-mechanics.service';

@Injectable({
    providedIn: 'root'
})
export class ScoreMechanicsService {
    private readonly TREASURE_SCORE = 10;
    private readonly LANTERN_BATTERY_LIFE = 100;

    constructor(
        private gameState: GameStateService,
        private sceneService: SceneService,
        private containerMechanics: ContainerMechanicsService
    ) {
        // Subscribe to state changes to handle mechanics
        this.gameState.state$.subscribe(state => {
            this.handleTurnEffects(state);
        });
    }

    private handleTurnEffects(state: any): void {
        // Handle lantern battery
        if (state.flags['lanternOn']) {
            if (state.turns >= this.LANTERN_BATTERY_LIFE) {
                this.gameState.setFlag('lanternDead');
                this.gameState.removeFlag('lanternOn');
                this.gameState.removeFlag('hasLight');
            }
        }

        // Handle trophy case scoring
        const trophyCase = this.sceneService.getCurrentScene()?.objects?.['trophyCase'];
        if (trophyCase) {
            const contents = this.containerMechanics.getContainerContents('trophyCase');
            const treasureCount = contents.filter(id => {
                const obj = this.sceneService.getCurrentScene()?.objects?.[id];
                return obj?.isTreasure;
            }).length;

            // Update max score based on available treasures
            const allTreasures = Object.values(this.sceneService.getCurrentScene()?.objects || {})
                .filter(obj => obj.isTreasure).length;
            
            this.gameState.updateState({
                ...state,
                maxScore: allTreasures * this.TREASURE_SCORE
            });

            // Check for game completion
            if (treasureCount === allTreasures) {
                this.gameState.updateState({
                    ...state,
                    gameWon: true
                });
            }
        }
    }

    addScore(points: number): void {
        const state = this.gameState.getCurrentState();
        this.gameState.updateState({
            ...state,
            score: state.score + points
        });
    }

    getScore(): string {
        const state = this.gameState.getCurrentState();
        return `Your score is ${state.score} out of a possible ${state.maxScore}.`;
    }
}

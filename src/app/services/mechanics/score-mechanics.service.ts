import { Injectable } from '@angular/core';
import { GameStateService } from '../game-state.service';
import { Observable, map } from 'rxjs';
import { FlagMechanicsService } from './flag-mechanics.service';

export interface GameScore {
    score: number;
    maxScore: number;
    trophies: string[];
}

export interface ScoringOptions {
    action: string;
    object: any;
    container?: any;
    skipGeneralScore?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class ScoreMechanicsService {
    private readonly TROPHY_SCORE_THRESHOLD = 50;

    constructor(private gameState: GameStateService) {}

    addScore(points: number): void {
        this.gameState.updateState(state => {
            const newScore = state.score + points;
            return {
                ...state,
                score: newScore
            };
        });
        this.checkTrophyAchievement();
    }

    async handleObjectScoring(options: ScoringOptions, flagMechanics: FlagMechanicsService): Promise<void> {
        const { action, object, container, skipGeneralScore = false } = options;

        // Handle container-specific scoring
        if (container && object.scoring?.containerTargets?.[container.id]) {
            const scoreKey = `${action}_${object.id}_in_${container.id}`;
            if (!flagMechanics.hasFlag(scoreKey)) {
                this.addScore(object.scoring.containerTargets[container.id]);
                flagMechanics.setFlag(scoreKey);
            }
        }
        
        // Handle general action scoring if not skipped and no container score was awarded
        if (!skipGeneralScore && object.scoring && 
            (action === 'drop' || action === 'take' || action === 'use') && 
            object.scoring[action] !== undefined) {
            const scoreKey = `${action}_${object.id}`;
            if (!flagMechanics.hasFlag(scoreKey)) {
                this.addScore(object.scoring[action]);
                flagMechanics.setFlag(scoreKey);
            }
        }
    }

    private checkTrophyAchievement(): void {
        const state = this.gameState.getCurrentState();
        if (state.score >= this.TROPHY_SCORE_THRESHOLD && !this.hasTrophy('adventurer')) {
            this.addTrophy('adventurer');
        }
    }

    addTrophy(trophyId: string): void {
        this.gameState.updateState(state => {
            if (state.trophies.includes(trophyId)) {
                return state; // Trophy already earned
            }
            return {
                ...state,
                trophies: [...state.trophies, trophyId]
            };
        });
    }

    hasTrophy(trophyId: string): boolean {
        return this.gameState.getCurrentState().trophies.includes(trophyId);
    }

    getTrophies(): string[] {
        return [...this.gameState.getCurrentState().trophies];
    }

    getScore(): number {
        return this.gameState.getCurrentState().score;
    }

    getMaxScore(): number {
        return this.gameState.getCurrentState().maxScore;
    }

    // Observable for score updates
    getScoreInfo(): Observable<GameScore> {
        return this.gameState.state$.pipe(
            map(state => ({
                score: state.score,
                maxScore: state.maxScore,
                trophies: [...state.trophies]
            }))
        );
    }
}

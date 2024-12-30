import { Injectable } from '@angular/core';
import { GameStateService } from '../game-state.service';
import { Observable, map } from 'rxjs';

export interface GameProgress {
    turns: number;
    moves: number;
    gameOver: boolean;
    gameWon: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class ProgressMechanicsService {
    constructor(private gameState: GameStateService) {}

    incrementMoves(): void {
        this.gameState.updateState(state => ({
            ...state,
            moves: state.moves + 1
        }));
    }

    incrementTurns(): void {
        this.gameState.updateState(state => ({
            ...state,
            turns: state.turns + 1
        }));
    }

    setGameOver(won: boolean = false): void {
        this.gameState.updateState(state => ({
            ...state,
            gameOver: true,
            gameWon: won
        }));
    }

    isGameOver(): boolean {
        return this.gameState.getCurrentState().gameOver;
    }

    isGameWon(): boolean {
        return this.gameState.getCurrentState().gameWon;
    }

    getTurns(): number {
        return this.gameState.getCurrentState().turns;
    }

    getMoves(): number {
        return this.gameState.getCurrentState().moves;
    }

    // Observable for progress updates
    getProgress(): Observable<GameProgress> {
        return this.gameState.state$.pipe(
            map(state => ({
                turns: state.turns,
                moves: state.moves,
                gameOver: state.gameOver,
                gameWon: state.gameWon
            }))
        );
    }
}

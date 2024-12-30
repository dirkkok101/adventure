import { Injectable } from '@angular/core';
import { GameStateService } from '../game-state.service';

@Injectable({
    providedIn: 'root'
})
export class ProgressMechanicsService {
    constructor(private gameState: GameStateService) {}

    addScore(points: number) {
        this.gameState.updateState(state => ({
            ...state,
            score: state.score + points
        }));
    }

    incrementMoves() {
        this.gameState.updateState(state => ({
            ...state,
            moves: state.moves + 1
        }));
    }

    incrementTurns() {
        this.gameState.updateState(state => ({
            ...state,
            turns: state.turns + 1
        }));
    }

    setGameOver(won: boolean = false) {
        this.gameState.updateState(state => ({
            ...state,
            gameOver: true,
            gameWon: won
        }));
    }
}

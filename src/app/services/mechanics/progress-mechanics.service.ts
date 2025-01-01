import { Injectable } from '@angular/core';
import { GameStateService } from '../game-state.service';
import { Observable, map } from 'rxjs';

/**
 * Interface representing the current progress state of the game
 * @interface GameProgress
 */
export interface GameProgress {
    /** Number of game turns elapsed */
    turns: number;
    /** Number of movement actions taken */
    moves: number;
    /** Whether the game has ended */
    gameOver: boolean;
    /** Whether the game was won (only valid if gameOver is true) */
    gameWon: boolean;
}

/**
 * Service responsible for managing game progress and state tracking.
 * Handles all aspects of game progression including:
 * - Turn counting
 * - Movement tracking
 * - Game completion state
 * - Progress monitoring
 * 
 * Key Features:
 * - Separate tracking for turns and moves
 * - Game over state management
 * - Win condition tracking
 * - Observable progress updates
 * 
 * Game State Rules:
 * - Turns increment with any game action
 * - Moves only increment with movement between scenes
 * - Game over state is permanent until new game
 * - Win state can only be true if game is over
 */
@Injectable({
    providedIn: 'root'
})
export class ProgressMechanicsService {
    constructor(private gameState: GameStateService) {}

    /**
     * Increments the movement counter
     * Should be called whenever the player moves between scenes
     * Does not affect the turn counter
     */
    incrementMoves(): void {
        this.gameState.updateState(state => ({
            ...state,
            moves: state.moves + 1
        }));
    }

    /**
     * Increments the turn counter
     * Should be called for any action that advances game time:
     * - Movement
     * - Item interactions
     * - Scene interactions
     * - Combat actions
     */
    incrementTurns(): void {
        this.gameState.updateState(state => ({
            ...state,
            turns: state.turns + 1
        }));
    }

    /**
     * Sets the game to a completed state
     * - Marks the game as over
     * - Optionally marks it as won
     * - This state is permanent until a new game is started
     * 
     * @param won Whether the game was won (default: false)
     */
    setGameOver(won: boolean = false): void {
        this.gameState.updateState(state => ({
            ...state,
            gameOver: true,
            gameWon: won
        }));
    }

    /**
     * Checks if the game has ended
     * @returns True if the game is over (won or lost)
     */
    isGameOver(): boolean {
        return this.gameState.getCurrentState().gameOver;
    }

    /**
     * Checks if the game was won
     * Only meaningful if isGameOver() is true
     * @returns True if the game is over and was won
     */
    isGameWon(): boolean {
        return this.gameState.getCurrentState().gameWon;
    }

    /**
     * Gets the current turn count
     * Turns increment with any game action
     * @returns Current number of turns
     */
    getTurns(): number {
        return this.gameState.getCurrentState().turns;
    }

    /**
     * Gets the current move count
     * Moves only increment when changing scenes
     * @returns Current number of moves
     */
    getMoves(): number {
        return this.gameState.getCurrentState().moves;
    }

    /**
     * Creates an observable for tracking game progress
     * Emits updates whenever any progress-related state changes:
     * - Turn count
     * - Move count
     * - Game over state
     * - Win state
     * 
     * @returns Observable<GameProgress> that emits on any progress change
     */
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

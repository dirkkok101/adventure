import { Injectable } from '@angular/core';
import { GameStateService } from './game-state.service';
import { GameTextService } from './game-text.service';
import { GameStateLoggerService } from './logging/game-state-logger.service';
import { GameState } from '../models';

/** Key used for storing game state in browser's localStorage */
const STORAGE_KEY = 'zork_game_state';

/**
 * Interface representing the serializable game state for saving/loading
 * Converts Set to array for JSON serialization
 */
export interface SaveState {
    gameState: Omit<GameState, 'knownObjects'> & {
        knownObjects: string[];
    };
    gameText: string[];
}

/**
 * Service responsible for saving and loading game state.
 * Handles persistence of game state and text to browser's localStorage.
 *
 * Key responsibilities:
 * - Save current game state and text
 * - Load saved game state and text
 * - Handle serialization/deserialization of game state
 * - Manage localStorage interaction
 * - Log state changes for debugging
 */
@Injectable({
    providedIn: 'root'
})
export class SaveLoadService {
    constructor(
        private gameState: GameStateService,
        private gameText: GameTextService,
        private logger: GameStateLoggerService
    ) {}

    /**
     * Save the current game state and text to localStorage
     * Creates a clean copy of the state without RxJS observables
     * @throws Error if saving fails
     */
    saveGame(): void {
        try {
            const state = this.gameState.getCurrentState();
            // Create a clean copy of the state without any RxJS observables
            const cleanState: GameState = {
                currentScene: state.currentScene,
                inventory: { ...state.inventory },
                containers: { ...state.containers },
                flags: { ...state.flags },
                objectData: { ...state.objectData },
                score: state.score,
                maxScore: state.maxScore,
                moves: state.moves,
                turns: state.turns,
                knownObjects: new Set<string>(state.knownObjects),
                gameOver: state.gameOver,
                gameWon: state.gameWon,
                light: state.light,
                trophies: [...state.trophies],
                sceneState: { ...state.sceneState }
            };

            // Get just the text array from the service, not the Observable
            const gameText = this.gameText.getGameText();

            const saveState: SaveState = {
                gameState: {
                    ...cleanState,
                    knownObjects: Array.from(cleanState.knownObjects)
                },
                gameText
            };

            localStorage.setItem(STORAGE_KEY, JSON.stringify(saveState));
            this.logger.logSaveState('Game saved', saveState);
        } catch (error) {
            console.error('Error saving game state:', error);
            throw error;
        }
    }

    /**
     * Load saved game state and text from localStorage
     * Converts serialized state back into proper GameState format
     * @returns True if loading succeeds, false if no save exists
     * @throws Error if loading fails
     */
    loadGame(): boolean {
        try {
            const savedState = localStorage.getItem(STORAGE_KEY);
            if (!savedState) {
                return false;
            }

            const { gameState, gameText }: SaveState = JSON.parse(savedState);

            // Convert the array back to a Set for knownObjects
            const loadedState: GameState = {
                ...gameState,
                knownObjects: new Set(gameState.knownObjects),
                objectData: gameState.objectData || {}
            };

            this.gameState.updateState(() => loadedState);
            this.gameText.loadGameText(gameText);
            this.logger.logState('Game loaded', loadedState);

            return true;
        } catch (error) {
            console.error('Error loading game state:', error);
            throw error;
        }
    }

    /**
     * Check if a saved game exists in localStorage
     * @returns True if a saved game exists
     */
    hasSavedGame(): boolean {
        return !!localStorage.getItem(STORAGE_KEY);
    }

    /**
     * Clear the saved game state from localStorage
     */
    clearSavedGame(): void {
        localStorage.removeItem(STORAGE_KEY);
    }
}

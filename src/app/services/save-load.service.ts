import { Injectable } from '@angular/core';
import { GameState } from '../models/game-state.model';
import { GameStateService } from './game-state.service';
import { GameTextService } from './game-text.service';
import { GameStateLoggerService } from './logging/game-state-logger.service';

const STORAGE_KEY = 'zork_game_state';

interface SaveState {
    gameState: Omit<GameState, 'knownObjects'> & {
        knownObjects: string[];
    };
    gameText: string[];
}

@Injectable({
    providedIn: 'root'
})
export class SaveLoadService {
    constructor(
        private gameState: GameStateService,
        private gameText: GameTextService,
        private logger: GameStateLoggerService
    ) {}

    saveGame() {
        try {
            const state = this.gameState.getCurrentState();
            // Create a clean copy of the state without any RxJS observables
            const cleanState: GameState = {
                currentScene: state.currentScene,
                inventory: { ...state.inventory },
                containers: { ...state.containers },
                flags: { ...state.flags },
                score: state.score,
                maxScore: state.maxScore,
                moves: state.moves,
                turns: state.turns,
                knownObjects: new Set<string>(state.knownObjects),
                gameOver: state.gameOver,
                gameWon: state.gameWon,
                light: state.light,
                trophies: [...state.trophies]
            };

            // Get just the text array from the service, not the Observable
            const gameText = this.gameText.getGameText();

            const saveState: SaveState = {
                gameState: {
                    ...cleanState,
                    knownObjects: Array.from(cleanState.knownObjects)
                } as SaveState['gameState'],
                gameText: gameText
            };
            
            localStorage.setItem(STORAGE_KEY, JSON.stringify(saveState));
            this.logger.logState('Game saved', cleanState);
        } catch (error) {
            console.error('Error saving game state:', error);
            throw error;
        }
    }

    loadGame(): boolean {
        const savedState = localStorage.getItem(STORAGE_KEY);
        if (savedState) {
            try {
                const parsedState = JSON.parse(savedState) as SaveState;
                
                // Load game state
                this.gameState.updateState(() => ({
                    ...parsedState.gameState,
                    knownObjects: new Set(parsedState.gameState.knownObjects)
                }));

                // Load game text
                if (Array.isArray(parsedState.gameText)) {
                    this.gameText.loadGameText(parsedState.gameText);
                }

                this.logger.logState('Game loaded', this.gameState.getCurrentState());
                return true;
            } catch (error) {
                console.error('Error loading saved game:', error);
                return false;
            }
        }
        return false;
    }

    hasSavedGame(): boolean {
        return localStorage.getItem(STORAGE_KEY) !== null;
    }

    clearSavedGame(): void {
        localStorage.removeItem(STORAGE_KEY);
    }
}

import { Injectable } from '@angular/core';
import { GameState } from '../models/game-state.model';
import { GameStateService } from './game-state.service';
import { GameTextService } from './game-text.service';
import { GameStateLoggerService } from './logging/game-state-logger.service';

const STORAGE_KEY = 'zork_game_state';

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
        const state = this.gameState.getCurrentState();
        const saveState = {
            gameState: {
                ...state,
                knownObjects: Array.from(state.knownObjects)
            },
            gameText: this.gameText.getGameText()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saveState));
        this.logger.logState('Game saved', state);
    }

    loadGame(): boolean {
        const savedState = localStorage.getItem(STORAGE_KEY);
        if (savedState) {
            try {
                const parsedState = JSON.parse(savedState);
                
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

    clearSavedGame() {
        localStorage.removeItem(STORAGE_KEY);
        this.logger.logState('Game cleared', this.gameState.getCurrentState());
    }
}

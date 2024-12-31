import { Injectable } from '@angular/core';
import { GameStateService } from './game-state.service';
import { SceneService } from './scene.service';
import { CommandService } from './commands/command.service';
import { SaveLoadService } from './save-load.service';
import { GameTextService } from './game-text.service';
import { ProgressMechanicsService } from './mechanics/progress-mechanics.service';
import { GameInitializationService } from './game-initialization.service';
import { GameState } from '../models/game-state.model';

@Injectable({
    providedIn: 'root'
})
export class GameService {
    constructor(
        private gameState: GameStateService,
        private sceneService: SceneService,
        private commandService: CommandService,
        private saveLoad: SaveLoadService,
        private gameText: GameTextService,
        private progress: ProgressMechanicsService,
        private gameInit: GameInitializationService
    ) {}

    async initializeGame(): Promise<void> {
        try {
            await this.gameInit.initializeGame();
        } catch (error) {
            console.error('Error initializing game:', error);
            this.gameText.addText('Error initializing game. Please refresh the page.');
            throw error;
        }
    }

    getCurrentState(): GameState {
        return this.gameState.getCurrentState();
    }

    private async processCommand(input: string): Promise<void> {
        if (!input.trim()) {
            return;
        }

        const state = this.gameState.getCurrentState();
        if (state.gameOver) {
            this.gameText.addText('The game is over. Start a new game or load a saved game.');
            return;
        }

        // Add command to output with a > prefix
        this.gameText.addText(`> ${input}`);

        this.progress.incrementMoves();
        const result = await this.commandService.processInput(input);
        
        if (result.message) {
            this.gameText.addText(result.message);
        }

        if (result.success && result.incrementTurn) {
            this.progress.incrementTurns();
        }
    }

    async processInput(input: string): Promise<void> {
        try {
            await this.processCommand(input);
        } catch (error) {
            console.error('Error processing input:', error);
            this.gameText.addText('An error occurred while processing your command.');
        }
    }

    async getSuggestions(input: string): Promise<string[]> {
        try {
            return await this.commandService.getSuggestions(input);
        } catch (error) {
            console.error('Error getting suggestions:', error);
            return [];
        }
    }

    async startNewGame(): Promise<void> {
        try {
            await this.gameInit.startNewGame();
            await this.saveGame(); // Auto-save on new game
        } catch (error) {
            console.error('Error starting new game:', error);
            this.gameText.addText('Error starting new game. Please try again.');
            throw error;
        }
    }

    async loadGame(): Promise<boolean> {
        try {
            const success = await this.saveLoad.loadGame();
            if (success) {
                const state = this.gameState.getCurrentState();
                const scene = this.sceneService.getScene(state.currentScene);
                if (scene) {
                    this.gameText.addText(this.sceneService.getSceneDescription(scene));
                }
            }
            return success;
        } catch (error) {
            console.error('Error loading game:', error);
            this.gameText.addText('Error loading game. The save file might be corrupted.');
            return false;
        }
    }

    async saveGame(): Promise<boolean> {
        try {
            await this.saveLoad.saveGame();
            return true;
        } catch (error) {
            console.error('Error saving game:', error);
            this.gameText.addText('Error saving game. Please try again.');
            return false;
        }
    }

    async hasSavedGame(): Promise<boolean> {
        try {
            return await this.saveLoad.hasSavedGame();
        } catch (error) {
            console.error('Error checking saved game:', error);
            return false;
        }
    }

    async resetGame(): Promise<void> {
        try {
            this.saveLoad.clearSavedGame();
            await this.gameInit.resetGame();
        } catch (error) {
            console.error('Error resetting game:', error);
            this.gameText.addText('Error resetting game. Please refresh the page.');
            throw error;
        }
    }

    getGameText() {
        return this.gameText.getGameText$();
    }
}
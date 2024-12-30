import { Injectable } from '@angular/core';
import { GameStateService } from './game-state.service';
import { SceneService } from './scene.service';
import { CommandService } from './commands/command.service';
import { SaveLoadService } from './save-load.service';
import { GameTextService } from './game-text.service';
import { ProgressMechanicsService } from './mechanics/progress-mechanics.service';

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
        private progress: ProgressMechanicsService
    ) {}

    initializeGame() {
        this.sceneService.initializeGame();
    }

    async processInput(input: string): Promise<void> {
        if (!input.trim()) {
            return;
        }

        const state = this.gameState.getCurrentState();
        if (state.gameOver) {
            this.gameText.addText('The game is over. Start a new game or load a saved game.');
            return;
        }

        this.progress.incrementMoves();
        const result = await this.commandService.processInput(input);
        
        if (result.message) {
            this.gameText.addText(result.message);
        }

        if (result.success && result.incrementTurn) {
            this.progress.incrementTurns();
        }
    }

    getSuggestions(input: string): string[] {
        return this.commandService.getSuggestions(input);
    }

    async startNewGame(): Promise<void> {
        const startScene = this.sceneService.getStartScene();
        if (!startScene) {
            throw new Error('No start scene defined');
        }

        this.gameState.initializeState(startScene.id);
        this.gameText.clearGameText();
        this.gameText.addText(startScene.descriptions.default);
    }

    async loadGame(): Promise<boolean> {
        const success = await this.saveLoad.loadGame();
        if (success) {
            const state = this.gameState.getCurrentState();
            const scene = this.sceneService.getScene(state.currentScene);
            if (scene) {
                this.gameText.addText(scene.descriptions.default);
            }
        }
        return success;
    }

    async saveGame(): Promise<void> {
        await this.saveLoad.saveGame();
    }

    async hasSavedGame(): Promise<boolean> {
        return await this.saveLoad.hasSavedGame();
    }

    async processCommand(input: string): Promise<void> {
        if (!input.trim()) {
            return;
        }

        try {
            const state = this.gameState.getCurrentState();
            if (state.gameOver) {
                this.gameText.addText('The game is over. Start a new game or load a saved game.');
                return;
            }

            this.progress.incrementMoves();
            const result = await this.commandService.processInput(input);
            
            if (result.message) {
                this.gameText.addText(result.message);
            }

            // Handle turn increment
            if (result.success && result.incrementTurn) {
                this.progress.incrementTurns();
            }
        } catch (error) {
            console.error('Error processing command:', error);
            this.gameText.addText('Something went wrong processing that command.');
        }
    }

    getGameText() {
        return this.gameText.getGameText();
    }
}
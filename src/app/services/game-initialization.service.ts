import { Injectable } from '@angular/core';
import { SceneService } from './scene.service';
import { GameStateService } from './game-state.service';
import { GameTextService } from './game-text.service';
import { Scene } from '../models/game-state.model';

@Injectable({
    providedIn: 'root'
})
export class GameInitializationService {
    constructor(
        private sceneService: SceneService,
        private gameState: GameStateService,
        private gameText: GameTextService
    ) {}

    /**
     * Initialize game scenes and assets
     * @returns Promise that resolves when initialization is complete
     */
    async initializeGame(): Promise<void> {
        // Set up initial game state
        await this.initializeGameState();
    }

    /**
     * Initialize a new game instance
     * @returns Promise that resolves when new game is started
     */
    async startNewGame(): Promise<void> {
        const startScene = this.sceneService.getStartScene();
        if (!startScene) {
            throw new Error('No start scene defined');
        }

        // Initialize game state
        this.gameState.initializeState(startScene.id);

        // Clear and set initial game text
        this.gameText.clearGameText();
        this.gameText.addText(this.sceneService.getSceneDescription(startScene));
    }

    /**
     * Reset game to initial state
     */
    async resetGame(): Promise<void> {
        await this.initializeGame();
        await this.startNewGame();
    }

    private async initializeGameState(): Promise<void> {
        const startScene = this.sceneService.getStartScene();
        if (!startScene) {
            throw new Error('No start scene defined');
        }

        this.gameState.initializeState(startScene.id);
    }
}

/**
 * Service responsible for initializing and setting up the game environment.
 * Handles loading of initial game state, scenes, and starting new games.
 * 
 * Key responsibilities:
 * - Game initialization and setup
 * - New game creation
 * - Game state reset
 * - Initial scene setup
 */
import { Injectable } from '@angular/core';
import { SceneMechanicsService } from './mechanics/scene-mechanics.service';
import { GameStateService } from './game-state.service';
import { GameTextService } from './game-text.service';

@Injectable({
    providedIn: 'root'
})
export class GameInitializationService {
    constructor(
        private sceneService: SceneMechanicsService,
        private gameState: GameStateService,
        private gameText: GameTextService
    ) {}

    /**
     * Initialize game scenes and assets.
     * Sets up the initial game environment and loads necessary resources.
     * @returns Promise that resolves when initialization is complete
     */
    async initializeGame(): Promise<void> {
        // Set up initial game state
        await this.initializeGameState();
    }

    /**
     * Initialize a new game instance.
     * Sets up initial game state, scene, and welcome text.
     * @throws Error if no start scene is defined
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
     * Reset game to initial state.
     * Reinitializes game and starts fresh.
     */
    async resetGame(): Promise<void> {
        await this.initializeGame();
        await this.startNewGame();
    }

    /**
     * Initialize the game state with default values.
     * @private
     */
    private async initializeGameState(): Promise<void> {
        // Get starting scene
        const startScene = this.sceneService.getStartScene();
        if (!startScene) {
            throw new Error('No start scene defined');
        }

        // Set up initial game state
        this.gameState.initializeState(startScene.id);
    }
}

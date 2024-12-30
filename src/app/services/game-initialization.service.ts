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
        // Load all game scenes
        await this.loadGameScenes();

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
        this.gameText.addText(startScene.descriptions.default);
    }

    /**
     * Reset game to initial state
     */
    async resetGame(): Promise<void> {
        await this.initializeGame();
        await this.startNewGame();
    }

    private async loadGameScenes(): Promise<void> {
        // TODO: Load scenes from JSON or API
        const scenes: { [key: string]: Scene } = {
            start: {
                id: 'start',
                name: 'Starting Room',
                region: 'House',
                descriptions: {
                    default: 'You are in a dimly lit room. A door leads north.',
                    dark: 'It is pitch dark. You are likely to be eaten by a grue.'
                },
                light: false,
                exits: [
                    {
                        direction: 'north',
                        targetScene: 'room2',
                        description: 'A wooden door leads north.'
                    }
                ]
            }
            // Add more scenes here
        };

        this.sceneService.loadScenes(scenes);
    }

    private async initializeGameState(): Promise<void> {
        const startScene = this.sceneService.getStartScene();
        if (!startScene) {
            throw new Error('No start scene defined');
        }

        this.gameState.initializeState(startScene.id);
    }
}

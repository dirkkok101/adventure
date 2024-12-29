import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GameStateService } from './game-state.service';
import { SceneService } from './scene.service';
import { CommandService } from './commands/command.service';
import { UIService } from './ui.service';
import { Scene } from '../models/game-state.model';

@Injectable({
    providedIn: 'root'
})
export class GameService {
    constructor(
        private gameState: GameStateService,
        private sceneService: SceneService,
        private commandService: CommandService,
        private uiService: UIService
    ) {}

    initializeGame(): void {
        // Initialize game state with starting scene
        this.gameState.initializeState('westOfHouse');

        // Set initial scene
        const scene = this.getCurrentScene();
        if (!scene) {
            throw new Error('No initial scene found');
        }

        // Display initial scene description
        const description = this.sceneService.getSceneDescription(scene);
        this.uiService.appendToGameText(description);
        this.uiService.updateSidebar();
    }

    getCurrentScene(): Scene | null {
        return this.sceneService.getCurrentScene();
    }

    processCommand(input: string): void {
        // Process the command
        const response = this.commandService.processCommand(input);

        // Update UI
        this.uiService.appendToGameText(`> ${input}`);
        this.uiService.appendToGameText(response);
        this.uiService.updateSidebar();

        // Check game state
        const state = this.gameState.getCurrentState();
        if (state.gameOver) {
            this.handleGameOver(state.gameWon);
        }
    }

    private handleGameOver(won: boolean): void {
        const message = won ? 
            "Congratulations! You've won the game!" : 
            "Game Over. Better luck next time!";
        
        this.uiService.appendToGameText(message);
        this.uiService.appendToGameText(`Final Score: ${this.gameState.getCurrentState().score}`);
    }
}
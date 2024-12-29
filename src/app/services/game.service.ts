import { Injectable } from '@angular/core';
import { SceneValidatorService } from './validators/scene/scene-validator.service';
import { CommandService } from './commands/command.service';
import { UIService } from './ui.service';
import { SceneService } from './scene.service';
import { GameStateService } from './game-state.service';

@Injectable({
    providedIn: 'root'
})
export class GameService {
    constructor(
        private sceneValidator: SceneValidatorService,
        private commandService: CommandService,
        private uiService: UIService,
        private sceneService: SceneService,
        private gameState: GameStateService
    ) {}

    initializeGame() {
        // First validate all scenes
        const validationSummary = this.sceneValidator.validateAllScenes();
        if (validationSummary.errors > 0 || validationSummary.warnings > 0) {
            console.log(validationSummary.toString());
        }

        // Then initialize the game
        this.sceneService.initializeScene('westOfHouse');
        const scene = this.sceneService.getCurrentScene();
        if (scene) {
            this.uiService.appendToGameText(this.sceneService.getSceneDescription(scene));
        }
        this.uiService.updateSidebar();
    }

    processInput(input: string): string {
        // First show what the user typed
        this.uiService.appendToGameText(`> ${input}`);

        // Process the command and get the response
        const response = this.commandService.processInput(input);

        // Show the response and update the UI
        this.uiService.appendToGameText(response);
        this.uiService.updateSidebar();

        return response;
    }

    get gameText$() {
        return this.uiService.gameText$;
    }

    get sidebar$() {
        return this.uiService.sidebar$;
    }
}
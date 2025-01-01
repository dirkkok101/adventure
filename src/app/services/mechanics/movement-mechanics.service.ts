import { Injectable } from '@angular/core';
import { FlagMechanicsService } from './flag-mechanics.service';
import { LightMechanicsService } from './light-mechanics.service';
import { SceneMechanicsService } from './scene-mechanics.service';
import { ScoreMechanicsService } from './score-mechanics.service';
import { GameTextService } from '../game-text.service';
import { CommandResponse, SceneExit } from '../../models';

/**
 * Service responsible for managing movement mechanics.
 * 
 * State Dependencies (via FlagMechanicsService):
 * - [exitId]_used: Tracks if an exit has been used
 * - [exitId]_score: Tracks if movement score has been awarded
 * - [sceneId]_visited: Scene visit tracking
 * 
 * Service Dependencies:
 * - FlagMechanicsService: State management and flag tracking
 * - LightMechanicsService: Visibility checks
 * - SceneMechanicsService: Scene and exit access
 * - ScoreMechanicsService: Movement scoring
 * - GameTextService: Localized text
 * 
 * Key Responsibilities:
 * - Movement validation
 * - Exit resolution
 * - Movement state tracking
 * - Movement scoring
 * 
 * Error Handling:
 * - Validates movement conditions
 * - Checks light conditions
 * - Validates exit requirements
 * - Provides descriptive error messages
 * 
 * State Management:
 * - All state changes go through FlagMechanicsService
 * - State queries use FlagMechanicsService
 * - Maintains data consistency
 */
@Injectable({
    providedIn: 'root'
})
export class MovementMechanicsService {
    constructor(
        private flagMechanics: FlagMechanicsService,
        private lightMechanics: LightMechanicsService,
        private sceneService: SceneMechanicsService,
        private scoreMechanics: ScoreMechanicsService,
        private gameText: GameTextService
    ) {}

    /**
     * Validate if movement in a direction is possible
     * @param direction Direction to validate
     * @returns CommandResponse indicating if movement is possible
     * 
     * State Dependencies:
     * - Light state
     * - Exit requirements
     */
    async validateMovement(direction: string): Promise<CommandResponse> {
        // Check light
        if (!await this.lightMechanics.isLightPresent()) {
            return {
                success: false,
                message: this.gameText.get('error.tooDarkMove'),
                incrementTurn: false
            };
        }

        // Get current scene
        const scene = this.sceneService.getCurrentScene();
        if (!scene) {
            return {
                success: false,
                message: this.gameText.get('error.sceneNotFound'),
                incrementTurn: false
            };
        }

        // Find exit
        const exit = scene.exits?.find(e => e.direction.toLowerCase() === direction.toLowerCase());
        if (!exit) {
            return {
                success: false,
                message: this.gameText.get('error.noExit'),
                incrementTurn: false
            };
        }

        // Check requirements
        if (exit.requiredFlags && !this.flagMechanics.checkFlags(exit.requiredFlags)) {
            return {
                success: false,
                message: exit.failureMessage || this.gameText.get('error.exitBlocked'),
                incrementTurn: false
            };
        }

        return {
            success: true,
            message: '',
            incrementTurn: false
        };
    }

    /**
     * Handle movement in a direction
     * @param direction Direction to move
     * @returns CommandResponse with result of movement
     * 
     * State Effects:
     * - May update score
     * - Updates current scene
     * - Sets exit used flag
     */
    async handleMovement(direction: string): Promise<CommandResponse> {
        // Validate movement
        const validation = await this.validateMovement(direction);
        if (!validation.success) {
            return validation;
        }

        const scene = this.sceneService.getCurrentScene();
        const exit = scene!.exits!.find(e => e.direction.toLowerCase() === direction.toLowerCase())!;

        // Handle scoring
        await this.handleMovementScoring(exit);

        // Track exit usage
        this.flagMechanics.setExitUsed(exit.targetScene);

        // Move to new scene
        const newScene = await this.sceneService.moveToScene(exit.targetScene);
        if (!newScene) {
            return {
                success: false,
                message: this.gameText.get('error.targetSceneNotFound'),
                incrementTurn: true
            };
        }

        return {
            success: true,
            message: this.sceneService.getSceneDescription(newScene),
            incrementTurn: true
        };
    }

    /**
     * Get list of available exits from current scene
     * @returns Array of available directions
     * 
     * State Dependencies:
     * - Light state
     * - Exit requirements
     */
    async getAvailableExits(): Promise<string[]> {
        if (!await this.lightMechanics.isLightPresent()) {
            return [];
        }

        const scene = this.sceneService.getCurrentScene();
        if (!scene?.exits) {
            return [];
        }

        return scene.exits
            .filter(exit => !exit.requiredFlags || this.flagMechanics.checkFlags(exit.requiredFlags))
            .map(exit => exit.direction);
    }

    /**
     * Handle scoring for movement through an exit
     * @param exit Exit being used
     * 
     * State Effects:
     * - May update score
     * - Sets exit scored flag
     */
    private async handleMovementScoring(exit: SceneExit): Promise<void> {
        if (!exit.score || this.flagMechanics.isExitScored(exit.targetScene)) {
            return;
        }

        await this.scoreMechanics.addScore(exit.score);
        this.flagMechanics.setExitScored(exit.targetScene);
    }
}

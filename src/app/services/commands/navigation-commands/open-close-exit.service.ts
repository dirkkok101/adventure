import { Injectable } from '@angular/core';
import { BaseCommandService } from '../bases/base-command.service';
import { GameStateService } from '../../game-state.service';
import { SceneMechanicsService } from '../../mechanics/scene-mechanics.service';
import { FlagMechanicsService } from '../../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../../mechanics/progress-mechanics.service';
import { LightMechanicsService } from '../../mechanics/light-mechanics.service';
import { ContainerMechanicsService } from '../../mechanics/container-mechanics.service';
import { InventoryMechanicsService } from '../../mechanics/inventory-mechanics.service';
import { ScoreMechanicsService } from '../../mechanics/score-mechanics.service';
import { GameCommand, CommandResponse } from '../../../models';

/**
 * Handles commands for opening and closing exits (doors, gates, etc.) in scenes
 * Orchestrates between SceneService for exit management and mechanics services for game state changes
 */
@Injectable({
    providedIn: 'root'
})
export class OpenCloseExitCommandService extends BaseCommandService {
    constructor(
        gameState: GameStateService,
        sceneService: SceneMechanicsService,
        flagMechanics: FlagMechanicsService,
        progress: ProgressMechanicsService,
        lightMechanics: LightMechanicsService,
        inventoryMechanics: InventoryMechanicsService,
        scoreMechanics: ScoreMechanicsService,
        containerMechanics: ContainerMechanicsService
    ) {
        super(
            gameState,
            sceneService,
            flagMechanics,
            progress,
            lightMechanics,
            inventoryMechanics,
            scoreMechanics,
            containerMechanics
        );
    }

    /**
     * Determines if this service can handle the given command
     * @param command The command to check
     * @returns True if the command is an open/close command
     */
    canHandle(command: GameCommand): boolean {
        return command.verb === 'open' || command.verb === 'close';
    }

    /**
     * Handles open/close commands for exits
     * Orchestrates between SceneService and mechanics services
     * @param command The command to handle
     * @returns Command response with success/failure and message
     */
    async handle(command: GameCommand): Promise<CommandResponse> {
        if (!command.object) {
            return this.noObjectError(command.verb);
        }

        if (!this.checkLightInScene()) {
            return this.tooDarkError();
        }

        // Try to find an exit matching the object name
        const exit = this.sceneService.findExit(command.object);
        if (!exit) {
            return this.objectNotFoundError(command.object);
        }

        // Handle the open/close action
        const result = command.verb === 'open' 
            ? await this.sceneService.openExit(exit)
            : await this.sceneService.closeExit(exit);

        // Handle scoring if successful
        if (result.success && result.score) {
            await this.scoreMechanics.addScore(result.score);
        }

        // Increment turn counter for successful actions
        if (result.success) {
            this.progress.incrementTurns();
        }

        return {
            success: result.success,
            message: result.message,
            incrementTurn: result.success
        };
    }

    /**
     * Gets suggestions for command completion
     * @param command The current command being typed
     * @returns Array of openable/closeable exit names
     */
    override async getSuggestions(command: GameCommand): Promise<string[]> {
        if (!command.verb || command.object || !this.checkLightInScene()) {
            return [];
        }

        const scene = this.sceneService.getCurrentScene();
        if (!scene?.exits) return [];

        // Only suggest openable exits
        return scene.exits
            .filter(exit => exit.isOpenable)
            .map(exit => exit.description.toLowerCase());
    }
}

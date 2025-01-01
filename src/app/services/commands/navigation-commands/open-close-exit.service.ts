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
 * Service responsible for handling commands related to opening and closing exits (doors, gates, etc.) in scenes.
 * 
 * State Dependencies (via FlagMechanicsService):
 * - Exit open/closed states ([direction]_open)
 * - Exit locked states ([direction]_locked)
 * - Exit openable states ([direction]_openable)
 * - Scene visibility and light conditions
 * 
 * Error Conditions:
 * - No object specified in command
 * - Scene too dark to interact
 * - Exit not found in current scene
 * - Exit cannot be operated (locked, not openable, etc.)
 * - Exit requires light but scene is dark
 * 
 * @implements {BaseCommandService}
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
     * Handles open/close commands for exits by orchestrating between services
     * 
     * State Effects:
     * - Updates exit open/closed state through FlagMechanicsService
     * - Updates score if action is successful
     * - Increments turn counter on success
     * 
     * Error Conditions:
     * - Returns error if no object specified
     * - Returns error if scene is too dark
     * - Returns error if exit not found
     * - Returns error if exit cannot be operated
     * - Returns error if exit is locked
     * - Returns error if exit is not openable
     * - Returns error if exit requires light but scene is dark
     * 
     * @param command The command to handle
     * @returns Command response with success/failure and message
     */
    async handle(command: GameCommand): Promise<CommandResponse> {
        if (!command.object) {
            return this.noObjectError(command.verb);
        }

        // Check if there's enough light to interact
        if (!await this.lightMechanics.isLightPresent()) {
            return {
                success: false,
                message: 'It is too dark to see.',
                incrementTurn: false
            };
        }

        // Get the current scene and available exits
        const scene = this.sceneService.getCurrentScene();
        if (!scene) {
            return {
                success: false,
                message: 'No current scene.',
                incrementTurn: false
            };
        }

        // Get available exits (this filters based on light and required flags)
        const availableExits = this.sceneService.getAvailableExits(scene);
        
        // Try to find the exit among available exits
        const exit = availableExits.find(e => 
            e.direction.toLowerCase() === command.object?.toLowerCase() ||
            e.description.toLowerCase().includes(command.object?.toLowerCase() || '')
        );

        if (!exit) {
            return {
                success: false,
                message: `You don't see any ${command.object} here.`,
                incrementTurn: false
            };
        }

        // Check if exit requires light specifically
        if (exit.requiresLight && !await this.lightMechanics.isLightPresent()) {
            return {
                success: false,
                message: 'It is too dark to see the exit clearly.',
                incrementTurn: false
            };
        }

        // Check if exit is openable
        if (!exit.isOpenable || !this.flagMechanics.isExitOpenable(exit.direction)) {
            return {
                success: false,
                message: `The ${exit.direction} cannot be ${command.verb}ed.`,
                incrementTurn: false
            };
        }

        // Check if exit is locked
        if (this.flagMechanics.isExitLocked(exit.direction)) {
            return {
                success: false,
                message: `The ${exit.direction} is locked.`,
                incrementTurn: false
            };
        }

        const isOpening = command.verb === 'open';
        const currentlyOpen = this.flagMechanics.isExitOpen(exit.direction);

        // Check if already in desired state
        if (isOpening === currentlyOpen) {
            return {
                success: false,
                message: `The ${exit.direction} is already ${isOpening ? 'open' : 'closed'}.`,
                incrementTurn: false
            };
        }

        // Update exit state
        this.flagMechanics.setExitOpen(exit.direction, isOpening);

        // Handle scoring if not previously scored
        if (!this.flagMechanics.isActionScored(exit.direction, command.verb)) {
            await this.scoreMechanics.addScore(1);
            this.flagMechanics.setActionScored(exit.direction, command.verb);
        }

        // Increment turn counter
        await this.progress.incrementTurns();

        return {
            success: true,
            message: `You ${command.verb} the ${exit.direction}.`,
            incrementTurn: true
        };
    }

    /**
     * Get suggestions for openable/closeable exits
     * Only returns suggestions if there is sufficient light
     * 
     * @param command Command to get suggestions for
     * @returns Array of openable/closeable exit names
     */
    override async getSuggestions(command: GameCommand): Promise<string[]> {
        // Only provide suggestions if we have light and no object specified
        if (!command.verb || command.object || !await this.lightMechanics.isLightPresent()) {
            return [];
        }

        const scene = this.sceneService.getCurrentScene();
        if (!scene) return [];

        // Get available exits and filter for openable ones
        const availableExits = this.sceneService.getAvailableExits(scene);
        return availableExits
            .filter(exit => exit.isOpenable)
            .map(exit => exit.direction);
    }
}

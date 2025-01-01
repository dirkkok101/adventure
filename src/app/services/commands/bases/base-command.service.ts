import { Injectable } from '@angular/core';
import { GameStateService } from '../../game-state.service';
import { SceneMechanicsService } from '../../mechanics/scene-mechanics.service';
import { FlagMechanicsService } from '../../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../../mechanics/progress-mechanics.service';
import { LightMechanicsService } from '../../mechanics/light-mechanics.service';
import { InventoryMechanicsService } from '../../mechanics/inventory-mechanics.service';
import { ScoreMechanicsService } from '../../mechanics/score-mechanics.service';
import { ContainerMechanicsService } from '../../mechanics/container-mechanics.service';
import { ICommandService, ScoringOptions, ErrorResponse, SuccessResponse } from './command-types';
import { GameCommand, CommandResponse, SceneObject } from '../../../models';

/**
 * Base class for all command services in the game.
 * Provides common command handling infrastructure and access to game mechanics.
 * 
 * Key Responsibilities:
 * - Command handling infrastructure
 * - Mechanics service access
 * - Standard error responses
 * - Base suggestion functionality
 * 
 * Dependencies:
 * All mechanics services are injected but should be used through their respective
 * specialized services rather than directly in commands when possible.
 * 
 * Usage:
 * Extend this class to create specific command handlers.
 * Override canHandle() and handle() methods for command-specific logic.
 */
@Injectable()
export abstract class BaseCommandService implements ICommandService {
    constructor(
        protected gameState: GameStateService,
        protected sceneService: SceneMechanicsService,
        protected flagMechanics: FlagMechanicsService,
        protected progress: ProgressMechanicsService,
        protected lightMechanics: LightMechanicsService,
        protected inventoryMechanics: InventoryMechanicsService,
        protected scoreMechanics: ScoreMechanicsService,
        protected containerMechanics: ContainerMechanicsService
    ) {}

    /**
     * Determines if this command service can handle the given command
     * @param command Command to check
     * @returns True if this service can handle the command
     */
    abstract canHandle(command: GameCommand): boolean;

    /**
     * Handles the execution of a game command
     * @param command Command to execute
     * @returns Promise resolving to command execution result
     */
    abstract handle(command: GameCommand): Promise<CommandResponse>;

    /**
     * Provides command suggestions based on current game state
     * Override in derived classes for command-specific suggestions
     * @param command Partial command to get suggestions for
     * @returns Array of suggested command completions
     */
    async getSuggestions(command: GameCommand): Promise<string[]> {
        return [];
    }

    /**
     * Standard error response for missing object in command
     * @param verb Command verb that needs an object
     * @returns Error response
     */
    protected noObjectError(verb: string): CommandResponse {
        return { 
            success: false, 
            message: `What do you want to ${verb}?`,
            incrementTurn: false 
        };
    }

    /**
     * Standard error response for missing current scene
     * @returns Error response
     */
    protected noSceneError(): CommandResponse {
        return { 
            success: false, 
            message: 'Error: No current scene',
            incrementTurn: false 
        };
    }

    /**
     * Standard error response for dark conditions
     * @returns Error response
     */
    protected tooDarkError(): CommandResponse {
        return {
            success: false,
            message: "It's too dark to see anything.",
            incrementTurn: false
        };
    }

    /**
     * Standard error response for object not found
     * @param objectName Name of object that wasn't found
     * @returns Error response
     */
    protected objectNotFoundError(objectName: string): CommandResponse {
        return { 
            success: false, 
            message: `You don't see any ${objectName} here.`,
            incrementTurn: false 
        };
    }

    /**
     * Standard error response for invalid interaction
     * @param verb Attempted action
     * @param objectName Target object name
     * @returns Error response
     */
    protected cannotInteractError(verb: string, objectName: string): CommandResponse {
        return { 
            success: false, 
            message: `You can't ${verb} the ${objectName}.`,
            incrementTurn: false 
        };
    }
}

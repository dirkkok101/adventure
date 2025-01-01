/**
 * Command service for handling movement and navigation between scenes.
 * 
 * Command Syntax:
 * - go [direction]
 * - move [direction]
 * - [direction] (e.g., "north", "south", etc.)
 * - enter [object/direction]
 * 
 * Valid Directions:
 * - Primary: north, south, east, west, up, down
 * - Aliases: n, s, e, w, u, d
 * 
 * Command Context:
 * - Available in any scene with defined exits
 * - Requires light source for dark scenes
 * - May require specific flags for certain exits
 * 
 * Dependencies:
 * - MovementMechanicsService: Handles movement logic and validation
 * - LightMechanicsService: Checks visibility conditions
 * 
 * Examples:
 * - "go north"
 * - "south"
 * - "move up"
 * - "enter door"
 * 
 * Side Effects:
 * - May change current scene
 * - May update score
 * - Updates movement history
 */
import { Injectable } from '@angular/core';
import { GameStateService } from '../../game-state.service';
import { SceneMechanicsService } from '../../mechanics/scene-mechanics.service';
import { FlagMechanicsService } from '../../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../../mechanics/progress-mechanics.service';
import { LightMechanicsService } from '../../mechanics/light-mechanics.service';
import { ScoreMechanicsService } from '../../mechanics/score-mechanics.service';
import { InventoryMechanicsService } from '../../mechanics/inventory-mechanics.service';
import { MovementMechanicsService } from '../../mechanics/movement-mechanics.service';
import { ContainerMechanicsService } from '../../mechanics/container-mechanics.service';
import { GameCommand, CommandResponse } from '../../../models';

@Injectable({
    providedIn: 'root'
})
export class MovementCommandService {
    protected readonly DIRECTIONS = new Set([
        'north', 'south', 'east', 'west', 'up', 'down',
        'n', 's', 'e', 'w', 'u', 'd'
    ]);

    protected readonly DIRECTION_ALIASES: { [key: string]: string } = {
        'n': 'north',
        's': 'south',
        'e': 'east',
        'w': 'west',
        'u': 'up',
        'd': 'down'
    };

    constructor(
        private gameState: GameStateService,
        private sceneService: SceneMechanicsService,
        private flagMechanics: FlagMechanicsService,
        private progress: ProgressMechanicsService,
        private lightMechanics: LightMechanicsService,
        private inventoryMechanics: InventoryMechanicsService,
        private scoreMechanics: ScoreMechanicsService,
        private containerMechanics: ContainerMechanicsService,
        private movementMechanics: MovementMechanicsService
    ) {}

    /**
     * Check if this command service can handle the given command
     * @param command Command to check
     * @returns True if command can be handled
     */
    canHandle(command: GameCommand): boolean {
        return command.verb === 'enter' || this.resolveDirection(command) !== null;
    }

    /**
     * Handle a movement command
     * @param command Command to handle
     * @returns Response indicating success/failure and message
     * 
     * Error Cases:
     * - Invalid direction
     * - No exit in direction
     * - Exit blocked by required flags
     * - Too dark to move
     */
    async handle(command: GameCommand): Promise<CommandResponse> {
        const direction = this.resolveDirection(command);
        if (direction) {
            return this.movementMechanics.handleMovement(direction);
        }

        return {
            success: false,
            message: "I don't understand that direction.",
            incrementTurn: false
        };
    }

    /**
     * Get command suggestions based on current context
     * @param command Partial command to get suggestions for
     * @returns Array of suggested command completions
     */
    async getSuggestions(command: GameCommand): Promise<string[]> {
        // For 'go' or 'move' commands without object, suggest all directions
        if ((command.verb === 'go' || command.verb === 'move') && !command.object) {
            return ['north', 'south', 'east', 'west', 'up', 'down'];
        }

        // For directional commands, get available exits
        return this.movementMechanics.getAvailableExits();
    }

    /**
     * Resolve a command into a valid direction
     * @param command Command to resolve
     * @returns Resolved direction or null if invalid
     */
    protected resolveDirection(command: GameCommand): string | null {
        let direction = command.verb;
        
        // Handle 'go', 'move', or 'enter' commands with directional objects
        if ((command.verb === 'go' || command.verb === 'move' || command.verb === 'enter') && command.object) {
            direction = command.object;
        }

        // Check if it's a valid direction
        if (!this.DIRECTIONS.has(direction.toLowerCase())) {
            return null;
        }

        // Resolve aliases
        return this.DIRECTION_ALIASES[direction.toLowerCase()] || direction.toLowerCase();
    }
}

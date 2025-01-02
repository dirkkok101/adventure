import { Injectable } from '@angular/core';
import { GameCommand, CommandResponse } from '../../models';
import { MovementCommandService } from './navigation-commands/movement-command.service';
import { InventoryCommandService } from './container-commands/inventory-command.service';
import { DropObjectCommandService } from './object-commands/drop-object-command.service';
import { LookCommandService } from './vision-commands/look-command.service';
import { ExamineCommandService } from './vision-commands/examine-command.service';
import { OpenCloseContainerCommandService } from './container-commands/open-close-container-command.service';
import { TakeObjectCommandService } from './object-commands/take-object-command.service';
import { PutInContainerCommandService } from './container-commands/put-in-container-command.service';
import { ReadObjectCommandService } from './object-commands/read-object-command.service';
import { TurnLightSourceOnOffCommandService } from './light-source-commands/turn-light-source-on-off-command.service';
import { ClimbCommandService } from './navigation-commands/climb-command.service';
import { GameTextService } from '../game-text.service';
import { CommandHandler } from './command-handler.interface';

/**
 * Service responsible for processing and routing game commands.
 * Acts as a facade for all command handling in the game.
 * 
 * Key Responsibilities:
 * - Command parsing and normalization
 * - Command routing to appropriate handlers
 * - Command suggestion aggregation
 * - Error handling and recovery
 * 
 * Command Processing Flow:
 * 1. Parse raw input into GameCommand
 * 2. Normalize verbs (aliases, directions)
 * 3. Route to appropriate handler
 * 4. Process handler response
 * 
 * Error Handling:
 * - Invalid commands return friendly messages
 * - Handler errors are caught and logged
 * - System maintains stable state on error
 */
@Injectable({
    providedIn: 'root'
})
export class CommandService {
    /** Map of direction shortcuts to full direction names */
    private static readonly DIRECTION_ALIASES: Readonly<Record<string, string>> = {
        'n': 'north',
        's': 'south',
        'e': 'east',
        'w': 'west',
        'u': 'up',
        'd': 'down'
    };

    /** Set of valid movement directions */
    private static readonly DIRECTIONS: ReadonlySet<string> = new Set([
        'north', 'south', 'east', 'west', 'up', 'down',
        'n', 's', 'e', 'w', 'u', 'd'
    ]);

    /** Map of verb shortcuts to full verb names */
    private static readonly VERB_ALIASES: Readonly<Record<string, string>> = {
        'l': 'look',
        'i': 'inventory',
        'x': 'examine',
        'get': 'take',
        'grab': 'take',
        'place': 'put',
        'check': 'examine',
        'go': 'enter'
    };

    /** List of registered command handlers */
    private readonly commandHandlers: CommandHandler[];

    constructor(
        private readonly movement: MovementCommandService,
        private readonly inventory: InventoryCommandService,
        private readonly drop: DropObjectCommandService,
        private readonly look: LookCommandService,
        private readonly examine: ExamineCommandService,
        private readonly openClose: OpenCloseContainerCommandService,
        private readonly take: TakeObjectCommandService,
        private readonly put: PutInContainerCommandService,
        private readonly read: ReadObjectCommandService,
        private readonly turn: TurnLightSourceOnOffCommandService,
        private readonly climb: ClimbCommandService,
        private readonly gameText: GameTextService,
    ) {
        // Register command handlers that implement the required interface
        this.commandHandlers = this.initializeHandlers();
    }

    /**
     * Process a raw input string into a game command and execute it
     * @param input Raw input string from user
     * @returns Command execution result
     */
    async processInput(input: string): Promise<CommandResponse> {
        try {
            const command = this.parseCommand(input?.toLowerCase());
            if (!command) {
                return this.createErrorResponse('invalidCommand');
            }

            // Normalize command verb
            command.verb = CommandService.VERB_ALIASES[command.verb] || command.verb;

            // Handle movement commands
            if (CommandService.DIRECTIONS.has(command.verb)) {
                command.verb = CommandService.DIRECTION_ALIASES[command.verb] || command.verb;
                return this.movement.handle(command);
            }

            // Find and execute appropriate handler
            const handler = this.findHandler(command);
            if (!handler) {
                return this.createErrorResponse('unknownCommand');
            }

            return await handler.handle(command);
        } catch (error) {
            console.error('Error processing command:', error);
            return this.createErrorResponse('systemError');
        }
    }

    /**
     * Parse raw input string into a structured game command
     * @param input Raw input string
     * @returns Parsed command or null if invalid
     */
    private parseCommand(input: string): GameCommand | null {
        if (!input?.trim()) return null;

        const parts = input.trim().split(/\s+/);
        const verb = this.normalizeVerb(parts[0]);
        
        return {
            verb,
            object: parts.slice(1).join(' '),
            originalInput: input
        };
    }

    /**
     * Get command suggestions based on current input
     * @param input Current input string
     * @returns Array of suggested command completions
     */
    async getSuggestions(input: string): Promise<string[]> {
        try {
            const command = this.parseCommand(input?.toLowerCase());
            if (!command) return [];

            const suggestions = new Set<string>();

            // Add basic verb suggestions for short/empty input
            if (this.shouldAddBasicSuggestions(command, input)) {
                this.addBasicSuggestions(suggestions);
            }

            // Get context-specific suggestions from handlers
            await this.addHandlerSuggestions(command, suggestions);

            // Filter and sort suggestions
            return this.filterSuggestions(Array.from(suggestions), input);
        } catch (error) {
            console.error('Error getting suggestions:', error);
            return [];
        }
    }

    /**
     * Initialize command handlers array
     * @private
     */
    private initializeHandlers(): CommandHandler[] {
        const handlers = [
            this.movement,
            this.inventory,
            this.drop,
            this.look,
            this.examine,
            this.openClose,
            this.take,
            this.put,
            this.read,
            this.turn,
            this.climb
        ];

        return handlers.filter(this.isValidHandler);
    }

    /**
     * Check if a handler implements required interface
     * @param handler Potential command handler
     * @private
     */
    private isValidHandler(handler: any): handler is CommandHandler {
        return typeof handler?.canHandle === 'function' && 
               typeof handler?.handle === 'function';
    }

    /**
     * Find appropriate handler for a command
     * @param command Command to handle
     * @private
     */
    private findHandler(command: GameCommand): CommandHandler | undefined {
        return this.commandHandlers.find(handler => handler.canHandle(command));
    }

    /**
     * Create standardized error response
     * @param type Type of error
     * @private
     */
    private createErrorResponse(type: 'invalidCommand' | 'unknownCommand' | 'systemError'): CommandResponse {
        const messages = {
            invalidCommand: "I don't understand that command.",
            unknownCommand: "I don't know how to do that.",
            systemError: "Something went wrong processing that command."
        };

        return {
            success: false,
            message: messages[type],
            incrementTurn: false
        };
    }

    /**
     * Normalize verb based on aliases and directions
     * @param verb Verb to normalize
     * @private
     */
    private normalizeVerb(verb: string): string {
        if (CommandService.DIRECTIONS.has(verb)) {
            return 'go';
        }
        return CommandService.VERB_ALIASES[verb] || verb;
    }

    /**
     * Check if basic suggestions should be added
     * @param command Current command
     * @param input Raw input
     * @private
     */
    private shouldAddBasicSuggestions(command: GameCommand, input: string): boolean {
        return !command.object && (!command.verb || input.length <= 2);
    }

    /**
     * Add basic verb and direction suggestions
     * @param suggestions Set to add suggestions to
     * @private
     */
    private addBasicSuggestions(suggestions: Set<string>): void {
        Object.keys(CommandService.VERB_ALIASES).forEach(verb => suggestions.add(verb));
        Array.from(CommandService.DIRECTIONS).forEach(dir => suggestions.add(dir));
    }

    /**
     * Add suggestions from command handlers
     * @param command Current command
     * @param suggestions Set to add suggestions to
     * @private
     */
    private async addHandlerSuggestions(command: GameCommand, suggestions: Set<string>): Promise<void> {
        const handlerSuggestions = await Promise.all(
            this.commandHandlers
                .filter(handler => handler.getSuggestions && handler.canHandle(command))
                .map(async handler => {
                    try {
                        return await handler.getSuggestions!(command);
                    } catch (error) {
                        console.error('Error getting suggestions from handler:', error);
                        return [];
                    }
                })
        );

        handlerSuggestions.flat().forEach(s => suggestions.add(s));
    }

    /**
     * Filter and sort suggestions based on input
     * @param suggestions Array of suggestions
     * @param input Current input
     * @private
     */
    private filterSuggestions(suggestions: string[], input: string): string[] {
        return [...new Set(suggestions)]
            .filter(s => s.toLowerCase().startsWith(input.toLowerCase()))
            .sort();
    }
}

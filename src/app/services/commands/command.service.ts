import {Injectable} from '@angular/core';
import {CommandResponse, GameCommand} from '../../models';
import {MovementCommandService} from './navigation-commands/movement-command.service';
import {InventoryCommandService} from './container-commands/inventory-command.service';
import {DropObjectCommandService} from './object-commands/drop-object-command.service';
import {LookCommandService} from './vision-commands/look-command.service';
import {ExamineCommandService} from './vision-commands/examine-command.service';
import {OpenCloseContainerCommandService} from './container-commands/open-close-container-command.service';
import {TakeObjectCommandService} from './object-commands/take-object-command.service';
import {PutInContainerCommandService} from './container-commands/put-in-container-command.service';
import {ReadObjectCommandService} from './object-commands/read-object-command.service';
import {TurnLightSourceOnOffCommandService} from './light-source-commands/turn-light-source-on-off-command.service';
import {MoveObjectCommandService} from './object-commands/move-object-command.service';
import {ICommandService} from './command-types';

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
  private readonly commandHandlers: ICommandService[];

  constructor(
    private readonly inventoryCommandService: InventoryCommandService,
    private readonly openCloseContainerCommandService: OpenCloseContainerCommandService,
    private readonly putInContainerCommandService: PutInContainerCommandService,
    private readonly turnLightSourceOnOffCommandService: TurnLightSourceOnOffCommandService,
    private readonly movementCommandService: MovementCommandService,
    private readonly openCloseExitCommandService: OpenCloseContainerCommandService,
    private readonly dropObjectCommandService: DropObjectCommandService,
    private readonly moveObjectCommandService: MoveObjectCommandService,
    private readonly readObjectCommandService: ReadObjectCommandService,
    private readonly takeObjectCommandService: TakeObjectCommandService,
    private readonly examineCommandService: ExamineCommandService,
    private readonly lookCommandService: LookCommandService,
  ) {
    // Register command handlers that implement the required interface
    this.commandHandlers = this.initializeHandlers();
  }

  /**
   * Process a raw input string into a game command and execute it
   * @param input Raw input string from user
   * @returns Command execution result
   */
  processInput(input: string): CommandResponse {
    try {
      const command = this.parseCommand(input?.toLowerCase());
      if (!command) {
        return this.createErrorResponse('invalidCommand');
      }

      // Normalize command verb
      command.verb = CommandService.VERB_ALIASES[command.verb] || command.verb;

      // Handle movement commands
      if (MovementCommandService.DIRECTIONS.has(command.verb)) {
        command.verb = MovementCommandService.DIRECTION_ALIASES[command.verb] || command.verb;
        return this.movementCommandService.handle(command);
      }

      // Find and execute appropriate handler
      const handler = this.findHandler(command);
      if (!handler) {
        return this.createErrorResponse('unknownCommand');
      }

      return handler.handle(command);
    } catch (error) {
      console.error('Error processing command:', error);
      return this.createErrorResponse('systemError');
    }
  }

  /**
   * Get command suggestions based on current input
   * @param input Current input string
   * @returns Array of suggested command completions
   */
  getSuggestions(input: string): string[] {
    try {
      const command = this.parseCommand(input?.toLowerCase());
      if (!command) return [];

      const suggestions = new Set<string>();

      // Add basic verb suggestions for short/empty input
      if (this.shouldAddBasicSuggestions(command, input)) {
        this.addBasicSuggestions(suggestions);
      }

      // Get context-specific suggestions from handlers
      this.addHandlerSuggestions(command, suggestions);

      // Filter and sort suggestions
      return this.filterSuggestions(Array.from(suggestions), input);
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
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
   * Initialize command handlers array
   * @private
   */
  private initializeHandlers(): ICommandService[] {
    const handlers = [
      this.inventoryCommandService,
      this.openCloseContainerCommandService,
      this.putInContainerCommandService,

      this.turnLightSourceOnOffCommandService,

      this.movementCommandService,
      this.openCloseExitCommandService,/////8

      this.dropObjectCommandService,
      this.moveObjectCommandService,
      this.readObjectCommandService,
      this.takeObjectCommandService,

      this.examineCommandService,
      this.lookCommandService,

    ];

    return handlers.filter(this.isValidHandler);
  }

  /**
   * Check if a handler implements required interface
   * @param handler Potential command handler
   * @private
   */
  private isValidHandler(handler: any): handler is ICommandService {
    return typeof handler?.canHandle === 'function' &&
      typeof handler?.handle === 'function';
  }

  /**
   * Find appropriate handler for a command
   * @param command Command to handle
   * @private
   */
  private findHandler(command: GameCommand): ICommandService | undefined {
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
    if (MovementCommandService.DIRECTIONS.has(verb)) {
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
    Array.from(MovementCommandService.DIRECTIONS).forEach(dir => suggestions.add(dir));
  }

  /**
   * Add suggestions from command handlers
   * @param command Current command
   * @param suggestions Set to add suggestions to
   * @private
   */
  private addHandlerSuggestions(command: GameCommand, suggestions: Set<string>): void {
    const handlerSuggestions =
      this.commandHandlers
        .filter(handler => handler.canHandle(command))
        .map(handler => {
            try {
              return handler.getSuggestions!(command);
            } catch (error) {
              console.error('Error getting suggestions from handler:', error);
              return [];
            }
          }
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

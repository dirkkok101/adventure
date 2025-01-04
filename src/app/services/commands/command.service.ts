import { Injectable } from "@angular/core";
import { CommandResponse, GameCommand } from "../../models";
import { ICommandService } from "./command-types";
import { InventoryCommandService } from "./container-commands/inventory-command.service";
import { PutInContainerCommandService } from "./container-commands/put-in-container-command.service";
import { MovementCommandService } from "./navigation-commands/movement-command.service";
import { DropObjectCommandService } from "./object-commands/drop-object-command.service";
import { MoveObjectCommandService } from "./object-commands/move-object-command.service";
import { ReadObjectCommandService } from "./object-commands/read-object-command.service";
import { TakeObjectCommandService } from "./object-commands/take-object-command.service";
import { ExamineCommandService } from "./vision-commands/examine-command.service";
import { LookCommandService } from "./vision-commands/look-command.service";
import {OpenExitCommandService} from './navigation-commands/open-exit-command.service';
import {CloseExitCommandService} from './navigation-commands/close-exit-command.service';
import {SwitchOnLightSourceCommandService} from './light-source-commands/switch-on-light-source-command.service';
import {SwitchOffLightSourceCommandService} from './light-source-commands/switch-off-light-source-command.service';
import {OpenContainerCommandService} from './container-commands/open-container.command.service';
import {CloseContainerCommandService} from './container-commands/close-container-command.service';

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
 * 2. Route to appropriate handler
 * 3. Process handler response
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
  /** List of registered command handlers */
  private readonly commandHandlers: ICommandService[];

  constructor(
    private readonly closeContainerCommandService: CloseContainerCommandService,
    private readonly inventoryCommandService: InventoryCommandService,
    private readonly openContainerCommandService: OpenContainerCommandService,
    private readonly putInContainerCommandService: PutInContainerCommandService,
    private readonly switchOffLightSourceCommandService: SwitchOffLightSourceCommandService,
    private readonly switchOnLightSourceCommandService: SwitchOnLightSourceCommandService,
    private readonly movementCommandService: MovementCommandService,
    private readonly openExitCommandService: OpenExitCommandService,
    private readonly closeExitCommandService: CloseExitCommandService,
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

      // Get context-specific suggestions from handlers
      const suggestions = new Set<string>();
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
    const verb = parts[0];

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
      this.closeContainerCommandService,
      this.inventoryCommandService,
      this.openContainerCommandService,
      this.putInContainerCommandService,
      this.switchOffLightSourceCommandService,
      this.switchOnLightSourceCommandService,
      this.closeExitCommandService,
      this.movementCommandService,
      this.openExitCommandService,
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
   * Add suggestions from command handlers
   * @param command Current command
   * @param suggestions Set to add suggestions to
   * @private
   */
  private addHandlerSuggestions(command: GameCommand, suggestions: Set<string>): void {
    const handlerSuggestions =
      this.commandHandlers
        .map(handler => {
          try {
            return handler.getSuggestions!(command);
          } catch (error) {
            console.error('Error getting suggestions from handler:', error);
            return [];
          }
        });

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

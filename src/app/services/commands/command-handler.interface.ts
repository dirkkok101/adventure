import { GameCommand, CommandResponse } from "../../models";

/**
 * Interface for command handlers that process game commands
 */
export interface CommandHandler {
    canHandle(command: GameCommand): boolean;
    handle(command: GameCommand): Promise<CommandResponse>;
    getSuggestions?(command: GameCommand): Promise<string[]>;
}

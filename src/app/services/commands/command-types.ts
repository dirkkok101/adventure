import { GameCommand, CommandResponse } from "../../models";

/**
 * Represents a set of valid command verbs for a command service
 */
export type CommandVerbs = readonly string[];

/**
 * Interface for command services that handle game commands
 * Each command service must implement this interface and provide its valid verbs
 */
export interface ICommandService {
  /**
   * The set of valid verbs that this command service can handle
   */
  readonly verbs: CommandVerbs;

  /**
   * Checks if this command service can handle the given command
   * @param command The command to check
   * @returns true if this service can handle the command, false otherwise
   */
  canHandle(command: GameCommand): boolean;

  /**
   * Handles the given command
   * @param command The command to handle
   * @returns The response from handling the command
   */
  handle(command: GameCommand): CommandResponse;

  /**
   * Gets suggestions for command completion based on partial input
   * @param command The partial command to get suggestions for
   * @returns An array of suggested command completions
   */
  getSuggestions(command: GameCommand): string[];
}

import {Injectable} from '@angular/core';
import {GameStateService} from '../game-state.service';
import {SceneMechanicsService} from '../mechanics/scene-mechanics.service';
import {ProgressMechanicsService} from '../mechanics/progress-mechanics.service';
import {LightMechanicsService} from '../mechanics/light-mechanics.service';
import {InventoryMechanicsService} from '../mechanics/inventory-mechanics.service';
import {ScoreMechanicsService} from '../mechanics/score-mechanics.service';
import {ContainerMechanicsService} from '../mechanics/container-mechanics.service';
import {ICommandService} from './command-types';
import {CommandResponse, GameCommand} from '../../models';

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
  protected constructor(
    protected gameStateService: GameStateService,
    protected sceneMechanicsService: SceneMechanicsService,
    protected progressMechanicsService: ProgressMechanicsService,
    protected lightMechanicsService: LightMechanicsService,
    protected inventoryMechanicsService: InventoryMechanicsService,
    protected scoreMechanicsService: ScoreMechanicsService,
    protected containerMechanicsService: ContainerMechanicsService
  ) {
  }

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
  abstract handle(command: GameCommand): CommandResponse;

  /**
   * Provides command suggestions based on current game state
   * Override in derived classes for command-specific suggestions
   * @param command Partial command to get suggestions for
   * @returns Array of suggested command completions
   */
  getSuggestions(command: GameCommand): string[] {
    return [];
  }

}

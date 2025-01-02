import {Injectable} from '@angular/core';
import {BaseCommandService} from '../base-command.service';
import {GameStateService} from '../../game-state.service';
import {SceneMechanicsService} from '../../mechanics/scene-mechanics.service';
import {ProgressMechanicsService} from '../../mechanics/progress-mechanics.service';
import {LightMechanicsService} from '../../mechanics/light-mechanics.service';
import {InventoryMechanicsService} from '../../mechanics/inventory-mechanics.service';
import {ContainerMechanicsService} from '../../mechanics/container-mechanics.service';
import {ScoreMechanicsService} from '../../mechanics/score-mechanics.service';
import {GameTextService} from '../../game-text.service';
import {CommandResponse, GameCommand} from '../../../models';
import {CommandSuggestionService} from '../command-suggestion.service';

/**
 * Service responsible for handling open and close commands for containers and exits.
 *
 * Command Pattern:
 * - Handles 'open' and 'close' verbs
 * - Validates command context and object accessibility
 * - Orchestrates between scene, container, and scoring mechanics
 *
 * State Dependencies (via FlagMechanicsService):
 * - [containerId]_open: Container open/closed state
 * - [containerId]_locked: Container lock state
 * - [containerId]_[action]_scored: Scoring state for container actions
 * - [exitId]_open: Exit open/closed state
 *
 * Service Dependencies:
 * - FlagMechanicsService: State management
 * - SceneMechanicsService: Scene and exit operations
 * - ContainerMechanicsService: Container operations
 * - LightMechanicsService: Visibility checks
 * - ScoreMechanicsService: Action scoring
 * - ProgressMechanicsService: Turn tracking
 * - GameTextService: Error and success messages
 *
 * Error Handling:
 * - Validates light presence
 * - Checks object visibility and accessibility
 * - Verifies container state (locked/unlocked)
 * - Maintains state consistency on failure
 *
 * @implements {BaseCommandService}
 */
@Injectable({
  providedIn: 'root'
})
export class OpenCloseContainerCommandService extends BaseCommandService {
  constructor(
    gameState: GameStateService,
    sceneService: SceneMechanicsService,
    progress: ProgressMechanicsService,
    lightMechanics: LightMechanicsService,
    inventoryMechanics: InventoryMechanicsService,
    containerMechanics: ContainerMechanicsService,
    scoreMechanics: ScoreMechanicsService,
    private commandSuggestionService: CommandSuggestionService,
    private gameTextService: GameTextService
  ) {
    super(
      gameState,
      sceneService,
      progress,
      lightMechanics,
      inventoryMechanics,
      scoreMechanics,
      containerMechanics
    );
  }

  /**
   * Determines if this service can handle the given command.
   *
   * @param command - The command to check
   * @returns True if command verb is 'open', 'close', or 'shut'
   */
  override canHandle(command: GameCommand): boolean {
    return command.verb === 'open' || command.verb === 'close' || command.verb === 'shut';
  }

  /**
   * Handles open and close commands for containers and exits.
   *
   * Command Flow:
   * 1. Validates command format and light presence
   * 2. Attempts to handle as exit command
   * 3. If not exit, attempts to handle as container command
   * 4. Validates object visibility and accessibility
   * 5. Processes any special interactions
   * 6. Updates container state
   * 7. Handles scoring and progressMechanicsService
   *
   * State Effects:
   * - May update container open state
   * - May update scoring state
   * - Increments turn counter on success
   *
   * Error Conditions:
   * - No object specified
   * - Insufficient light
   * - Object not found
   * - Object not visible
   * - Object not container
   * - Container locked
   * - Required flags not met
   *
   * @param command - The command to handle
   * @returns CommandResponse indicating success/failure and appropriate message
   */
  handle(command: GameCommand): CommandResponse {
    if (!command.object) {
      return {
        success: false,
        message: this.gameTextService.get('error.noObject', {action: command.verb}),
        incrementTurn: false
      };
    }

    const isOpenCommand = command.verb === 'open';
    const action = isOpenCommand ? 'open' : 'close';

    // Check if there's enough light to interact
    if (!this.lightMechanicsService.isLightPresent()) {
      return {
        success: false,
        message: this.gameTextService.get('error.tooDark'),
        incrementTurn: false
      };
    }

    // Find and validate object
    const object = this.sceneMechanicsService.findObject(command.object);
    if (!object) {
      return {
        success: false,
        message: this.gameTextService.get('error.objectNotFound', {object: command.object}),
        incrementTurn: false
      };
    }

    // If no interaction and not a container, return error
    if (!object.isContainer) {
      return {
        success: false,
        message: this.gameTextService.get('error.notContainer', {item: object.name}),
        incrementTurn: false
      };
    }

    // Check if container is locked
    if (this.containerMechanicsService.isLocked(object.id)) {
      return {
        success: false,
        message: this.gameTextService.get('error.containerLocked', {container: object.name}),
        incrementTurn: false
      };
    }

    // Handle container state change
    const result = isOpenCommand ?
      this.containerMechanicsService.openContainer(object.id) :
      this.containerMechanicsService.closeContainer(object.id);

    if (result.success) {
      // Handle scoring through ScoreMechanicsService
      this.scoreMechanicsService.handleObjectScoring({
        object,
        action,
        skipGeneralRules: false
      });

      // Update progressMechanicsService
      this.progressMechanicsService.incrementTurns();
    }

    return {
      success: result.success,
      message: result.message || this.gameTextService.get(result.success ? 'success.action' : 'error.action',
        {action, item: object.name}),
      incrementTurn: result.success
    };
  }

  /**
   * Provides suggestions for open/close commands based on visible containers and objects.
   *
   * Suggestion Logic:
   * 1. Checks command verb validity
   * 2. Validates light presence
   * 3. Gets suggestions from ContainerSuggestionService
   * 4. Formats suggestions with appropriate verb
   *
   * State Dependencies:
   * - Light state via LightMechanicsService
   * - Container state via ContainerMechanicsService
   * - Scene state via SceneMechanicsService
   *
   * @param command - Partial command to generate suggestions for
   * @returns Array of command suggestions
   */
  override getSuggestions(command: GameCommand): string[] {
    if (!command.verb || !['open', 'close', 'shut'].includes(command.verb)) {
      return [];
    }

    // Check if there's enough light to interact
    if (!this.lightMechanicsService.isLightPresent()) {
      return [];
    }

    // Get container suggestions from the dedicated service
    const containerNames = this.commandSuggestionService.getContainerSuggestions(command);

    // Format suggestions with the appropriate verb
    return containerNames.map(name => `${command.verb} ${name.toLowerCase()}`);
  }
}

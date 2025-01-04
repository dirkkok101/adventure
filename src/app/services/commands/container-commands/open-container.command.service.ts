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
export class OpenContainerCommandService extends BaseCommandService {
  /**
   * Primary verbs for command
   */
  readonly verbs = ['open'] as const;
  /**
   * Verb aliases mapping
   */
  protected override readonly verbAliases: { [key: string]: string } = {
    'o': 'open'
  };

  constructor(
    gameState: GameStateService,
    sceneService: SceneMechanicsService,
    progress: ProgressMechanicsService,
    lightMechanics: LightMechanicsService,
    inventoryMechanics: InventoryMechanicsService,
    containerMechanics: ContainerMechanicsService,
    scoreMechanics: ScoreMechanicsService,
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
   * Handles open and close commands for containers
   * @param command The command to handle
   * @returns CommandResponse indicating success/failure and appropriate message
   *
   * State Dependencies:
   * - Container state via ContainerMechanicsService
   * - Scene state via SceneMechanicsService
   * - Light state via LightMechanicsService
   * - Score state via ScoreMechanicsService
   *
   * State Effects:
   * - Updates container open/closed state
   * - May update score state
   * - Increments turn counter on success
   *
   * Error Conditions:
   * - No object specified
   * - Scene not found
   * - Insufficient light
   * - Object not found
   * - Object not visible
   * - Object not container
   * - Container locked
   * - Required flags not met
   */
  override handle(command: GameCommand): CommandResponse {
    // Validate command format
    if (!command.object) {
      return {
        success: false,
        message: this.gameTextService.get('error.noObject', {
          action: this.getPrimaryVerb(command.verb)
        }),
        incrementTurn: false
      };
    }

    // Get current scene
    const scene = this.sceneMechanicsService.getCurrentScene();
    if (!scene) {
      return {
        success: false,
        message: this.gameTextService.get('error.noScene'),
        incrementTurn: false
      };
    }

    // Check light
    if (!this.lightMechanicsService.isLightPresent(scene)) {
      return {
        success: false,
        message: this.gameTextService.get('error.tooDark', {action: command.verb}),
        incrementTurn: false
      };
    }

    // Find and validate object
    const object = this.sceneMechanicsService.findObjectByName(scene, command.object);
    if (!object) {
      return {
        success: false,
        message: this.gameTextService.get('error.objectNotFound', {item: command.object}),
        incrementTurn: false
      };
    }

    // Handle container state change
    const openResult = this.containerMechanicsService.openContainer(scene, object);
    if (!openResult.success) {
      return openResult;
    }

    // Handle scoring through ScoreMechanicsService
    this.scoreMechanicsService.handleObjectScoring({
      object,
      action: command.verb,
      skipGeneralRules: false
    });

    return {
      success: true,
      message: openResult.message,
      incrementTurn: true
    };
  }

  /**
   * Provides suggestions for open/close commands based on visible containers
   * @param command Partial command to generate suggestions for
   * @returns Array of command suggestions
   *
   * State Dependencies:
   * - Scene state via SceneMechanicsService
   * - Light state via LightMechanicsService
   * - Container state via ContainerMechanicsService
   *
   * Suggestion Types:
   * 1. No verb: Suggest primary verbs ('open', 'close')
   * 2. Partial verb: Suggest matching verbs
   * 3. Full verb, no object: Suggest visible containers
   * 4. Full command: No suggestions
   *
   * @throws None - Returns empty array on error
   */
  override getSuggestions(command: GameCommand): string[] {
// Use base class for verb suggestions if no verb or partial verb
    if (!command.verb || !this.canHandle(command)) {
      return this.getVerbSuggestions(command.verb);
    }

    // Get current scene and check light
    const scene = this.sceneMechanicsService.getCurrentScene();
    if (!scene || !this.lightMechanicsService.isLightPresent(scene)) {
      return [];
    }

    const verb = this.getPrimaryVerb(command.verb);

    // If we have a verb but no object, suggest visible containers
    if (!command.object) {
      const visibleContainers = this.getKnownObjectsNotOwned(scene)
        .filter(obj => {
          return obj.isContainer;});

      return visibleContainers.map(container =>
        `${verb} ${container.name}`
      );
    }

    return [];
  }
}

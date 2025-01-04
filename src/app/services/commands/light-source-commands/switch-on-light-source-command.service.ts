import {Injectable} from '@angular/core';
import {GameStateService} from '../../game-state.service';
import {SceneMechanicsService} from '../../mechanics/scene-mechanics.service';
import {LightMechanicsService} from '../../mechanics/light-mechanics.service';
import {InventoryMechanicsService} from '../../mechanics/inventory-mechanics.service';
import {ProgressMechanicsService} from '../../mechanics/progress-mechanics.service';
import {BaseCommandService} from '../base-command.service';
import {ContainerMechanicsService} from '../../mechanics/container-mechanics.service';
import {ScoreMechanicsService} from '../../mechanics/score-mechanics.service';
import {CommandResponse, GameCommand} from '../../../models';
import {GameTextService} from '../../game-text.service';
import {ExaminationMechanicsService} from '../../mechanics/examination-mechanics.service';
import {ObjectMechanicsService} from '../../mechanics/object-mechanics.service';

/**
 * Command service for handling light source control commands.
 * Orchestrates between mechanics services to handle turning light sources on/off.
 *
 * State Dependencies (via FlagMechanicsService):
 * - Light source state flags
 * - Interaction flags
 * - Object visibility flags
 *
 * Service Dependencies:
 * - LightMechanicsService: Light source state and validation
 * - InventoryMechanicsService: Light source possession
 * - SceneMechanicsService: Object visibility and location
 * - FlagMechanicsService: State tracking
 *
 * Command Format:
 * - "turn [light source] on/off"
 * - Requires object and preposition (on/off)
 */
@Injectable({
  providedIn: 'root'
})
export class SwitchOnLightSourceCommandService extends BaseCommandService {
  /**
   * Primary verbs for command
   */
  readonly verbs = ['switch'] as const;
  /**
   * Verb aliases mapping
   */
  protected override readonly verbAliases: { [key: string]: string } = {
    's': 'switch'
  };

  constructor(
    gameStateService: GameStateService,
    sceneMechanicsService: SceneMechanicsService,
    progressMechanicsService: ProgressMechanicsService,
    lightMechanicsService: LightMechanicsService,
    inventoryMechanicsService: InventoryMechanicsService,
    containerMechanicsService: ContainerMechanicsService,
    scoreMechanicsService: ScoreMechanicsService,
    objectMechanicsService: ObjectMechanicsService,
    examinationMechanicsService: ExaminationMechanicsService,
    gameTextService: GameTextService
  ) {
    super(
      gameStateService,
      sceneMechanicsService,
      progressMechanicsService,
      lightMechanicsService,
      inventoryMechanicsService,
      scoreMechanicsService,
      containerMechanicsService,
      objectMechanicsService,
      examinationMechanicsService,
      gameTextService
    );
  }

  override canHandle(command: GameCommand): boolean {
    // First check if the verb is valid using base class logic
    if (!super.canHandle(command)) {
      return false;
    }

    return command.preposition === 'on' && !!command.object && !!command.target;
  }

  /**
   * Handles the turn command execution
   * @param command Command to execute
   * @returns Response indicating success/failure and appropriate message
   *
   * State Dependencies:
   * - Light source state via LightMechanicsService
   * - Scene state via SceneMechanicsService
   * - Object visibility via LightMechanicsService
   *
   * Error Cases:
   * - Missing object
   * - Invalid preposition (not on/off)
   * - Object not found
   * - Object not visible
   * - Object not a light source
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

    // Check visibility
    if (!this.lightMechanicsService.isObjectVisible(object)) {
      return {
        success: false,
        message: this.gameTextService.get('error.tooDark', {action: 'turn'}),
        incrementTurn: false
      };
    }

    const lightResult = this.lightMechanicsService.switchLightSourceOnOff(scene, object, true);
    if (!lightResult.success) {
      return lightResult;
    }

    return {
      success: lightResult.success,
      message: lightResult.message || '',
      incrementTurn: lightResult.success
    };
  }

  /**
   * Gets command suggestions based on current state
   * @param command Partial command to get suggestions for
   * @returns Array of suggested command completions
   *
   * State Dependencies:
   * - Scene state via SceneMechanicsService
   * - Light state via LightMechanicsService
   *
   * Suggestion Types:
   * 1. No verb: Suggest primary verb ('switch')
   * 2. Partial verb: Suggest matching verbs
   * 3. Full verb, no object: Suggest visible light sources
   * 4. Full verb and object: Suggest prepositions (on)
   * 5. Full command: No suggestions
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

    // If we have a verb but no object, suggest visible light sources
    if (!command.object) {
      const lightSources = this.objectMechanicsService.getAllKnownObjects(scene)
        .filter(obj => this.lightMechanicsService.isLightSource(obj));

      return lightSources
        .map(obj => `${verb} ${obj.name}`);
    }

    // If we have an object but no preposition, suggest on/off
    if (!command.preposition) {
      const object = this.sceneMechanicsService.findObjectByName(scene, command.object);
      if (object &&
        this.lightMechanicsService.isLightSource(object) &&
        this.lightMechanicsService.isObjectVisible(object)) {
        return [`${verb} ${command.object} on`];
      }
    }

    return [];
  }
}

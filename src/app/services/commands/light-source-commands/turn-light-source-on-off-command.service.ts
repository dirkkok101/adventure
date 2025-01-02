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
export class TurnLightSourceOnOffCommandService extends BaseCommandService {
  constructor(
    gameStateService: GameStateService,
    sceneMechanicsService: SceneMechanicsService,
    progressMechanicsService: ProgressMechanicsService,
    lightMechanicsService: LightMechanicsService,
    inventoryMechanicsService: InventoryMechanicsService,
    scoreMechanicsService: ScoreMechanicsService,
    containerMechanicsService: ContainerMechanicsService,
    private examinationMechanicsService: ExaminationMechanicsService,
    private gameTextService: GameTextService
  ) {
    super(
      gameStateService,
      sceneMechanicsService,
      progressMechanicsService,
      lightMechanicsService,
      inventoryMechanicsService,
      scoreMechanicsService,
      containerMechanicsService
    );
  }

  /**
   * Checks if this service can handle the given command
   * @param command Command to check
   * @returns True if command is a valid turn command
   */
  canHandle(command: GameCommand): boolean {
    return command.verb === 'turn';
  }

  /**
   * Handles the turn command execution
   * @param command Command to execute
   * @returns Response indicating success/failure and appropriate message
   */
  handle(command: GameCommand): CommandResponse {

    // Validate command format
    if (!command.object) {
      return {
        success: false,
        message: this.gameTextService.get('error.noObject', {action: command.verb}),
        incrementTurn: false
      };
    }

    if (!command.preposition || !['on', 'off'].includes(command.preposition)) {
      return {
        success: false,
        message: this.gameTextService.get('error.turnOnlyOnOff'),
        incrementTurn: false
      };
    }

    // Find and validate object
    const object = this.sceneMechanicsService.findObject(command.object);
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

    // Validate object can be turned on/off
    const isLightSource = this.lightMechanicsService.isLightSource(object.id);
    const hasTurnInteraction = object.interactions?.['turn'];

    if (!isLightSource && !hasTurnInteraction) {
      return {
        success: false,
        message: this.gameTextService.get('error.cantTurnOnOff', {item: object.name}),
        incrementTurn: false
      };
    }

    // Check inventory for portable light sources
    if (isLightSource && object.canTake && !this.inventoryMechanicsService.hasItem(object.id)) {
      return {
        success: false,
        message: this.gameTextService.get('error.notHoldingItem', {item: object.name}),
        incrementTurn: false
      };
    }

    const turningOn = command.preposition === 'on';

      const lightResult = this.lightMechanicsService.switchLightSourceOnOff(object.id, turningOn);
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
   */
  override getSuggestions(command: GameCommand): string[] {
    if (!command.verb || command.preposition) {
      return [];
    }

    const scene = this.sceneMechanicsService.getCurrentScene();
    if (!scene || !this.lightMechanicsService.isLightPresent()) {
      return [];
    }

    const examinableObjects = this.examinationMechanicsService.getExaminableObjects()

    const turnableObjects =
      examinableObjects
        .filter(obj =>
          this.lightMechanicsService.isLightSource(obj.id) ||
          obj.interactions?.['turn']
        )
        .map(obj => ({
            object: obj,
            visible: this.lightMechanicsService.isObjectVisible(obj)
          })
        );

    return turnableObjects
      .filter(({visible}) => visible)
      .map(({object}) => object.name);
  }
}

import {Injectable} from '@angular/core';
import {BaseCommandService} from '../base-command.service';
import {GameStateService} from '../../game-state.service';
import {SceneMechanicsService} from '../../mechanics/scene-mechanics.service';
import {ProgressMechanicsService} from '../../mechanics/progress-mechanics.service';
import {LightMechanicsService} from '../../mechanics/light-mechanics.service';
import {InventoryMechanicsService} from '../../mechanics/inventory-mechanics.service';
import {ContainerMechanicsService} from '../../mechanics/container-mechanics.service';
import {ScoreMechanicsService} from '../../mechanics/score-mechanics.service';
import {ExaminationMechanicsService} from '../../mechanics/examination-mechanics.service';
import {GameTextService} from '../../game-text.service';
import {CommandResponse, GameCommand} from '../../../models';

/**
 * Command service for handling examine/look at commands.
 *
 * Key Responsibilities:
 * - Handle examine/look at commands
 * - Validate examination targets
 * - Provide examination suggestions
 *
 * Dependencies:
 * - ExaminationMechanicsService: Core examination logic
 * - SceneMechanicsService: Scene and object access
 * - LightMechanicsService: Visibility checks
 */
@Injectable({
  providedIn: 'root'
})
export class ExamineCommandService extends BaseCommandService {
  constructor(
    gameStateService: GameStateService,
    sceneMechanicsService: SceneMechanicsService,
    progressMechanicsService: ProgressMechanicsService,
    lightMechanicsService: LightMechanicsService,
    inventoryMechanicsService: InventoryMechanicsService,
    containerMechanicsService: ContainerMechanicsService,
    scoreMechanicsService: ScoreMechanicsService,
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

  canHandle(command: GameCommand): boolean {
    return command.verb === 'examine' ||
      command.verb === 'x' ||
      command.verb === 'look at';
  }

  handle(command: GameCommand): CommandResponse {
    // Validate command format
    if (!command.object) {
      return {
        success: false,
        message: this.gameTextService.get('error.noObject', {action: command.verb}),
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

    // Check if we can examine the object
    const canExamine = this.examinationMechanicsService.canExamine(object);
    if (!canExamine.success) {
      return canExamine;
    }

    // Get the object description
    const description = this.examinationMechanicsService.getObjectDescription(object, true);
    return {
      success: true,
      message: description,
      incrementTurn: true
    };
  }

  override getSuggestions(command: GameCommand): string[] {
    if (!command.verb || !['examine', 'x', 'look at'].includes(command.verb)) {
      return [];
    }

    const examinableObjects = this.examinationMechanicsService.getExaminableObjects();
    return examinableObjects.map(obj => `${command.verb} ${obj}`);
  }
}

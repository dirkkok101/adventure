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
import {ObjectMechanicsService} from '../../mechanics/object-mechanics.service';
import {ExaminationMechanicsService} from '../../mechanics/examination-mechanics.service';
import {MovementMechanicsService} from '../../mechanics/movement-mechanics.service';

/**
 * Command service for handling look/l commands.
 * Provides basic object examination functionality.
 *
 * Key Responsibilities:
 * - Handle look commands
 * - Validate look targets
 * - Provide look suggestions
 *
 * Dependencies:
 * - ExaminationMechanicsService: Core examination logic
 * - SceneMechanicsService: Scene and object access
 * - LightMechanicsService: Visibility checks
 */
@Injectable({
  providedIn: 'root'
})
export class LookCommandService extends BaseCommandService {
  /**
   * Primary verbs for command
   */
  readonly verbs = ['look'] as const;
  /**
   * Verb aliases mapping
   */
  protected override readonly verbAliases: { [key: string]: string } = {
    'l': 'look'
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

  handle(command: GameCommand): CommandResponse {
    const scene = this.sceneMechanicsService.getCurrentScene();
    if (!scene) {
      return {
        success: false,
        message: this.gameTextService.get('error.noScene', {action: command.verb}),
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

    const description = this.sceneMechanicsService.getSceneDescription(scene);

    return {
      success: true,
      message: description,
      incrementTurn: true
    };

  }

}

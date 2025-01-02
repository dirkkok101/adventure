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
    return command.verb === 'look' || command.verb === 'l';
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


    const scene = this.sceneMechanicsService.getCurrentScene();
    if (!scene) {
      return {
        success: false,
        message: this.gameTextService.get('error.noScene', {action: command.verb}),
        incrementTurn: false
      };
    }

    // Check light
    if (!this.lightMechanicsService.isLightPresent()) {
      return {
        success: false,
        message: this.gameTextService.get('error.tooDark', {action: command.verb}),
        incrementTurn: false
      };
    }

    // If no object specified, describe the current scene
    if (!command.object) {

      const description = this.sceneMechanicsService.getSceneDescription(scene);

      return {
        success: true,
        message: description,
        incrementTurn: true
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
    const description = this.examinationMechanicsService.getObjectDescription(object, false);
    return {
      success: true,
      message: description,
      incrementTurn: true
    };
  }

  override getSuggestions(command: GameCommand): string[] {
    if (!command.verb || !['look', 'l'].includes(command.verb)) {
      return [];
    }

    const examinableObjects = this.examinationMechanicsService.getExaminableObjects();
    return examinableObjects.map(obj => `${command.verb} ${obj}`);
  }
}

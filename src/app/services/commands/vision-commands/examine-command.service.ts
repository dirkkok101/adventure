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
import {ObjectMechanicsService} from '../../mechanics/object-mechanics.service';

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
  /**
   * Primary verbs for command
   */
  readonly verbs = ['examine'] as const;
  /**
   * Verb aliases mapping
   */
  protected override readonly verbAliases: { [key: string]: string } = {
    'x': 'examine'
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

    // Check if we can examine the object
    const canExamine = this.examinationMechanicsService.canExamine(scene, object);
    if (!canExamine.success) {
      return canExamine;
    }

    // Get the object description
    const description = this.examinationMechanicsService.getObjectDescription(scene, object, true);
    return {
      success: true,
      message: description,
      incrementTurn: true
    };
  }

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

    // Get examinable objects
    const allItems = this.objectMechanicsService.getAllKnownObjects(scene);
    const examinableObjects = allItems.filter(obj => this.examinationMechanicsService.canExamine(scene, obj));

    const verb = this.getPrimaryVerb(command.verb);

    // If we have a partial object, filter suggestions
    if (command.object) {
      const partialObject = command.object.toLowerCase();
      return examinableObjects
        .filter(obj => obj.name.toLowerCase().startsWith(partialObject))
        .map(obj => `${verb} ${obj.name}`);
    }

    // Return all possible object combinations
    return examinableObjects.map(obj => `${verb} ${obj.name}`);
  }
}

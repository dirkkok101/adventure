import {Injectable} from '@angular/core';
import {SceneMechanicsService} from './scene-mechanics.service';
import {LightMechanicsService} from './light-mechanics.service';
import {ContainerMechanicsService} from './container-mechanics.service';
import {ScoreMechanicsService} from './score-mechanics.service';
import {GameTextService} from '../game-text.service';
import {CommandResponse, Scene, SceneObject} from '../../models';
import {MechanicsBaseService} from './mechanics-base.service';
import {GameStateService} from '../game-state.service';

/**
 * Service responsible for handling object examination mechanics.
 *
 * State Dependencies (via FlagMechanicsService):
 * - [objectId]_examined: Tracks if object has been examined
 * - [objectId]_score_examine: Tracks if examine score has been awarded
 * - [objectId]_state_[stateName]: Object state flags
 *
 * Service Dependencies:
 * - FlagMechanicsService: State management and flag tracking
 * - LightMechanicsService: Visibility checks
 * - ContainerMechanicsService: Container content handling
 * - SceneMechanicsService: Scene and object access
 * - ScoreMechanicsService: Examination scoring
 * - GameTextService: Localized text
 *
 * Key Responsibilities:
 * - Object description management
 * - State-based descriptions
 * - Container content descriptions
 * - Visibility checks
 * - Examination scoring
 *
 * Error Handling:
 * - Validates object visibility
 * - Checks light conditions
 * - Validates container access
 * - Provides descriptive error messages
 *
 * State Management:
 * - All state changes go through FlagMechanicsService
 * - State queries use FlagMechanicsService
 * - Maintains data consistency
 */
@Injectable({
  providedIn: 'root'
})
export class ExaminationMechanicsService extends MechanicsBaseService {
  constructor(
    private sceneService: SceneMechanicsService,
    private lightMechanics: LightMechanicsService,
    private containerMechanics: ContainerMechanicsService,
    private scoreMechanics: ScoreMechanicsService,
    private gameText: GameTextService,
    gameStateService: GameStateService
  ) {
    super(gameStateService);
  }

  /**
   * Get the description for an object based on its state and type
   * @param scene
   * @param object Object to get description for
   * @param detailed Whether to use detailed (examine) description
   * @returns Description text with any applicable container contents
   *
   * State Effects:
   * - May update examination score flags
   * - May update first-time examination flags
   *
   * Error Conditions:
   * - Object not visible
   * - No light present
   */
  getObjectDescription(scene: Scene, object: SceneObject, detailed: boolean = false): string {
    if (!scene || scene.objects === undefined) {
      throw new Error('Invalid scene');
    }

    if (!object) {
      throw new Error('Invalid object');
    }

    // Validate visibility
    const canExamine = this.canExamine(scene, object);
    if (!canExamine.success) {
      return this.gameText.get('error.cannotExamine', {item: object.name});
    }

    // Get base description
    const description = this.getBaseDescription(object, detailed);

    // Handle scoring
    this.handleExaminationScoring(object, detailed);

    return description;
  }

  /**
   * Get list of objects that can be examined in current context
   * @returns Array of object names that can be examined
   *
   * State Dependencies:
   * - Light state
   * - Container open states
   */
  getExaminableObjects(scene: Scene): SceneObject[] {
    if (!scene || scene.objects === undefined) {
      throw new Error('Invalid scene object');
    }

    // Check light first
    if (!this.lightMechanics.isLightPresent(scene)) {
      return [];
    }

    const suggestions = new Set<SceneObject>();

    for (const obj of Object.values(scene.objects)) {
      const canExamineResult = this.canExamine(scene, obj);
      if (!canExamineResult.success) {
        continue;
      }

      suggestions.add(obj);
    }

    return Array.from(suggestions);
  }


  /**
   * Check if an object can be read
   * @param scene
   * @param object Object to check
   * @returns CommandResponse indicating if examination is possible
   *
   * State Dependencies:
   * - Light state
   * - Object visibility
   */
  canRead(scene: Scene, object: SceneObject): CommandResponse {
    if (!scene || scene.objects === undefined) {
      throw new Error('Invalid scene');
    }

    if (!object) {
      throw new Error('Invalid object');
    }

    if (!this.lightMechanics.isLightPresent(scene)) {
      return {
        success: false,
        message: this.gameText.get('error.tooDark', {action: 'examine'}),
        incrementTurn: false
      };
    }

    if (!this.lightMechanics.isObjectVisible(object)) {
      return {
        success: false,
        message: this.gameText.get('error.objectNotVisible', {item: object.name}),
        incrementTurn: false
      };
    }

    // Check if in closed container
    const container = this.containerMechanics.findContainerWithItem(scene, object.id);
    if (container && !this.containerMechanics.isOpen(container.id)) {
      return {
        success: false,
        message: this.gameText.get('error.closedContainer', {item: object.name}),
        incrementTurn: false
      };
    }

    // Then check if it has a read interaction
    if (!object.interactions?.['read']) {
      return {
        success: false,
        message: this.gameText.get('error.cantRead', {item: object.name}),
        incrementTurn: false
      };
    }

    return {
      success: true,
      message: object.interactions['read'].message,
      incrementTurn: false
    };

  }


  /**
   * Check if an object can be examined
   * @param scene
   * @param object Object to check
   * @returns CommandResponse indicating if examination is possible
   *
   * State Dependencies:
   * - Light state
   * - Object visibility
   */
  canExamine(scene: Scene, object: SceneObject): CommandResponse {
    if (!scene || scene.objects === undefined) {
      throw new Error('Invalid scene');
    }

    if (!object) {
      throw new Error('Invalid object');
    }

    if (!this.lightMechanics.isLightPresent(scene)) {
      return {
        success: false,
        message: this.gameText.get('error.tooDark', {action: 'examine'}),
        incrementTurn: false
      };
    }

    if (!this.lightMechanics.isObjectVisible(object)) {
      return {
        success: false,
        message: this.gameText.get('error.objectNotVisible', {item: object.name}),
        incrementTurn: false
      };
    }

    // Check if in closed container
    const container = this.containerMechanics.findContainerWithItem(scene, object.id);
    if (container && !this.containerMechanics.isOpen(container.id)) {
      return {
        success: false,
        message: this.gameText.get('error.closedContainer', {item: object.name}),
        incrementTurn: false
      };
    }

    // Check if object has examination properties
    if (object.descriptions?.examine || object.interactions?.['examine']) {
      return {
        success: true,
        message: '',
        incrementTurn: false
      };
    }

    return {
      success: false,
      message: this.gameText.get('error.noDescription', {item: object.name}),
      incrementTurn: false
    }
  }

  /**
   * Mark an object as examined
   * @param objectId ID of object examined
   * @param examined Whether the object has been examined
   */
  private setObjectExamined(objectId: string, examined: boolean = true): void {
    const flag = `${objectId}_examined`;
    if (examined) {
      this.setFlag(flag);
    } else {
      this.removeFlag(flag);
    }
  }

  /**
   * Check if an object has been examined
   * @param objectId ID of object to check
   * @returns Whether the object has been examined
   */
  private isObjectExamined(objectId: string): boolean {
    return this.hasFlag(`${objectId}_examined`);
  }

  /**
   * Mark an object's examine action as scored
   * @param objectId ID of object examined
   * @param scored Whether the examine action has been scored
   */
  private setExamineScored(objectId: string, scored: boolean = true): void {
    const flag = `${objectId}_score_examine`;
    if (scored) {
      this.setFlag(flag);
    } else {
      this.removeFlag(flag);
    }
  }

  /**
   * Check if an object's examine action has been scored
   * @param objectId ID of object to check
   * @returns Whether the examine action has been scored
   */
  private isExamineScored(objectId: string): boolean {
    return this.hasFlag(`${objectId}_score_examine`);
  }

  /**
   * Get the base description for an object
   * @param object Object to get description for
   * @param detailed Whether to use detailed description
   * @returns Base description text
   *
   * State Dependencies:
   * - Object state flags for state-based descriptions
   */
  private getBaseDescription(object: SceneObject, detailed: boolean): string {
    // For brief descriptions, return default
    if (!detailed) {
      return object.descriptions.default;
    }

    // For detailed examination, prefer examine description
    if (object.descriptions.examine) {
      return object.descriptions.examine;
    }

    // Fall back to state-based description
    return this.getStateBasedDescription(object);
  }

  /**
   * Get state-based description for an object
   * @param object Object to get description for
   * @returns Description based on current object state
   */
  private getStateBasedDescription(object: SceneObject): string {
    let description = object.descriptions.default;

    if (object.descriptions.states) {
      for (const [flagCombo, desc] of Object.entries(object.descriptions.states)) {
        const flags = flagCombo.split(',');
        if (this.checkFlags(flags)) {
          description = desc;
          break;
        }
      }
    }

    return description;
  }

  /**
   * Handle scoring for examining objects
   * @param object Object being examined
   * @param detailed Whether this is a detailed examination
   *
   * State Effects:
   * - May update score via ScoreMechanicsService
   * - Sets examination scored flag
   */
  private handleExaminationScoring(object: SceneObject, detailed: boolean): void {
    if (!detailed || !object.scoring?.examine) {
      return;
    }

    // Track examination
    this.setObjectExamined(object.id);

    // Handle scoring if not already scored
    if (!this.isExamineScored(object.id)) {
      this.scoreMechanics.addScore(object.scoring.examine);
      this.setExamineScored(object.id);
    }
  }

}

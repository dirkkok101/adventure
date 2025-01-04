import {Injectable} from '@angular/core';
import {GameStateService} from '../game-state.service';
import {SceneMechanicsService} from '../mechanics/scene-mechanics.service';
import {ProgressMechanicsService} from '../mechanics/progress-mechanics.service';
import {LightMechanicsService} from '../mechanics/light-mechanics.service';
import {InventoryMechanicsService} from '../mechanics/inventory-mechanics.service';
import {ScoreMechanicsService} from '../mechanics/score-mechanics.service';
import {ContainerMechanicsService} from '../mechanics/container-mechanics.service';
import {CommandVerbs, ICommandService} from './command-types';
import {CommandResponse, GameCommand, Scene, SceneObject} from '../../models';

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
   * The set of valid verbs that this command service can handle
   * Must be implemented by derived classes
   */
  abstract readonly verbs: CommandVerbs;

  /**
   * Maps alias verbs to their primary verb form
   * Must be implemented by derived classes that use aliases
   */
    protected readonly verbAliases: { [key: string]: string } = {};

  /**
   * Gets the primary verb form for a given verb or alias
   * @param verb Verb or alias to normalize
   * @returns Primary verb form, or original verb if not an alias
   */
    protected getPrimaryVerb(verb: string): string {
      return this.verbAliases[verb?.toLowerCase()] || verb;
    }

      /**
   * Gets all valid verbs including aliases
   * @returns Array of all verbs and aliases
   */
  protected getAllVerbs(): string[] {
    return [...this.verbs, ...Object.keys(this.verbAliases)];
  }

  /**
   * Default implementation to check if this command service can handle the given command
   * Uses the verbs property and aliases to determine if the command verb is supported
   * @param command Command to check
   * @returns True if this service can handle the command
   */
  canHandle(command: GameCommand): boolean {
    const verb = command.verb?.toLowerCase() ?? '';
    return this.getAllVerbs().includes(verb);
  }

  /**
   * Handles the execution of a game command
   * @param command Command to execute
   * @returns Promise resolving to command execution result
   */
  abstract handle(command: GameCommand): CommandResponse;

  /**
   * Gets verb suggestions based on partial input
   * Always returns primary verbs, not aliases
   * @param partialVerb Partial verb to get suggestions for
   * @returns Array of suggested verbs (primary forms only)
   */
  protected getVerbSuggestions(partialVerb?: string): string[] {
    if (!partialVerb) {
      return [...this.verbs];
    }

    const verb = partialVerb.toLowerCase();
    const matchingVerbs = new Set<string>();

    // Check primary verbs
    this.verbs.forEach(v => {
      if (v.startsWith(verb)) {
        matchingVerbs.add(v);
      }
    });

    // Check aliases and map to primary verbs
    Object.entries(this.verbAliases).forEach(([alias, primaryVerb]) => {
      if (alias.startsWith(verb)) {
        matchingVerbs.add(primaryVerb);
      }
    });

    return Array.from(matchingVerbs);
  }

  /**
   * Default implementation to get command suggestions based on partial input
   * By default, only suggests verbs. Override this in derived classes to add
   * object suggestions or other command-specific suggestions.
   * @param command Partial command to get suggestions for
   * @returns Array of suggested command completions
   */
  getSuggestions(command: GameCommand): string[] {
    return this.getVerbSuggestions(command.verb);
  }

  getAllKnownObjects(scene: Scene): SceneObject[] {
    // Get all readable objects from both inventory, scene and open containers
    const inventoryItems = this.inventoryMechanicsService.listInventory(scene);
    const knownSceneItems = this.getKnownObjectsNotOwned(scene);

    return [...inventoryItems, ...knownSceneItems];
  }

  getKnownObjectsNotOwned(scene: Scene): SceneObject[] {
    // Get all readable objects from both inventory, scene and open containers
    const sceneItems = this.sceneMechanicsService.getSceneObjects(scene)
      .filter(obj => !this.inventoryMechanicsService.hasItem(obj));

    const containerItems: SceneObject[] = [];
    const openContainers = this.containerMechanicsService.getSceneContainers(scene)
      .filter(container => container.isOpen);
    for (let container of openContainers) {
      const contents = this.containerMechanicsService.getContainerContents(scene, container)
        .filter(obj => !this.inventoryMechanicsService.hasItem(obj));
      containerItems.push(...contents);
    }

    return [...sceneItems, ...containerItems];
  }

}

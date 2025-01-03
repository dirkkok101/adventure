import {Injectable} from '@angular/core';
import {BaseCommandService} from '../base-command.service';
import {CommandResponse, GameCommand} from '../../../models';
import {GameTextService} from '../../game-text.service';
import {InventoryMechanicsService} from '../../mechanics/inventory-mechanics.service';
import {ExaminationMechanicsService} from '../../mechanics/examination-mechanics.service';
import {GameStateService} from '../../game-state.service';
import {ContainerMechanicsService} from '../../mechanics/container-mechanics.service';
import {LightMechanicsService} from '../../mechanics/light-mechanics.service';
import {ProgressMechanicsService} from '../../mechanics/progress-mechanics.service';
import {SceneMechanicsService} from '../../mechanics/scene-mechanics.service';
import {ScoreMechanicsService} from '../../mechanics/score-mechanics.service';

/**
 * Command service for handling inventory-related commands.
 * Allows players to check their current inventory contents and weight.
 *
 * Command Pattern:
 * - Handles 'inventory', 'i', and 'inv' verbs
 * - Orchestrates between inventory and examination mechanics
 * - No direct state manipulation
 *
 * State Dependencies (via mechanics services):
 * - Inventory contents via InventoryMechanicsService
 * - Object descriptions via ExaminationMechanicsService
 *
 * Service Dependencies:
 * - InventoryMechanicsService: Inventory operations and weight tracking
 * - ExaminationMechanicsService: Object descriptions
 * - GameTextService: Message templates
 *
 * Error Handling:
 * - Invalid object references
 * - Weight calculation errors
 * - Description retrieval errors
 *
 * Command Format:
 * - "inventory" or "i" or "inv": Show inventory contents
 *
 * Command Effects:
 * - No state changes
 * - No turn increment
 * - Displays inventory contents and weight
 */
@Injectable({
  providedIn: 'root'
})
export class InventoryCommandService extends BaseCommandService {
  constructor(
    gameStateService: GameStateService,
    sceneMechanicsService: SceneMechanicsService,
    progressMechanicsService: ProgressMechanicsService,
    lightMechanicsService: LightMechanicsService,
    inventoryMechanicsService: InventoryMechanicsService,
    containerMechanicsService: ContainerMechanicsService,
    scoreMechanicsService: ScoreMechanicsService,
    private gameTextService: GameTextService,
    private examinationMechanicsService: ExaminationMechanicsService
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
   *
   * @param command - Command to check
   * @returns True if command is an inventory command
   */
  override canHandle(command: GameCommand): boolean {
    return command.verb === 'inventory' || command.verb === 'i' || command.verb === 'inv';
  }

  /**
   * Handles inventory command execution
   *
   * Command Flow:
   * 1. Get inventory contents from InventoryMechanicsService
   * 2. Get object descriptions from ExaminationMechanicsService
   * 3. Calculate total weight if enabled
   * 4. Format response message
   *
   * Error Conditions:
   * - Invalid object references
   * - Weight calculation errors
   * - Description retrieval errors
   *
   * @param command - Command to execute
   * @returns Response with inventory contents
   */
  override handle(command: GameCommand): CommandResponse {
    if (!command.object) {
      return {
        success: false,
        message: this.gameTextService.get('error.noObject', {action: command.verb}),
        incrementTurn: false
      };
    }


    // Get inventory items
    const items = this.inventoryMechanicsService.listInventory();

    // No items case
    if (items.length === 0) {
      return {
        success: true,
        message: this.gameTextService.get('inventory.empty'),
        incrementTurn: false
      };
    }

    // Get descriptions for each item
    const itemDescriptions =
      items.map(itemId => {
          // Get the object from the scene service first
          const item = this.sceneMechanicsService.findObjectById(itemId);
          if (!item) {
            return this.gameTextService.get('error.itemNotFound', {item: itemId});
          }

          // Get description using the full object
          const description = this.examinationMechanicsService.getObjectDescription(item, false);
          return `${item.name}: ${description}`;
        }
      );

    // Get weight information if enabled
    let weightInfo = '';

    const scene = this.sceneMechanicsService.getCurrentScene();
    const contents = this.inventoryMechanicsService.listInventory();
    const totalWeight = contents.reduce((total, id) =>
      total + (scene?.objects?.[id]?.weight || 0), 0);

    if (totalWeight > 0) {
      weightInfo = this.gameTextService.get('inventory.weight', {
        current: totalWeight,
        max: this.inventoryMechanicsService.getMaxInventoryWeight()
      });
    }


    return {
      success: true,
      message: this.gameTextService.get('inventory.contents', {
        items: itemDescriptions.join('\n'),
        weight: weightInfo
      }),
      incrementTurn: false
    };

  }

  /**
   * Gets command suggestions for inventory command
   *
   * Suggestion Logic:
   * - Only provides suggestions when no verb is entered
   * - Suggests all valid inventory command variations
   *
   * @param command - Partial command to get suggestions for
   * @returns Array of suggested command completions
   */
  override getSuggestions(command: GameCommand): string[] {
    // Only suggest inventory-related verbs when no verb is entered
    if (!command.verb) {
      return ['inventory', 'i', 'inv'];
    }
    return [];
  }
}

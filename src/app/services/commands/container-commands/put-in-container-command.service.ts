import { Injectable } from "@angular/core";
import { GameCommand, CommandResponse, SceneObject } from "../../../models";
import { GameStateService } from "../../game-state.service";
import { GameTextService } from "../../game-text.service";
import { ContainerMechanicsService } from "../../mechanics/container-mechanics.service";
import { ContainerSuggestionService } from "../../mechanics/container-suggestion.service";
import { FlagMechanicsService } from "../../mechanics/flag-mechanics.service";
import { InventoryMechanicsService } from "../../mechanics/inventory-mechanics.service";
import { LightMechanicsService } from "../../mechanics/light-mechanics.service";
import { ProgressMechanicsService } from "../../mechanics/progress-mechanics.service";
import { SceneMechanicsService } from "../../mechanics/scene-mechanics.service";
import { ScoreMechanicsService } from "../../mechanics/score-mechanics.service";
import { BaseCommandService } from "../bases/base-command.service";

/**
 * Command service for handling 'put' commands that place items into containers.
 * 
 * Key Responsibilities:
 * - Validate item and container existence
 * - Check container accessibility and capacity
 * - Orchestrate item transfer between inventory and container
 * - Handle scoring for successful container placements
 * 
 * Dependencies:
 * - ContainerMechanicsService: Container state and operations
 * - InventoryMechanicsService: Inventory management
 * - ScoreMechanicsService: Scoring for successful placements
 * - LightMechanicsService: Visibility checks
 * - FlagMechanicsService: State management
 * 
 * State Dependencies:
 * - Reads: inventory state, container state, scene visibility
 * - Writes: inventory state, container state, score state
 * 
 * Command Format:
 * - "put [item] in [container]"
 * - Requires both item and container parameters
 * 
 * Error Handling:
 * - Validates scene visibility
 * - Validates item existence in inventory
 * - Validates container accessibility
 * - Ensures atomic state updates
 */
@Injectable({
    providedIn: 'root'
})
export class PutInContainerCommandService extends BaseCommandService {
    constructor(
        gameState: GameStateService,
        sceneService: SceneMechanicsService,
        flagMechanics: FlagMechanicsService,
        progress: ProgressMechanicsService,
        lightMechanics: LightMechanicsService,
        inventoryMechanics: InventoryMechanicsService,
        containerMechanics: ContainerMechanicsService,
        scoreMechanics: ScoreMechanicsService,
        private containerSuggestions: ContainerSuggestionService,
        private gameText: GameTextService
    ) {
        super(
            gameState,
            sceneService,
            flagMechanics,
            progress,
            lightMechanics,
            inventoryMechanics,
            scoreMechanics,
            containerMechanics
        );
    }

    canHandle(command: GameCommand): boolean {
        return command.verb === 'put' && !!command.object && !!command.target;
    }

    /**
     * Handles the 'put' command by transferring an item from inventory to a container
     * 
     * @param command - The game command containing item and container information
     * @returns CommandResponse indicating success/failure and appropriate message
     * 
     * State Effects:
     * - Updates inventory state through InventoryMechanicsService
     * - Updates container state through ContainerMechanicsService
     * - May update score state through ScoreMechanicsService
     * 
     * Error Conditions:
     * - Scene not visible
     * - Item not in inventory
     * - Container not accessible
     * - Container validation fails
     */
    async handle(command: GameCommand): Promise<CommandResponse> {
        // 1. Basic Command Validation
        if (!command.object || !command.target) {
            return this.noObjectError('put');
        }

        // 2. Scene Validation
        const scene = this.sceneService.getCurrentScene();
        if (!scene) {
            return this.noSceneError();
        }

        // Check if there's enough light to interact
        if (!await this.lightMechanics.isLightPresent()) {
            return {
                success: false,
                message: this.gameText.get('error.tooDark'),
                incrementTurn: false
            };
        }

        // 4. Object Resolution
        const item = scene.objects?.[command.object];
        const container = scene.objects?.[command.target];

        if (!item) {
            return {
                success: false,
                message: `You don't have a ${command.object}.`,
                incrementTurn: false
            };
        }

        if (!container) {
            return {
                success: false,
                message: `You don't see a ${command.target} here.`,
                incrementTurn: false
            };
        }

        // 5. Container Validation
        if (!container.isContainer) {
            return {
                success: false,
                message: `The ${container.name} isn't a container.`,
                incrementTurn: false
            };
        }

        // 6. Inventory Check
        if (!await this.inventoryMechanics.hasItem(item.id)) {
            return {
                success: false,
                message: `You don't have the ${item.name}.`,
                incrementTurn: false
            };
        }

        // 7. Container State Check & 8. Container Capacity Check
        const canAddResult = await this.containerMechanics.canAddToContainer(container.id, item.id);
        if (!canAddResult.success) {
            return canAddResult;
        }

        // 10. State Update
        // a. Add to container
        const addResult = await this.containerMechanics.addToContainer(container.id, item.id);
        if (!addResult.success) {
            return addResult;
        }

        // b. Remove from inventory
        this.inventoryMechanics.dropObject(item.id);
        
        // 11. Success Response
        return {
            success: true,
            message: `You put the ${item.name} in the ${container.name}.`,
            incrementTurn: true
        };
    }

    /**
     * Provides suggestions for the 'put' command based on current inventory and visible containers
     * 
     * @param command - The current command being typed
     * @returns Array of suggested completions
     * 
     * State Dependencies:
     * - Inventory contents
     * - Scene visibility
     * - Container accessibility
     */
    override async getSuggestions(command: GameCommand): Promise<string[]> {
        if (!command.verb || command.verb !== 'put') {
            return [];
        }

        // Check if there's enough light to interact
        if (!await this.lightMechanics.isLightPresent()) {
            return [];
        }

        const scene = this.sceneService.getCurrentScene();

        // If no object specified yet, suggest inventory items
        if (!command.object) {
            const inventory = await this.inventoryMechanics.getInventoryContents();
            return inventory.map(id => scene.objects?.[id]?.name || '').filter(Boolean);
        }

        // If object specified but no target, suggest containers
        if (command.object && !command.target) {
            return this.containerSuggestions.getContainerSuggestions(command);
        }

        return [];
    }
}

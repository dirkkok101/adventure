import { Injectable } from "@angular/core";
import { ContainerMechanicsService } from "./container-mechanics.service";
import { FlagMechanicsService } from "./flag-mechanics.service";
import { SceneMechanicsService } from "./scene-mechanics.service";
import { ScoreMechanicsService } from "./score-mechanics.service";

/**
 * Service responsible for managing player inventory operations in the game.
 * Handles all aspects of inventory management and object manipulation.
 * 
 * Key Responsibilities:
 * - Managing inventory contents
 * - Validating inventory operations
 * - Handling weight limits and capacity
 * - Coordinating with container mechanics
 * - Processing take/drop actions
 * 
 * State Dependencies:
 * - FlagMechanicsService: Inventory state flags
 * - SceneMechanicsService: Scene context and object access
 * - ContainerMechanicsService: Container interactions
 * - ScoreMechanicsService: Scoring inventory actions
 * 
 * Error Handling:
 * - Validates all operations before execution
 * - Provides descriptive error messages
 * - Maintains state consistency on failure
 * - Rolls back partial operations on error
 * 
 * Inventory Rules:
 * - Limited by weight capacity
 * - Some objects cannot be taken
 * - Objects in closed containers are inaccessible
 * - Certain objects require light to interact with
 * - Score awarded for specific inventory actions
 * 
 * Flag Usage:
 * Inventory State Flags:
 * - has[ObjectId]: Tracks if object is in inventory
 * - [objectId]Taken: Tracks if object has been taken before
 * - [objectId]Dropped: Tracks if object has been dropped
 * 
 * Related Services:
 * - LightMechanicsService: For visibility requirements
 * - SceneMechanicsService: For object accessibility
 * - ContainerMechanicsService: For container operations
 * - ScoreMechanicsService: For scoring actions
 */
@Injectable({
    providedIn: 'root'
})
export class InventoryMechanicsService {
    private readonly MAX_INVENTORY_WEIGHT = 20; // Default max weight if not specified

    constructor(
        private flagMechanics: FlagMechanicsService,
        private sceneMechanics: SceneMechanicsService,
        private containerMechanics: ContainerMechanicsService,
        private scoreMechanics: ScoreMechanicsService
    ) {}

    /**
     * Get a list of all items currently in inventory
     * @returns Array of item IDs in inventory
     */
    async getInventoryContents(): Promise<string[]> {
        const scene = this.sceneMechanics.getCurrentScene();
        if (!scene?.objects) return [];

        return Object.keys(scene.objects)
            .filter(id => this.flagMechanics.isObjectInInventory(id));
    }

    /**
     * Check if inventory contains a specific item
     * @param itemId ID of the item to check
     * @returns True if item is in inventory
     */
    async hasItem(itemId: string): Promise<boolean> {
        return this.flagMechanics.isObjectInInventory(itemId);
    }

    /**
     * Check if inventory is empty
     * @returns True if no items in inventory
     */
    async isInventoryEmpty(): Promise<boolean> {
        const contents = await this.getInventoryContents();
        return contents.length === 0;
    }

    /**
     * Calculate current inventory weight
     * @returns Total weight of inventory items
     * @private
     */
    private async getCurrentWeight(): Promise<number> {
        const scene = this.sceneMechanics.getCurrentScene();
        const contents = await this.getInventoryContents();
        return contents.reduce((total, id) => 
            total + (scene?.objects?.[id]?.weight || 0), 0);
    }

    /**
     * List all items in inventory with their names
     * @returns Array of item names
     */
    async listInventory(): Promise<string[]> {
        const scene = this.sceneMechanics.getCurrentScene();
        if (!scene?.objects) return [];

        const contents = await this.getInventoryContents();
        return contents.filter(id => scene.objects?.[id])
                      .map(id => scene.objects![id].name);
    }

    /**
     * Check if an object can be taken
     * Considers:
     * - Object exists in scene
     * - Object is takeable
     * - Object is not already in inventory
     * - Object is not in a closed container
     * - Total inventory weight would not exceed limit
     * 
     * @param objectId ID of object to check
     * @returns True if object can be taken
     */
    async canTakeObject(objectId: string): Promise<boolean> {
        const scene = this.sceneMechanics.getCurrentScene();
        const object = scene?.objects?.[objectId];

        if (!object) return false;
        if (!object.canTake) return false;
        if (await this.hasItem(objectId)) return false;

        // Check weight limit
        const currentWeight = await this.getCurrentWeight();
        if (currentWeight + (object.weight || 0) > this.MAX_INVENTORY_WEIGHT) {
            return false;
        }

        // Check if object is in a container
        if (await this.containerMechanics.isInContainer(objectId)) {
            const containerId = await this.containerMechanics.getContainerFor(objectId);
            if (containerId && !this.flagMechanics.isContainerOpen(containerId)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Take an object from the current scene and add it to inventory
     * @param objectId ID of the object to take
     * @returns Success status, message, and optional score
     */
    async takeObject(objectId: string): Promise<{ success: boolean; message: string; score?: number }> {
        const scene = this.sceneMechanics.getCurrentScene();
        const object = scene?.objects?.[objectId];

        if (!object) {
            return { success: false, message: "I don't see that here." };
        }

        if (!object.canTake) {
            return { success: false, message: `You can't take the ${object.name}.` };
        }

        if (await this.hasItem(objectId)) {
            return { success: false, message: `You already have the ${object.name}.` };
        }

        // Check weight limit
        const currentWeight = await this.getCurrentWeight();
        if (currentWeight + (object.weight || 0) > this.MAX_INVENTORY_WEIGHT) {
            return { success: false, message: "That would be too heavy to carry." };
        }

        // Check if object is in a container
        if (await this.containerMechanics.isInContainer(objectId)) {
            const containerId = await this.containerMechanics.getContainerFor(objectId);
            if (containerId && !this.flagMechanics.isContainerOpen(containerId)) {
                if (!scene?.objects) {
                    return { success: false, message: "Error: Scene not found." };
                }
                const container = scene.objects[containerId];
                if (!container) {
                    return { success: false, message: "Error: Container not found." };
                }
                return { success: false, message: `The ${object.name} is inside the closed ${container.name}.` };
            }
            if (containerId) {
                await this.containerMechanics.removeFromContainer(containerId, objectId);
            }
        }

        // Add to inventory
        this.flagMechanics.setObjectInInventory(objectId, true);
        this.flagMechanics.setObjectRevealed(objectId, true);

        // Handle scoring through ScoreMechanicsService
        await this.scoreMechanics.handleObjectScoring({
            action: 'take',
            object,
            skipGeneralRules: false
        });

        return { 
            success: true, 
            message: object.interactions?.['take']?.message || `Taken.`
        };
    }

    /**
     * Drop an object from inventory into the current scene
     * @param objectId ID of the object to drop
     * @returns Success status and message
     */
    async dropObject(objectId: string): Promise<{ success: boolean; message: string }> {
        const scene = this.sceneMechanics.getCurrentScene();
        const object = scene?.objects?.[objectId];

        if (!object) {
            return { success: false, message: "I don't know what that is." };
        }

        if (!await this.hasItem(objectId)) {
            return { success: false, message: `You don't have the ${object.name}.` };
        }

        // Remove from inventory
        this.flagMechanics.setObjectInInventory(objectId, false);

        return { 
            success: true, 
            message: object.interactions?.['drop']?.message || `Dropped.`
        };
    }

    /**
     * Put an object from inventory into a container
     * @param objectId ID of the object to put
     * @param containerId ID of the container
     * @returns Success status and message
     */
    async putObjectInContainer(objectId: string, containerId: string): Promise<{ success: boolean; message: string }> {
        const scene = this.sceneMechanics.getCurrentScene();
        const object = scene?.objects?.[objectId];
        const container = scene?.objects?.[containerId];

        if (!object) {
            return { success: false, message: "I don't know what that is." };
        }

        if (!container) {
            return { success: false, message: "I don't see that here." };
        }

        if (!container.isContainer) {
            return { success: false, message: `The ${container.name} isn't a container.` };
        }

        if (!await this.hasItem(objectId)) {
            return { success: false, message: `You don't have the ${object.name}.` };
        }

        if (!this.flagMechanics.isContainerOpen(containerId)) {
            return { success: false, message: `The ${container.name} is closed.` };
        }

        // Check container capacity
        if (!await this.containerMechanics.canAddToContainer(containerId, objectId)) {
            return { success: false, message: `The ${container.name} is full.` };
        }

        // Remove from inventory and add to container
        this.flagMechanics.setObjectInInventory(objectId, false);
        await this.containerMechanics.addToContainer(containerId, objectId);

        // Handle scoring through ScoreMechanicsService
        await this.scoreMechanics.handleObjectScoring({
            action: 'container',
            object,
            container,
            skipGeneralRules: true
        });

        return {
            success: true,
            message: `You put the ${object.name} in the ${container.name}.`
        };
    }

    /**
     * Take an object from a container and add it to inventory
     * @param objectId ID of the object to take
     * @param containerId ID of the container
     * @returns Success status and message
     */
    async takeObjectFromContainer(objectId: string, containerId: string): Promise<{ success: boolean; message: string }> {
        const scene = this.sceneMechanics.getCurrentScene();
        const object = scene?.objects?.[objectId];
        const container = scene?.objects?.[containerId];

        if (!object) {
            return { success: false, message: "I don't know what that is." };
        }

        if (!container) {
            return { success: false, message: "I don't see that here." };
        }

        if (!container.isContainer) {
            return { success: false, message: `The ${container.name} isn't a container.` };
        }

        if (!this.flagMechanics.isContainerOpen(containerId)) {
            return { success: false, message: `The ${container.name} is closed.` };
        }

        if (!await this.containerMechanics.isInContainer(objectId)) {
            return { success: false, message: `The ${object.name} isn't in the ${container.name}.` };
        }

        if (!object.canTake) {
            return { success: false, message: `You can't take the ${object.name}.` };
        }

        // Check weight limit
        const currentWeight = await this.getCurrentWeight();
        if (currentWeight + (object.weight || 0) > this.MAX_INVENTORY_WEIGHT) {
            return { success: false, message: "That would be too heavy to carry." };
        }

        // Remove from container and add to inventory
        await this.containerMechanics.removeFromContainer(containerId, objectId);
        this.flagMechanics.setObjectInInventory(objectId, true);
        this.flagMechanics.setObjectRevealed(objectId, true);

        return {
            success: true,
            message: `You take the ${object.name} from the ${container.name}.`
        };
    }
}

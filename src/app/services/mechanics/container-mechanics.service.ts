import { Injectable } from '@angular/core';
import { FlagMechanicsService } from './flag-mechanics.service';
import { InventoryMechanicsService } from './inventory-mechanics.service';
import { SceneObject, CommandResponse } from '../../models';
import { GameStateService } from '../game-state.service';
import { SceneMechanicsService } from './scene-mechanics.service';
import { GameTextService } from '../game-text.service';

/**
 * Service responsible for managing container-related game mechanics.
 * 
 * State Dependencies:
 * - FlagMechanicsService: Container state (open/closed, locked/unlocked)
 *   - [containerId]Open: Container open state
 *   - [containerId]Locked: Container lock state
 *   - [containerId]_contents: Container contents
 * 
 * Service Dependencies:
 * - InventoryMechanicsService: For checking key possession
 * - SceneMechanicsService: For scene and object access
 * - GameTextService: For error messages
 * 
 * Key Responsibilities:
 * - Container state management
 * - Container access validation
 * - Container content management
 * - Container lock management
 * 
 * Error Handling:
 * - Validates container existence
 * - Checks container accessibility
 * - Verifies capacity constraints
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
export class ContainerMechanicsService {
    constructor(
        private flagMechanics: FlagMechanicsService,
        private inventoryMechanics: InventoryMechanicsService,
        private sceneService: SceneMechanicsService,
        private gameText: GameTextService
    ) {}

    /**
     * Check if a container exists and is valid
     * @param containerId ID of container to validate
     * @returns The container object if valid, null otherwise
     */
    private getValidContainer(containerId: string): SceneObject | null {
        const scene = this.sceneService.getCurrentScene();
        const container = scene?.objects?.[containerId];
        if (!container) return null;

        return container.isContainer ? container : null;
    }

    /**
     * Get all containers in the current scene
     * @returns Map of container ID to container object
     */
    private getSceneContainers(): Map<string, SceneObject> {
        const scene = this.sceneService.getCurrentScene();
        const containers = new Map<string, SceneObject>();
        
        if (!scene?.objects) return containers;

        for (const [id, obj] of Object.entries(scene.objects)) {
            if (obj.isContainer) {
                containers.set(id, obj);
            }
        }

        return containers;
    }

    /**
     * Get the contents of a container
     * @param containerId ID of container to check
     * @returns Array of item IDs in the container
     */
    private getContents(containerId: string): string[] {
        return this.flagMechanics.getObjectData<string[]>(containerId, 'contents') || [];
    }

    /**
     * Set the contents of a container
     * @param containerId ID of container to update
     * @param contents New contents array
     */
    private setContents(containerId: string, contents: string[]): void {
        this.flagMechanics.setObjectData(containerId, 'contents', contents);
    }

    /**
     * Check if a container is open
     * @param containerId ID of container to check
     * @returns Whether the container is open
     */
    async isOpen(containerId: string): Promise<boolean> {
        return this.flagMechanics.isContainerOpen(containerId);
    }

    /**
     * Check if a container is locked
     * @param containerId ID of container to check
     * @returns Whether the container is locked
     */
    async isLocked(containerId: string): Promise<boolean> {
        return this.flagMechanics.isObjectLocked(containerId);
    }

    /**
     * Check if an item can be added to a container
     * Validates container existence, open state, and capacity
     * @param containerId ID of the container to check
     * @param itemId ID of the item to potentially add
     * @returns CommandResponse indicating if the item can be added
     */
    async canAddToContainer(containerId: string, itemId: string): Promise<CommandResponse> {
        const container = this.getValidContainer(containerId);
        if (!container) {
            return {
                success: false,
                message: this.gameText.get('error.invalidContainer'),
                incrementTurn: false
            };
        }

        if (!await this.isOpen(containerId)) {
            return {
                success: false,
                message: this.gameText.get('error.containerClosed', { container: container.name }),
                incrementTurn: false
            };
        }

        const contents = this.getContents(containerId);
        if (container.capacity && contents.length >= container.capacity) {
            return {
                success: false,
                message: this.gameText.get('error.containerFull', { container: container.name }),
                incrementTurn: false
            };
        }

        return {
            success: true,
            message: '',
            incrementTurn: false
        };
    }

    /**
     * Add an item to a container
     * Updates game state to track the new container contents
     * @param containerId ID of the container to add to
     * @param itemId ID of the item to add
     * @returns CommandResponse indicating success/failure
     */
    async addToContainer(containerId: string, itemId: string): Promise<CommandResponse> {
        const canAdd = await this.canAddToContainer(containerId, itemId);
        if (!canAdd.success) {
            return canAdd;
        }

        const contents = this.getContents(containerId);
        this.setContents(containerId, [...contents, itemId]);

        const container = this.getValidContainer(containerId);
        return {
            success: true,
            message: this.gameText.get('success.addedToContainer', { 
                container: container!.name 
            }),
            incrementTurn: true
        };
    }

    /**
     * Remove an item from a container
     * Updates game state to reflect the removal
     * @param containerId ID of the container to remove from
     * @param itemId ID of the item to remove
     * @returns CommandResponse indicating success/failure
     */
    async removeFromContainer(containerId: string, itemId: string): Promise<CommandResponse> {
        const container = this.getValidContainer(containerId);
        if (!container) {
            return {
                success: false,
                message: this.gameText.get('error.invalidContainer'),
                incrementTurn: false
            };
        }

        const contents = this.getContents(containerId);
        if (!contents.includes(itemId)) {
            return {
                success: false,
                message: this.gameText.get('error.itemNotInContainer', {
                    container: container.name
                }),
                incrementTurn: false
            };
        }

        this.setContents(containerId, contents.filter(id => id !== itemId));

        return {
            success: true,
            message: this.gameText.get('success.removedFromContainer', {
                container: container.name
            }),
            incrementTurn: true
        };
    }

    /**
     * Find which container holds a specific item
     * @param itemId The ID of the item to check
     * @returns The container object or null if not in a container
     */
    findContainerWithItem(itemId: string): SceneObject | null {
        const containers = this.getSceneContainers();
        
        for (const [containerId, container] of containers) {
            if (this.getContents(containerId).includes(itemId)) {
                return container;
            }
        }

        return null;
    }

    /**
     * Check if an item is currently in any container
     * @param itemId ID of the item to check
     * @returns True if the item is in a container, false otherwise
     */
    async isInContainer(itemId: string): Promise<boolean> {
        return this.findContainerWithItem(itemId) !== null;
    }

    /**
     * Get the container that holds a specific item
     * @param itemId ID of the item to check
     * @returns ID of the container holding the item, or null if not in any container
     */
    async getContainerFor(itemId: string): Promise<string | null> {
        const container = this.findContainerWithItem(itemId);
        return container ? container.id : null;
    }

    /**
     * Validates if a container exists and is accessible for a given action
     * @param container The container to validate
     * @param action The action being attempted ('take', 'put', 'open')
     * @returns CommandResponse indicating if the action can proceed
     */
    async validateContainerAccess(container: SceneObject, action: string): Promise<CommandResponse> {
        if (!container?.isContainer) {
            return {
                success: false,
                message: this.gameText.get('error.notContainer', { 
                    object: container?.name || 'object' 
                }),
                incrementTurn: false
            };
        }

        if (['take', 'put'].includes(action) && !await this.isOpen(container.id)) {
            return {
                success: false,
                message: this.gameText.get('error.containerClosed', { 
                    container: container.name 
                }),
                incrementTurn: false
            };
        }

        if (action === 'open' && await this.isLocked(container.id)) {
            return this.handleLockedContainer(container);
        }

        return {
            success: true,
            message: '',
            incrementTurn: false
        };
    }

    /**
     * Get a description of a container's contents
     * @param container Container to describe
     * @returns Description of container contents
     */
    async getContainerContents(container: SceneObject): Promise<string> {
        if (!container.isContainer) {
            return '';
        }

        const contents = this.getContents(container.id);
        if (!contents.length) {
            return container.descriptions.empty || this.gameText.get('container.empty');
        }

        const scene = this.sceneService.getCurrentScene();
        if (!scene?.objects) {
            return this.gameText.get('error.sceneNotFound');
        }

        // Build list of visible contents with type safety
        const visibleContents: string[] = [];
        for (const id of contents) {
            const obj = scene.objects[id];
            if (obj) {
                visibleContents.push(obj.name);
            }
        }

        if (!visibleContents.length) {
            return container.descriptions.empty || this.gameText.get('container.empty');
        }

        const contentList = visibleContents.join(', ');
        return container.descriptions.contents ? 
            container.descriptions.contents.replace('{items}', contentList) :
            this.gameText.get('container.contents', { items: contentList });
    }

    /**
     * Handle interaction with a locked container
     * @param container The locked container
     * @returns CommandResponse with the result of the interaction
     */
    private async handleLockedContainer(container: SceneObject): Promise<CommandResponse> {
        return {
            success: false,
            message: this.gameText.get('error.containerLocked', { 
                container: container.name 
            }),
            incrementTurn: false
        };
    }
}

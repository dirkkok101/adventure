import { Injectable } from '@angular/core';
import { GameStateService } from '../game-state.service';
import { SceneInteraction, SceneObject } from '../../models/game-state.model';
import { FlagMechanicsService } from './flag-mechanics.service';
import { InventoryMechanicsService } from './inventory-mechanics.service';
import { ProgressMechanicsService } from './progress-mechanics.service';
import { GameTextService } from '../game-text.service';
import { LightMechanicsService } from './light-mechanics.service';
import { ScoreMechanicsService } from './score-mechanics.service';
import { ContainerMechanicsService } from './container-mechanics.service';
import { SceneService } from '../scene.service';

@Injectable({
    providedIn: 'root'
})
export class StateMechanicsService {
    constructor(
        private gameState: GameStateService,
        private flagMechanics: FlagMechanicsService,
        private inventoryMechanics: InventoryMechanicsService,
        private progressMechanics: ProgressMechanicsService,
        private lightMechanics: LightMechanicsService,
        private scoreMechanics: ScoreMechanicsService,
        private containerMechanics: ContainerMechanicsService,
        private gameText: GameTextService,
        private sceneService: SceneService
    ) {}

    async handleInteraction(object: SceneObject, verb: string): Promise<{ success: boolean; message: string }> {
        try {
            const interaction = object.interactions?.[verb];

            if (!interaction) {
                return { 
                    success: false, 
                    message: this.gameText.get('error.cantPerformAction', { action: verb, item: object.name })
                };
            }

            // Check required flags if they exist and are not empty
            const requiredFlags = interaction.requiredFlags;
            if (requiredFlags && requiredFlags.length > 0) {
                if (!await this.checkRequiredFlags(requiredFlags)) {
                    return { 
                        success: false, 
                        message: interaction.failureMessage || this.gameText.get('error.actionNotAllowed')
                    };
                }
            }

            // Check if light is required and present
            if (interaction.requiresLight && !this.lightMechanics.isLightPresent()) {
                return { 
                    success: false, 
                    message: this.gameText.get('error.tooDark', { action: verb })
                };
            }

            // Handle inventory changes
            if (interaction.addToInventory) {
                for (const itemId of interaction.addToInventory) {
                    await this.inventoryMechanics.addToInventory(itemId);
                }
            }

            if (interaction.removeFromInventory) {
                for (const itemId of interaction.removeFromInventory) {
                    await this.inventoryMechanics.removeFromInventory(itemId);
                }
            }

            // Handle container changes
            if (interaction.addToContainer) {
                const { containerId, itemIds } = interaction.addToContainer;
                for (const itemId of itemIds) {
                    await this.containerMechanics.addToContainer(containerId, itemId);
                }
            }

            if (interaction.removeFromContainer) {
                const { containerId, itemIds } = interaction.removeFromContainer;
                for (const itemId of itemIds) {
                    await this.containerMechanics.removeFromContainer(containerId, itemId);
                }
            }

            // Handle flag changes
            if (interaction.grantsFlags) {
                for (const flag of interaction.grantsFlags) {
                    await this.flagMechanics.setFlag(flag);
                }
            }

            if (interaction.removesFlags) {
                for (const flag of interaction.removesFlags) {
                    await this.flagMechanics.removeFlag(flag);
                }
            }

            // Handle scoring
            if (interaction.score) {
                await this.scoreMechanics.addScore(interaction.score);
            }

            // Handle object reveals
            if (interaction.revealsObjects) {
                for (const objectId of interaction.revealsObjects) {
                    // Add to knownObjects to make it visible
                    this.gameState.updateState(state => ({
                        ...state,
                        knownObjects: new Set([...state.knownObjects, objectId])
                    }));

                    // Update scene state for revealed object
                    const scene = this.sceneService.getCurrentScene();
                    if (scene) {
                        this.sceneService.updateObjectState(scene.id, objectId, { isRevealed: true });
                        // If the interaction target is a container, add the revealed object to it
                        if (object?.isContainer) {
                            await this.containerMechanics.addToContainer(object.id, objectId);
                        }
                    }
                }
            }

            // Handle light changes
            if (interaction.providesLight !== undefined) {
                const scene = this.sceneService.getCurrentScene();
                if (!scene) {
                    return { success: false, message: this.gameText.get('error.generalError') };
                }
                const lightSource = Object.values(scene.objects || {}).find(obj => obj.providesLight);
                if (!lightSource) {
                    return { success: false, message: this.gameText.get('error.noLightSource') };
                }
                const result = this.lightMechanics.handleLightSource(lightSource.id, interaction.providesLight);
                if (!result.success) {
                    return result;
                }
            }

            // Handle turn progression
            if (interaction.turnsToComplete) {
                for (let i = 0; i < interaction.turnsToComplete; i++) {
                    this.progressMechanics.incrementTurns();
                }
            }

            return {
                success: true,
                message: interaction.message
            };
        } catch (error) {
            console.error('Error handling interaction:', error);
            return {
                success: false,
                message: this.gameText.get('error.generalError')
            };
        }
    }

    async handleSceneInteraction(interaction: SceneInteraction): Promise<{ success: boolean; message: string }> {
        try {
            // Check required flags
            if (interaction.requiredFlags && !await this.checkRequiredFlags(interaction.requiredFlags)) {
                return { 
                    success: false, 
                    message: interaction.failureMessage || this.gameText.get('error.actionNotAllowed')
                };
            }

            // Handle flag changes
            if (interaction.grantsFlags) {
                for (const flag of interaction.grantsFlags) {
                    await this.flagMechanics.setFlag(flag);
                }
            }

            if (interaction.removesFlags) {
                for (const flag of interaction.removesFlags) {
                    await this.flagMechanics.removeFlag(flag);
                }
            }

            // Handle inventory changes
            if (interaction.addToInventory) {
                for (const item of interaction.addToInventory) {
                    await this.inventoryMechanics.addToInventory(item);
                }
            }

            if (interaction.removeFromInventory) {
                for (const item of interaction.removeFromInventory) {
                    await this.inventoryMechanics.removeFromInventory(item);
                }
            }

            // Handle object reveals
            if (interaction.revealsObjects) {
                for (const objectId of interaction.revealsObjects) {
                    // Add to knownObjects to make it visible
                    this.gameState.updateState(state => ({
                        ...state,
                        knownObjects: new Set([...state.knownObjects, objectId])
                    }));

                    // Update scene state for revealed object
                    const scene = this.sceneService.getCurrentScene();
                    if (scene && scene.objects) {
                        this.sceneService.updateObjectState(scene.id, objectId, { isRevealed: true });
                        // If this is a container interaction, add the revealed object to the container
                        if (interaction.addToContainer) {
                            await this.containerMechanics.addToContainer(interaction.addToContainer.containerId, objectId);
                        }
                    }
                }
            }

            // Handle container changes
            if (interaction.addToContainer) {
                const { containerId, itemIds } = interaction.addToContainer;
                for (const itemId of itemIds) {
                    await this.containerMechanics.addToContainer(containerId, itemId);
                }
            }

            // Handle light changes
            if (interaction.providesLight !== undefined) {
                const scene = this.sceneService.getCurrentScene();
                if (!scene) {
                    return { success: false, message: this.gameText.get('error.generalError') };
                }
                const lightSource = Object.values(scene.objects || {}).find(obj => obj.providesLight);
                if (!lightSource) {
                    return { success: false, message: this.gameText.get('error.noLightSource') };
                }
                const result = this.lightMechanics.handleLightSource(lightSource.id, interaction.providesLight);
                if (!result.success) {
                    return result;
                }
            }

            // Handle scoring
            if (interaction.score) {
                await this.scoreMechanics.addScore(interaction.score);
            }

            // Handle turn progression
            if (interaction.turnsToComplete) {
                for (let i = 0; i < interaction.turnsToComplete; i++) {
                    this.progressMechanics.incrementTurns();
                }
            }

            return {
                success: true,
                message: interaction.message
            };
        } catch (error) {
            console.error('Error handling scene interaction:', error);
            return {
                success: false,
                message: this.gameText.get('error.generalError')
            };
        }
    }

    async checkRequiredFlags(flags: string[]): Promise<boolean> {
        try {
            return this.flagMechanics.checkFlags(flags);
        } catch (error) {
            console.error('Error checking required flags:', error);
            return false;
        }
    }
}

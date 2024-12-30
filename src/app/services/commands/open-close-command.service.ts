import { Injectable } from '@angular/core';
import { GameCommand, SceneObject } from '../../models/game-state.model';
import { BaseObjectCommandService } from './base-object-command.service';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { ContainerMechanicsService } from '../mechanics/container-mechanics.service';
import { StateMechanicsService } from '../mechanics/state-mechanics.service';
import { FlagMechanicsService } from '../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../mechanics/progress-mechanics.service';
import { LightMechanicsService } from '../mechanics/light-mechanics.service';
import { InventoryMechanicsService } from '../mechanics/inventory-mechanics.service';

@Injectable({
    providedIn: 'root'
})
export class OpenCloseCommandService extends BaseObjectCommandService {
    constructor(
        gameState: GameStateService,
        sceneService: SceneService,
        protected override stateMechanics: StateMechanicsService,
        protected override flagMechanics: FlagMechanicsService,
        protected override progress: ProgressMechanicsService,
        private containerMechanics: ContainerMechanicsService,
        private lightMechanics: LightMechanicsService,
        private inventoryMechanics: InventoryMechanicsService
    ) {
        super(gameState, sceneService, stateMechanics, flagMechanics, progress);
    }

    canHandle(command: GameCommand): boolean {
        return command.verb === 'open' || command.verb === 'close' || command.verb === 'shut';
    }

    async handle(command: GameCommand): Promise<{ success: boolean; message: string; incrementTurn: boolean }> {
        const result = await this.handleObjectCommand(command);
        if (!result.success) {
            return result;
        }

        const object = await this.findObject(command.object!);
        if (!object) {
            return {
                success: false,
                message: `You don't see any ${command.object} here.`,
                incrementTurn: false
            };
        }

        return this.handleInteraction(object, command);
    }

    protected async handleInteraction(object: SceneObject, command: GameCommand): Promise<{ success: boolean; message: string; incrementTurn: boolean }> {
        // Check if we can see what we're trying to interact with
        if (!this.lightMechanics.isLightPresent()) {
            return {
                success: false,
                message: `It's too dark to see what you're trying to ${command.verb}.`,
                incrementTurn: false
            };
        }

        const isOpenCommand = command.verb === 'open';
        const action = isOpenCommand ? 'open' : 'close';

        // Check if object can be opened/closed
        if (!object.isContainer && !object.interactions?.[action]) {
            return {
                success: false,
                message: `You can't ${action} the ${object.name}.`,
                incrementTurn: false
            };
        }

        // Check current state
        const isOpen = object.isOpen || false;
        if (isOpenCommand === isOpen) {
            return {
                success: false,
                message: `The ${object.name} is already ${isOpen ? 'open' : 'closed'}.`,
                incrementTurn: false
            };
        }

        // Check if it's locked (only for opening)
        if (isOpenCommand && object.isLocked) {
            const keyId = object.contents?.find(id => id.startsWith('key_'));
            if (keyId) {
                const hasKey = this.inventoryMechanics.hasItem(keyId);
                if (!hasKey) {
                    return {
                        success: false,
                        message: `The ${object.name} is locked.`,
                        incrementTurn: false
                    };
                }
                // Use the key automatically if we have it
                object.isLocked = false;
            } else {
                return {
                    success: false,
                    message: `The ${object.name} is locked.`,
                    incrementTurn: false
                };
            }
        }

        // Try state-based interaction first
        const stateResult = this.stateMechanics.handleInteraction(object, action);
        if (stateResult.success) {
            // Update container state if applicable
            if (object.isContainer) {
                object.isOpen = isOpenCommand;
                
                // Add contents description for opening
                if (isOpenCommand && object.contents && object.contents.length > 0) {
                    const contentsList = object.contents
                        .map(id => {
                            const item = this.findObject(id);
                            return item ? item.name : '';
                        })
                        .filter(Boolean)
                        .join(', ');
                    
                    return {
                        success: true,
                        message: `${stateResult.message}\nInside you see: ${contentsList}`,
                        incrementTurn: true
                    };
                }
            }
            return { ...stateResult, incrementTurn: true };
        }

        // Default container behavior
        if (object.isContainer) {
            object.isOpen = isOpenCommand;
            
            if (isOpenCommand) {
                if (object.contents && object.contents.length > 0) {
                    const contentsList = object.contents
                        .map(id => {
                            const item = this.findObject(id);
                            return item ? item.name : '';
                        })
                        .filter(Boolean)
                        .join(', ');
                    
                    return {
                        success: true,
                        message: `You open the ${object.name}.\nInside you see: ${contentsList}`,
                        incrementTurn: true
                    };
                }
                return {
                    success: true,
                    message: `You open the ${object.name}. It's empty.`,
                    incrementTurn: true
                };
            } else {
                return {
                    success: true,
                    message: `You close the ${object.name}.`,
                    incrementTurn: true
                };
            }
        }

        return {
            success: false,
            message: `You can't figure out how to ${action} the ${object.name}.`,
            incrementTurn: false
        };
    }
}

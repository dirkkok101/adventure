import { Injectable } from '@angular/core';
import { GameCommand, SceneObject } from '../../models/game-state.model';
import { BaseObjectCommandService } from './base-object-command.service';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { StateMechanicsService } from '../mechanics/state-mechanics.service';
import { LightMechanicsService } from '../mechanics/light-mechanics.service';
import { ContainerMechanicsService } from '../mechanics/container-mechanics.service';

@Injectable({
    providedIn: 'root'
})
export class LookCommandService extends BaseObjectCommandService {
    constructor(
        gameState: GameStateService,
        sceneService: SceneService,
        private stateMechanics: StateMechanicsService,
        private lightMechanics: LightMechanicsService,
        private containerMechanics: ContainerMechanicsService
    ) {
        super(gameState, sceneService);
    }

    canHandle(command: GameCommand): boolean {
        return command.verb === 'look' || command.verb === 'l';
    }

    async handle(command: GameCommand): Promise<{ success: boolean; message: string; incrementTurn: boolean }> {
        // If no object specified, describe the current scene
        if (!command.object) {
            const scene = this.sceneService.getCurrentScene();
            if (!scene) {
                return { 
                    success: false, 
                    message: 'Error: No current scene', 
                    incrementTurn: false 
                };
            }

            return {
                success: true,
                message: this.sceneService.getSceneDescription(scene),
                incrementTurn: true
            };
        }

        // If looking at something specific, use handleInteraction
        const object = await this.findObject(command.object);
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
        // Check light
        if (!this.lightMechanics.isLightPresent()) {
            return {
                success: false,
                message: 'It is too dark to see anything clearly.',
                incrementTurn: false
            };
        }

        // If it's a container, show contents
        if (object.isContainer) {
            const isOpen = this.containerMechanics.isOpen(object.id);
            const contents = isOpen ? this.containerMechanics.getContainerContents(object.id) : [];
            const contentsDesc = contents.length > 0 
                ? `\nIt contains: ${contents.map(id => {
                    const item = this.findObject(id);
                    return item ? item.name : '';
                  }).filter(Boolean).join(', ')}`
                : isOpen ? '\nIt is empty.' : '';

            const stateDesc = this.stateMechanics.getStateBasedDescription(object, object.descriptions.default);
            return {
                success: true,
                message: `${stateDesc}${contentsDesc}`,
                incrementTurn: true
            };
        }

        // Try state-based interaction first
        const stateResult = this.stateMechanics.handleInteraction(object, 'look');
        if (stateResult.success) {
            return { ...stateResult, incrementTurn: true };
        }

        // Default to basic description
        return {
            success: true,
            message: this.stateMechanics.getStateBasedDescription(object, object.descriptions.default),
            incrementTurn: true
        };
    }
}

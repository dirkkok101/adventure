import { Injectable } from '@angular/core';
import { GameCommand, SceneObject, CommandResponse } from '../../../models/game-state.model';
import { GameStateService } from '../../game-state.service';
import { SceneService } from '../../scene.service';

import { FlagMechanicsService } from '../../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../../mechanics/progress-mechanics.service';
import { LightMechanicsService } from '../../mechanics/light-mechanics.service';
import { InventoryMechanicsService } from '../../mechanics/inventory-mechanics.service';
import { ScoreMechanicsService } from '../../mechanics/score-mechanics.service';
import { ContainerMechanicsService } from '../../mechanics/container-mechanics.service';
import { BaseCommandService } from '../bases/base-command.service';

@Injectable({
    providedIn: 'root'
})
export class MoveObjectCommandService extends BaseCommandService {
    constructor(
        gameState: GameStateService,
        sceneService: SceneService,
        flagMechanics: FlagMechanicsService,
        progress: ProgressMechanicsService,
        lightMechanics: LightMechanicsService,
        inventoryMechanics: InventoryMechanicsService,
        scoreMechanics: ScoreMechanicsService,
        containerMechanics: ContainerMechanicsService
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
        return command.verb === 'move' && !!command.object;
    }

    async handle(command: GameCommand): Promise<CommandResponse> {
        if (!command.object) {
            return {
                success: false,
                message: "What do you want to move?",
                incrementTurn: false
            };
        }

        return this.handleObjectMovement(command.object);
    }

    protected async handleObjectMovement(objectName: string): Promise<CommandResponse> {
        const object = await this.findObject(objectName);
        if (!object) {
            return {
                success: false,
                message: `I don't see any ${objectName} here.`,
                incrementTurn: false
            };
        }

        if (!await this.checkVisibility(object)) {
            return {
                success: false,
                message: "It's too dark to see that.",
                incrementTurn: false
            };
        }

        if (!object.moveable) {
            return {
                success: false,
                message: `You can't move the ${object.name}.`,
                incrementTurn: false
            };
        }

        // Handle any special movement logic here
        if (object.onMove) {
            return {
                success: true,
                message: object.onMove,
                incrementTurn: true
            };
        }

        return {
            success: true,
            message: `You move the ${object.name}.`,
            incrementTurn: true
        };
    }

    override async getSuggestions(command: GameCommand): Promise<string[]> {
        if (!command.verb) {
            return ['move'];
        }

        if (command.verb === 'move' && !command.object) {
            const scene = this.sceneService.getCurrentScene();
            if (!scene?.objects || !this.checkLightInScene()) {
                return [];
            }

            return Object.values(scene.objects)
                .filter(obj => 
                    this.lightMechanics.isObjectVisible(obj) &&
                    obj.interactions?.['enter'])
                .map(obj => obj.name.toLowerCase());
        }

        return [];
    }
}

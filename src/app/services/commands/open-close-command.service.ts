import { Injectable } from '@angular/core';
import { GameCommand } from '../../models/game-state.model';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { ContainerMechanicsService } from '../mechanics/container-mechanics.service';
import { StateMechanicsService } from '../mechanics/state-mechanics.service';
import { FlagMechanicsService } from '../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../mechanics/progress-mechanics.service';
import { BaseObjectCommandService } from './base-object-command.service';

@Injectable({
    providedIn: 'root'
})
export class OpenCloseCommandService extends BaseObjectCommandService {
    constructor(
        gameState: GameStateService,
        sceneService: SceneService,
        stateMechanics: StateMechanicsService,
        flagMechanics: FlagMechanicsService,
        progress: ProgressMechanicsService,
        private containerMechanics: ContainerMechanicsService
    ) {
        super(gameState, sceneService, stateMechanics, flagMechanics, progress);
    }

    canHandle(command: GameCommand): boolean {
        return command.verb === 'open' || command.verb === 'close';
    }

    handle(command: GameCommand): { success: boolean; message: string; incrementTurn: boolean } {
        const result = this.handleObjectCommand(command);
        if (!result.success) {
            return result;
        }

        const object = this.findObject(command.object!);
        if (!object) {
            return {
                success: false,
                message: `You don't see any ${command.object} here.`,
                incrementTurn: false
            };
        }

        // Handle container operations
        if (command.verb === 'open') {
            const containerResult = this.containerMechanics.openContainer(object);
            if (containerResult.success) {
                return {
                    success: true,
                    message: containerResult.message,
                    incrementTurn: true
                };
            }
            return {
                success: false,
                message: containerResult.message,
                incrementTurn: false
            };
        } else {
            const containerResult = this.containerMechanics.closeContainer(object);
            if (containerResult.success) {
                return {
                    success: true,
                    message: containerResult.message,
                    incrementTurn: true
                };
            }
            return {
                success: false,
                message: containerResult.message,
                incrementTurn: false
            };
        }
    }
}

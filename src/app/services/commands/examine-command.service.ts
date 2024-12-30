import { Injectable } from '@angular/core';
import { GameCommand } from '../../models/game-state.model';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { StateMechanicsService } from '../mechanics/state-mechanics.service';
import { ContainerMechanicsService } from '../mechanics/container-mechanics.service';
import { FlagMechanicsService } from '../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../mechanics/progress-mechanics.service';
import { BaseObjectCommandService } from './base-object-command.service';

@Injectable({
    providedIn: 'root'
})
export class ExamineCommandService extends BaseObjectCommandService {
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
        return command.verb === 'examine' || 
               command.verb === 'x' ||
               command.verb === 'look at';
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
                message: 'You don\'t see that here.',
                incrementTurn: false
            };
        }

        // If it's a container, add contents description
        if (object.isContainer) {
            const contents = this.containerMechanics.getContainerContents(object.id);
            if (contents.length > 0) {
                const contentsList = contents
                    .map(id => {
                        const item = this.findObject(id);
                        return item ? item.name : '';
                    })
                    .filter(name => name)
                    .join(', ');
                return {
                    success: true,
                    message: `${result.message}\n${object.descriptions.contents}\n${contentsList}`,
                    incrementTurn: true
                };
            } else {
                return {
                    success: true,
                    message: `${result.message}\n${object.descriptions.empty}`,
                    incrementTurn: true
                };
            }
        }

        return result;
    }
}

import { Injectable } from '@angular/core';
import { CommandHandler } from './command-handler.interface';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { BaseObjectCommandService } from './base-object-command.service';

@Injectable({
    providedIn: 'root'
})
export class MoveCommandService extends BaseObjectCommandService implements CommandHandler {
    constructor(
        gameState: GameStateService,
        sceneService: SceneService
    ) {
        super(gameState, sceneService);
    }

    canHandle(command: string): boolean {
        return command.toLowerCase().startsWith('move ');
    }

    async handle(command: string): Promise<string> {
        const objectName = command.toLowerCase().replace('move ', '').trim();
        return this.handleObjectCommand(objectName, 'move');
    }
}

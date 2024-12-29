import { Injectable } from '@angular/core';
import { Command } from '../../models/command.model';
import { GameStateService } from '../game-state.service';
import { CommandHandler } from './command-handler.interface';

@Injectable({
    providedIn: 'root'
})
export class InventoryCommandService implements CommandHandler {
    constructor(private gameState: GameStateService) {}

    canHandle(command: Command): boolean {
        return command.verb === 'inventory' || command.verb === 'i';
    }

    processCommand(command: Command): string {
        const state = this.gameState.getCurrentState();
        const items = Object.entries(state.inventory)
            .filter(([_, value]) => value)
            .map(([key, _]) => key);

        if (items.length === 0) {
            return "You are not carrying anything.";
        }

        return "You are carrying:\n" + items.join('\n');
    }
}

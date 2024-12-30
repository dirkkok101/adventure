import { Injectable } from '@angular/core';
import { GameCommand } from '../../models/game-state.model';
import { MovementCommandService } from './movement-command.service';
import { InventoryCommandService } from './inventory-command.service';
import { DropCommandService } from './drop-command.service';
import { LookCommandService } from './look-command.service';
import { GameStateService } from '../game-state.service';
import { GameTextService } from '../game-text.service';
import { ProgressMechanicsService } from '../mechanics/progress-mechanics.service';

const DIRECTION_ALIASES: { [key: string]: string } = {
    'n': 'north',
    's': 'south',
    'e': 'east',
    'w': 'west',
    'u': 'up',
    'd': 'down'
};

const DIRECTIONS = new Set([
    'north', 'south', 'east', 'west', 'up', 'down',
    'n', 's', 'e', 'w', 'u', 'd'
]);

@Injectable({
    providedIn: 'root'
})
export class CommandService {
    constructor(
        private movementCommand: MovementCommandService,
        private inventoryCommand: InventoryCommandService,
        private dropCommand: DropCommandService,
        private lookCommand: LookCommandService,
        private gameText: GameTextService,
        private progress: ProgressMechanicsService
    ) {}

    processInput(input: string): { success: boolean; message?: string; incrementTurn: boolean } {
        const command = this.parseCommand(input.toLowerCase());
        if (!command) {
            return { success: false, message: "I don't understand that command.", incrementTurn: false };
        }

        // Handle movement commands
        if (DIRECTIONS.has(command.verb)) {
            command.verb = DIRECTION_ALIASES[command.verb] || command.verb;
            return this.movementCommand.handle(command);
        }

        // Handle inventory commands
        if (command.verb === 'inventory' || command.verb === 'i') {
            return this.inventoryCommand.handle(command);
        }

        // Handle drop commands
        if (command.verb === 'drop') {
            return this.dropCommand.handle(command);
        }

        // Handle look commands
        if (command.verb === 'look' || command.verb === 'l') {
            return this.lookCommand.handle(command);
        }

        return { success: false, message: "I don't understand that command.", incrementTurn: false };
    }

    private parseCommand(input: string): GameCommand | null {
        const words = input.trim().toLowerCase().split(/\s+/);
        if (words.length === 0) return null;

        const command: GameCommand = {
            verb: words[0],
            originalInput: input
        };

        // Handle single word commands
        if (words.length === 1) {
            return command;
        }

        // Handle two word commands (verb + object)
        if (words.length === 2) {
            command.object = words[1];
            return command;
        }

        // Handle commands with prepositions
        const prepositions = ['in', 'on', 'at', 'to', 'with', 'under', 'behind'];
        const prepIndex = words.findIndex((word, index) => index > 0 && prepositions.includes(word));

        if (prepIndex !== -1) {
            command.object = words.slice(1, prepIndex).join(' ');
            command.preposition = words[prepIndex];
            command.indirect = words.slice(prepIndex + 1).join(' ');
        } else {
            command.object = words.slice(1).join(' ');
        }

        return command;
    }
}

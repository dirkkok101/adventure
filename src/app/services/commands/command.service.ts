import { Injectable } from '@angular/core';
import { Command } from '../../models/command.model';
import { CommandHandler } from './command-handler.interface';
import { LookCommandService } from './look-command.service';
import { ExamineCommandService } from './examine-command.service';
import { InventoryCommandService } from './inventory-command.service';
import { MovementCommandService } from './movement-command.service';
import { TakeCommandService } from './take-command.service';
import { OpenCloseCommandService } from './open-close-command.service';
import { ReadCommandService } from './read-command.service';
import { EnterCommandService } from './enter-command.service';
import { GameStateService } from '../game-state.service';

@Injectable({
    providedIn: 'root'
})
export class CommandService {
    private readonly verbHandlers = new Map<string[], CommandHandler>();

    constructor(
        private lookCommand: LookCommandService,
        private examineCommand: ExamineCommandService,
        private inventoryCommand: InventoryCommandService,
        private movementCommand: MovementCommandService,
        private takeCommand: TakeCommandService,
        private openCloseCommand: OpenCloseCommandService,
        private readCommand: ReadCommandService,
        private enterCommand: EnterCommandService,
        private gameState: GameStateService
    ) {
        this.initializeHandlers();
    }

    private initializeHandlers(): void {
        // Navigation commands
        this.verbHandlers.set(['look', 'l'], this.lookCommand);
        this.verbHandlers.set(['examine', 'x'], this.examineCommand);
        this.verbHandlers.set(['inventory', 'i', 'inv'], this.inventoryCommand);
        this.verbHandlers.set(['north', 'n', 'south', 's', 'east', 'e', 'west', 'w'], this.movementCommand);

        // Object interaction commands
        this.verbHandlers.set(['take', 'get', 'pick'], this.takeCommand);
        this.verbHandlers.set(['open', 'unlock'], this.openCloseCommand);
        this.verbHandlers.set(['close', 'shut'], this.openCloseCommand);
        this.verbHandlers.set(['read'], this.readCommand);
        this.verbHandlers.set(['enter', 'go'], this.enterCommand);
    }

    processInput(input: string): string {
        const command = this.parseCommand(input);
        return this.processCommand(command);
    }

    processCommand(input: Command | string): string {
        const command = typeof input === 'string' ? this.parseCommand(input) : input;
        
        // Increment move counter
        this.gameState.incrementMoves();

        // Find handler for the verb
        for (const [verbs, handler] of this.verbHandlers.entries()) {
            if (verbs.includes(command.verb.toLowerCase())) {
                return handler.processCommand(command);
            }
        }

        return "I don't understand that command.";
    }

    private parseCommand(input: string): Command {
        const words = input.toLowerCase().trim().split(/\s+/);
        const command: Command = {
            verb: words[0],
            originalInput: input
        };

        if (words.length > 1) {
            command.object = words[1];
        }

        if (words.length > 2) {
            if (words[2] === 'with' || words[2] === 'in' || words[2] === 'on' || words[2] === 'to') {
                command.preposition = words[2];
                if (words.length > 3) {
                    command.target = words[3];
                }
            } else {
                command.target = words[2];
            }
        }

        return command;
    }
}

import { Injectable } from '@angular/core';
import { Command } from '../../models/command.model';
import { GameStateService } from '../game-state.service';
import { ParserService } from '../parser.service';
import { LookCommandService } from './look-command.service';
import { ExamineCommandService } from './examine-command.service';
import { InventoryCommandService } from './inventory-command.service';
import { MovementCommandService } from './movement-command.service';
import { InteractionCommandService } from './interaction-command.service';

@Injectable({
    providedIn: 'root'
})
export class CommandService {
    private readonly commandHandlers;

    constructor(
        private gameState: GameStateService,
        private parser: ParserService,
        private lookCommand: LookCommandService,
        private examineCommand: ExamineCommandService,
        private inventoryCommand: InventoryCommandService,
        private movementCommand: MovementCommandService,
        private interactionCommand: InteractionCommandService
    ) {
        this.commandHandlers = [
            this.lookCommand,
            this.examineCommand,
            this.inventoryCommand,
            this.movementCommand,
            this.interactionCommand
        ];
    }

    processInput(input: string): string {
        console.log('\n=== Command Processing ===');
        console.log('Input:', input);
        const command = this.parser.parseCommand(input);
        console.log('Parsed:', command);

        const response = this.executeCommand(command);
        console.log('\nCommand Result:', response);

        return response;
    }

    private executeCommand(command: Command): string {
        console.log('\n=== Command Execution ===');
        console.log('Command:', command);

        // Increment moves counter
        this.gameState.incrementMoves();

        // Find the appropriate handler
        const handler = this.commandHandlers.find(h => h.canHandle(command));
        if (!handler) {
            return `I don't understand how to ${command.verb}.`;
        }

        // Execute the command
        return handler.handle(command);
    }
}

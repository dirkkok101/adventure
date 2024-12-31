import { Injectable } from '@angular/core';
import { GameCommand } from '../../models/game-state.model';
import { MovementCommandService } from './navigation-commands/movement-command.service';
import { InventoryCommandService } from './container-commands/inventory-command.service';
import { DropObjectCommandService } from './object-commands/drop-object-command.service';
import { LookCommandService } from './vision-commands/look-command.service';
import { ExamineCommandService } from './vision-commands/examine-command.service';
import { OpenCloseContainerCommandService } from './container-commands/open-close-container-command.service';
import { TakeObjectCommandService } from './object-commands/take-object-command.service';
import { PutCommandService } from './container-commands/put-command.service';
import { ReadObjectCommandService } from './object-commands/read-object-command.service';
import { TurnLightSourceOnOffCommandService } from './light-source-commands/turn-light-source-on-off-command.service';
import { ClimbCommandService } from './navigation-commands/climb-command.service';
import { GameTextService } from '../game-text.service';

interface CommandHandler {
    canHandle(command: GameCommand): boolean;
    handle(command: GameCommand): Promise<{ success: boolean; message: string; incrementTurn: boolean }>;
    getSuggestions?(command: GameCommand): Promise<string[]> | string[];
}

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

const VERB_ALIASES: { [key: string]: string } = {
    'l': 'look',
    'i': 'inventory',
    'x': 'examine',
    'get': 'take',
    'grab': 'take',
    'place': 'put',
    'check': 'examine',
    'go': 'enter'
};

@Injectable({
    providedIn: 'root'
})
export class CommandService {
    private commandHandlers: CommandHandler[];

    constructor(
        private movement: MovementCommandService,
        private inventory: InventoryCommandService,
        private drop: DropObjectCommandService,
        private look: LookCommandService,
        private examine: ExamineCommandService,
        private openClose: OpenCloseContainerCommandService,
        private take: TakeObjectCommandService,
        private put: PutCommandService,
        private read: ReadObjectCommandService,
        private turn: TurnLightSourceOnOffCommandService,
        private climb: ClimbCommandService,
        private gameText: GameTextService,
    ) {
        console.log('CommandService constructor - injected services:', {
            movement, inventory, drop, look, examine, openClose, take, put, read, turn, climb
        });

        // Only add handlers that implement the CommandHandler interface
        this.commandHandlers = [
            movement,
            inventory,
            drop,
            look,
            examine,
            openClose,
            take,
            put,
            read,
            turn,
            climb
        ].filter(handler => 
            typeof handler.canHandle === 'function' && 
            typeof handler.handle === 'function'
        );
        
        console.log('Registered command handlers:', 
            this.commandHandlers.map(h => ({
                name: h.constructor.name,
                hasCanHandle: typeof h.canHandle === 'function',
                hasHandle: typeof h.handle === 'function',
                hasGetSuggestions: typeof h.getSuggestions === 'function'
            }))
        );
    }

    async processInput(input: string): Promise<{ success: boolean; message?: string; incrementTurn: boolean }> {
        const command = this.parseCommand(input.toLowerCase());
        if (!command) {
            return { 
                success: false, 
                message: "I don't understand that command.", 
                incrementTurn: false 
            };
        }

        // Resolve verb aliases
        command.verb = VERB_ALIASES[command.verb] || command.verb;

        // Handle movement commands
        if (DIRECTIONS.has(command.verb)) {
            command.verb = DIRECTION_ALIASES[command.verb] || command.verb;
            return this.movement.handle(command);
        }

        // Find appropriate command handler
        for (const handler of this.commandHandlers) {
            if (handler.canHandle(command)) {
                try {
                    const result = await handler.handle(command);
                    return result;
                } catch (error) {
                    console.error('Error handling command:', error);
                    return {
                        success: false,
                        message: "Something went wrong processing that command.",
                        incrementTurn: false
                    };
                }
            }
        }

        return {
            success: false,
            message: "I don't know how to do that.",
            incrementTurn: false
        };
    }

    parseCommand(input: string): GameCommand | null {
        console.log('CommandService.parseCommand called with:', input);
        if (!input) return null;

        const parts = input.toLowerCase().trim().split(/\s+/);
        let verb = parts[0];
        
        // Check for direction shortcuts
        if (DIRECTIONS.has(verb)) {
            console.log('Found direction shortcut:', verb);
            verb = 'go';
        } else {
            // Check verb aliases
            const aliasedVerb = VERB_ALIASES[verb];
            console.log('Checking verb alias:', verb, '->', aliasedVerb);
            verb = aliasedVerb || verb;
        }
        
        const command: GameCommand = {
            verb,
            object: parts.slice(1).join(' '),
            originalInput: input
        };
        console.log('Parsed command:', command);
        return command;
    }

    async getSuggestions(input: string): Promise<string[]> {
        console.log('CommandService.getSuggestions called with:', input);
        const command = this.parseCommand(input.toLowerCase());
        console.log('Parsed command:', command);
        if (!command) {
            console.log('No command parsed, returning empty suggestions');
            return [];
        }

        const suggestions: string[] = [];

        // Add basic verb suggestions if no verb or very short input
        if (!command.object && (!command.verb || input.length <= 2)) {
            console.log('Adding basic verb suggestions');
            suggestions.push(...Object.keys(VERB_ALIASES));
            suggestions.push(...DIRECTIONS);
        }

        // Add context-specific suggestions from handlers
        console.log('Getting suggestions from handlers for command:', command);
        const handlerSuggestions = await Promise.all(
            this.commandHandlers
                .filter(handler => {
                    console.log('Checking if handler has getSuggestions:', handler.constructor.name, !!handler.getSuggestions);
                    return handler.getSuggestions;
                })
                .filter(handler => {
                    const canHandle = handler.canHandle(command);
                    console.log('Checking if handler can handle command:', handler.constructor.name, canHandle);
                    return canHandle;
                })
                .map(async handler => {
                    try {
                        console.log('Getting suggestions from handler:', handler.constructor.name);
                        const result = await handler.getSuggestions!(command);
                        console.log('Handler suggestions:', handler.constructor.name, result);
                        return result;
                    } catch (error) {
                        console.error('Error getting suggestions:', error);
                        return [];
                    }
                })
        );

        // Flatten all suggestions into a single array
        console.log('Flattening handler suggestions:', handlerSuggestions);
        suggestions.push(...handlerSuggestions.flat());

        // Filter suggestions to match input
        const filteredSuggestions = [...new Set(suggestions)]
            .filter(s => s.toLowerCase().startsWith(input.toLowerCase()))
            .sort();
        console.log('Final suggestions:', filteredSuggestions);
        return filteredSuggestions;
    }
}

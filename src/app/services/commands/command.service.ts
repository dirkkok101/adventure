import { Injectable } from '@angular/core';
import { GameCommand } from '../../models/game-state.model';
import { MovementCommandService } from './movement-command.service';
import { InventoryCommandService } from './inventory-command.service';
import { DropCommandService } from './drop-command.service';
import { LookCommandService } from './look-command.service';
import { ExamineCommandService } from './examine-command.service';
import { OpenCloseCommandService } from './open-close-command.service';
import { TakeCommandService } from './take-command.service';
import { PutCommandService } from './put-command.service';
import { ReadCommandService } from './read-command.service';
import { TurnCommandService } from './turn-command.service';
import { ClimbCommandService } from './climb-command.service';
import { GameTextService } from '../game-text.service';
import { ProgressMechanicsService } from '../mechanics/progress-mechanics.service';

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
    'read': 'examine',
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
        private drop: DropCommandService,
        private look: LookCommandService,
        private examine: ExamineCommandService,
        private openClose: OpenCloseCommandService,
        private take: TakeCommandService,
        private put: PutCommandService,
        private read: ReadCommandService,
        private turn: TurnCommandService,
        private climb: ClimbCommandService,
        private gameText: GameTextService,
        private progress: ProgressMechanicsService
    ) {
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
                    if (result.incrementTurn) {
                        this.progress.incrementTurns();
                    }
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
        if (!input) return null;

        const words = input.trim().toLowerCase().split(/\s+/);
        if (words.length === 0) return null;

        const verb = words[0];
        let object: string | undefined;
        let preposition: string | undefined;
        let indirect: string | undefined;

        // Handle single word commands (look, inventory, etc.)
        if (words.length === 1) {
            return { verb, originalInput: input };
        }

        // Handle direction aliases
        if (DIRECTIONS.has(verb)) {
            return { verb, originalInput: input };
        }

        // Look for prepositions
        const prepositions = ['in', 'on', 'at', 'to', 'with', 'under', 'behind', 'through'];
        const prepIndex = words.findIndex((word, index) => index > 0 && prepositions.includes(word));

        if (prepIndex !== -1) {
            // Words between verb and preposition form the object
            object = words.slice(1, prepIndex).join(' ');
            preposition = words[prepIndex];
            // Words after preposition form the indirect object
            if (prepIndex < words.length - 1) {
                indirect = words.slice(prepIndex + 1).join(' ');
            }
        } else {
            // No preposition found, all words after verb form the object
            object = words.slice(1).join(' ');
        }

        return {
            verb,
            object,
            preposition,
            indirect,
            originalInput: input
        };
    }

    async getSuggestions(input: string): Promise<string[]> {
        const command = this.parseCommand(input.toLowerCase());
        if (!command) {
            return [];
        }

        const suggestions: string[] = [];

        // Add basic verb suggestions if no verb or very short input
        if (!command.object && (!command.verb || input.length <= 2)) {
            suggestions.push(...Object.keys(VERB_ALIASES));
            suggestions.push(...DIRECTIONS);
        }

        // Add context-specific suggestions from handlers
        const handlerSuggestions = await Promise.all(
            this.commandHandlers
                .filter(handler => handler.getSuggestions)
                .map(async handler => {
                    try {
                        const result = await handler.getSuggestions!(command);
                        return result;
                    } catch (error) {
                        console.error('Error getting suggestions:', error);
                        return [];
                    }
                })
        );

        // Flatten all suggestions into a single array
        suggestions.push(...handlerSuggestions.flat());

        // Filter suggestions to match input
        return [...new Set(suggestions)]
            .filter(s => s.toLowerCase().startsWith(input.toLowerCase()))
            .sort();
    }
}

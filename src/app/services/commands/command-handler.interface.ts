import { Command } from '../../models/command.model';

export interface CommandHandler {
    processCommand(command: Command): string;
}

import { Command } from '../../models/command.model';

export interface CommandHandler {
    canHandle(command: Command): boolean;
    handle(command: Command): string;
}

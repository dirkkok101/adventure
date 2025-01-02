import { GameCommand, CommandResponse } from "../../models";

export interface ICommandService {
    canHandle(command: GameCommand): boolean;
    handle(command: GameCommand): CommandResponse;
    getSuggestions(command: GameCommand): string[];
}



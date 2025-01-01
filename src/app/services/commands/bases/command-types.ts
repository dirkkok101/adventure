import { GameCommand, CommandResponse, SceneObject } from "../../../models";

export interface ICommandService {
    canHandle(command: GameCommand): boolean;
    handle(command: GameCommand): Promise<CommandResponse>;
    getSuggestions(command: GameCommand): Promise<string[]>;
}

export interface ScoringOptions {
    action: string;
    object: SceneObject;
    container?: SceneObject;
    skipGeneralScore?: boolean;
}

export type ErrorResponse = Omit<CommandResponse, 'success'> & { success: false };
export type SuccessResponse = Omit<CommandResponse, 'success'> & { success: true };

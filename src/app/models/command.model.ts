export interface Command {
    verb: string;
    object?: string;
    target?: string;
    preposition?: string;
    originalInput: string;
}

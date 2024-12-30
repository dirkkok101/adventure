export interface CommandHandler {
    canHandle(command: string): boolean;
    handle(command: string): string;
}

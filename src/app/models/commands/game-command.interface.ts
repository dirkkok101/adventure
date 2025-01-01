/**
 * Represents a parsed player command.
 * Commands are the primary way players interact with the game,
 * following a verb-object-target structure.
 * 
 * @interface GameCommand
 * 
 * Command Structure:
 * - Simple: "take sword" (verb + object)
 * - Complex: "put sword in chest" (verb + object + preposition + indirect)
 * - Meta: "save game" (verb only)
 * 
 * Usage:
 * - Parse player input
 * - Route to command handlers
 * - Track command history
 * - Implement game actions
 */
export interface GameCommand {
    /** Action to perform (e.g., "take", "drop") */
    verb: string;
    
    /** Primary object of command */
    object?: string;
    
    /** Secondary target of command */
    target?: string;
    
    /** Connecting word (e.g., "in", "on") */
    preposition?: string;
    
    /** Raw player input */
    originalInput: string;
    
    /** Indirect object for complex commands */
    indirect?: string;
}

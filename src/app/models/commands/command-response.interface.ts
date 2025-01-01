/**
 * Represents the result of executing a game command.
 * Provides feedback about command execution and controls
 * game progression.
 * 
 * @interface CommandResponse
 * 
 * Key Features:
 * - Success/failure indication
 * - Feedback message
 * - Turn progression control
 * 
 * Usage:
 * - Provide player feedback
 * - Control game flow
 * - Track valid actions
 * - Handle command results
 */
export interface CommandResponse {
    /** Whether command was successful */
    success: boolean;
    
    /** Feedback message to display */
    message: string;
    
    /** Whether to count as a turn */
    incrementTurn: boolean;
}

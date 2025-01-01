/**
 * Represents a game interaction with associated effects.
 * Interactions are triggered by player actions and can modify
 * game state in various ways.
 * 
 * @interface SceneInteraction
 * 
 * Key Features:
 * - Conditional execution
 * - State modification
 * - Inventory management
 * - Container manipulation
 * - Time-based effects
 * 
 * Usage:
 * - Define action responses
 * - Create puzzle solutions
 * - Manage game progression
 * - Handle special cases
 */
export interface SceneInteraction {
    /** Message to display */
    message: string;
    
    /** State-specific messages */
    states?: { [key: string]: string };
    
    /** Flags required for interaction */
    requiredFlags?: string[];
    
    /** Flags to set when successful */
    grantsFlags?: string[];
    
    /** Flags to remove when successful */
    removesFlags?: string[];
    
    /** Message when requirements not met */
    failureMessage?: string;
    
    /** Objects to make visible */
    revealsObjects?: string[];
    
    /** Points awarded for interaction */
    score?: number;
    
    /** Items to give player */
    addToInventory?: string[];
    
    /** Items to take from player */
    removeFromInventory?: string[];
    
    /** Items to add to containers */
    addToContainer?: {
        containerId: string;
        itemIds: string[];
    };
    
    /** Items to remove from containers */
    removeFromContainer?: {
        containerId: string;
        itemIds: string[];
    };
    
    /** Turns to complete action */
    turnsToComplete?: number;
    
    /** Whether action needs light */
    requiresLight?: boolean;
    
    /** Whether action provides light */
    providesLight?: boolean;
}

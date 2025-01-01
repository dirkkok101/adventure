import { SceneObject } from '../game-state/scene-object.interface';

/**
 * Configuration for scoring game actions.
 * Defines the context and parameters for awarding points.
 * 
 * @interface ScoringOptions
 * 
 * Key Features:
 * - Action type specification
 * - Object context
 * - Container interaction tracking
 * - Rule override options
 * 
 * Usage:
 * - Configure score awards
 * - Track action context
 * - Handle special cases
 * - Customize scoring rules
 */
export interface ScoringOptions {
    /** Type of action performed */
    action: string;
    
    /** Object being acted upon */
    object: SceneObject;
    
    /** Container involved in action */
    container?: SceneObject;
    
    /** Skip standard scoring rules */
    skipGeneralRules?: boolean;
}

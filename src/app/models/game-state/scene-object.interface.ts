import { SceneInteraction } from './scene-interaction.interface';

/**
 * Represents an interactive object within a scene.
 * Objects are the primary elements players can interact with,
 * supporting various states and behaviors.
 * 
 * @interface SceneObject
 * 
 * Key Features:
 * - Multiple description states
 * - Container functionality
 * - Scoring opportunities
 * - Conditional visibility
 * - Custom interactions
 * 
 * Usage:
 * - Define interactive items
 * - Create containers/doors
 * - Implement puzzles
 * - Track object state
 */
export interface SceneObject {
    /** Unique identifier for the object */
    id: string;
    
    /** Display name of the object */
    name: string;
    
    /** Object descriptions for different states */
    descriptions: {
        /** Default object description */
        default: string;
        /** Description when container is empty */
        empty?: string;
        /** How to describe container contents */
        contents?: string;
        /** Detailed examination description */
        examine?: string;
        /** State-specific descriptions */
        states?: { [key: string]: string };
    };
    
    /** Whether object is visible without interaction */
    visibleOnEntry?: boolean;
    
    /** Whether object can be taken */
    canTake?: boolean;
    
    /** Whether object can be used */
    usable?: boolean;
    
    /** Whether object can be moved */
    moveable?: boolean;
    
    /** Message when moving object */
    onMove?: string;
    
    /** Object weight for inventory */
    weight?: number;
    
    /** Whether object is a container */
    isContainer?: boolean;
    
    /** Whether container is open */
    isOpen?: boolean;
    
    /** Whether container is locked */
    isLocked?: boolean;
    
    /** Maximum items container can hold */
    capacity?: number;
    
    /** IDs of objects in container */
    contents?: string[];
    
    /** Whether object is a treasure */
    isTreasure?: boolean;
    
    /** Whether object provides light when on */
    providesLight?: boolean;
    
    /** Whether object needs light to use */
    requiresLight?: boolean;
    
    /** Custom interaction handlers */
    interactions?: { [key: string]: SceneInteraction };
    
    /** Scoring opportunities */
    scoring?: {
        /** Points for dropping in right place */
        drop?: number;
        /** Points for taking object */
        take?: number;
        /** Points for using object */
        use?: number;
        /** Points for opening object */
        open?: number;
        /** Points for closing object */
        close?: number;
        /** Points for examining object */
        examine?: number;
        /** Points for placing in specific containers */
        containerTargets?: {
            [containerId: string]: number;
        };
    };
}

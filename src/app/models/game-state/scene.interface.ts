import { SceneObject } from './scene-object.interface';
import { SceneExit } from './scene-exit.interface';
import { SceneInteraction } from './scene-interaction.interface';

/**
 * Represents a location in the game world.
 * Scenes are the fundamental building blocks of the game world,
 * containing descriptions, objects, exits, and interaction logic.
 * 
 * @interface Scene
 * 
 * Key Features:
 * - Multiple description states
 * - Dynamic object visibility
 * - Conditional exits
 * - Entry/exit triggers
 * - Environmental states (light, water)
 * 
 * Usage:
 * - Defines game world structure
 * - Controls player movement
 * - Manages object contexts
 * - Handles scene-specific logic
 */
export interface Scene {
    /** Unique identifier for the scene */
    id: string;
    
    /** Display name of the scene */
    name: string;
    
    /** Region/area the scene belongs to */
    region: string;
    
    /** Whether scene has natural light */
    light?: boolean;
    
    /** Whether scene has been visited */
    visited?: boolean;
    
    /** Scene descriptions for different states */
    descriptions: {
        /** Default scene description */
        default: string;
        /** Description when dark */
        dark?: string;
        /** Description after first visit */
        visited?: string;
        /** State-specific descriptions */
        states?: { [key: string]: string };
        /** Description when underwater */
        underwater?: string;
        /** Description when flooded */
        flooded?: string;
    };
    
    /** Map of objects in the scene */
    objects?: { [key: string]: SceneObject };
    
    /** Available exits from the scene */
    exits?: SceneExit[];
    
    /** Triggered when entering scene */
    onEnter?: SceneInteraction;
    
    /** Triggered when leaving scene */
    onExit?: SceneInteraction;
}

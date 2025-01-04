import { Scene } from "..";

/**
 * Represents the complete state of the game at any point in time.
 * This is the root state object that gets persisted and restored.
 *
 * @interface GameState
 *
 * State Categories:
 * - Core Game State: currentScene, score, moves, etc.
 * - Player State: inventory, knownObjects
 * - Progress State: flags, trophies
 * - Scene State: per-scene object and exit states
 * - Object State: structured data for objects
 *
 * Usage:
 * - Saved/loaded for game persistence
 * - Updated by game mechanics services
 * - Used to track all game progressMechanicsService
 * - Referenced for game state queries
 */
export interface GameState {
    /** Current scene ID the player is in */
    currentScene: string;

    /** Player's inventory as object ID map */
    inventory: { [key: string]: boolean };

    /** Game state flags for tracking progressMechanicsService */
    flags: { [key: string]: boolean };

    /** Current game score */
    score: number;

    /** Number of valid moves made */
    moves: number;

    /** Whether the game has ended in failure */
    gameOver: boolean;

    /** Whether the game has been won */
    gameWon: boolean;

    /** Maximum possible score in the game */
    maxScore: number;

    /** Number of turns taken (for time-based events) */
    turns: number;

    /** List of earned trophy/achievement IDs */
    trophies: string[];

    /** Per-scene state tracking */
    sceneState: {
        [sceneId: string]: Scene 
    };
}

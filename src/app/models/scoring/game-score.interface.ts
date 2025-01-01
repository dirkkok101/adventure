/**
 * Represents the current scoring state of the game.
 * Tracks player progress through score and achievements.
 * 
 * @interface GameScore
 * 
 * Key Features:
 * - Point tracking
 * - Maximum score reference
 * - Achievement tracking
 * 
 * Usage:
 * - Track game progress
 * - Display score updates
 * - Monitor achievements
 * - Calculate completion
 */
export interface GameScore {
    /** Current score achieved by player */
    score: number;
    
    /** Maximum possible score in game */
    maxScore: number;
    
    /** List of earned trophy IDs */
    trophies: string[];
}

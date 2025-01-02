/**
 * Represents a connection between scenes.
 * Exits control player movement between scenes and can have
 * various states and conditions.
 *
 * @interface SceneExit
 *
 * Key Features:
 * - Conditional accessibility
 * - State tracking (open/closed)
 * - Custom messages
 * - Scoring opportunities
 * - One-way options
 *
 * Usage:
 * - Define scene connections
 * - Create doors/barriers
 * - Implement progression gates
 * - Track discovery progressMechanicsService
 */
export interface SceneExit {
    /** Direction or name of the exit */
    direction: string;

    /** ID of scene this leads to */
    targetScene: string;

    /** Exit description */
    description: string;

    /** Flags required to use exit */
    requiredFlags?: string[];

    /** Message when requirements not met */
    failureMessage?: string;

    /** Points for discovering new area */
    score?: number;

    /** Whether return journey is possible */
    oneWay?: boolean;

    /** Whether exit can be opened/closed */
    isOpenable?: boolean;

    /** Whether exit is currently open */
    isOpen?: boolean;

    /** Whether exit is locked */
    isLocked?: boolean;

    /** Whether exit needs light to use */
    requiresLight?: boolean;

    /** Message when opening exit */
    openMessage?: string;

    /** Message when closing exit */
    closeMessage?: string;

    /** Message when fail to open */
    failedOpenMessage?: string;

    /** Message when fail to close */
    failedCloseMessage?: string;

    /** Scoring opportunities */
    scoring?: {
        /** Points for opening exit */
        open?: number;
        /** Points for closing exit */
        close?: number;
    };
}

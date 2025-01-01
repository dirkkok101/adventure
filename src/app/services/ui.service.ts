import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SceneMechanicsService } from './mechanics/scene-mechanics.service';
import { GameStateService } from './game-state.service';
import { CommandService } from './commands/command.service';

/**
 * Interface for sidebar state information
 */
interface SidebarState {
    commands: string;
    objects: string;
    score: number;
    moves: number;
    exits: string;
}

/**
 * Service responsible for managing the game's user interface state.
 * Handles game text output and sidebar information updates.
 * 
 * Key responsibilities:
 * - Manage game text display and history
 * - Update sidebar information (commands, objects, score, etc.)
 * - Handle text formatting and organization
 * - Provide reactive UI state updates
 */
@Injectable({
    providedIn: 'root'
})
export class UIService {
    private gameTextSubject = new BehaviorSubject<string[]>([]);
    /** Observable stream of game text updates */
    gameText$ = this.gameTextSubject.asObservable();

    private sidebarSubject = new BehaviorSubject<SidebarState>({
        commands: '',
        objects: '',
        score: 0,
        moves: 0,
        exits: ''
    });
    /** Observable stream of sidebar state updates */
    sidebar$ = this.sidebarSubject.asObservable();

    constructor(
        private sceneService: SceneMechanicsService,
        private gameState: GameStateService,
        private commandService: CommandService
    ) {}

    /**
     * Append new text to the game output
     * Splits text on newlines to maintain proper formatting
     * @param text Text to append to game output
     */
    appendToGameText(text: string): void {
        const currentText = this.gameTextSubject.value;
        const newLines = text.split('\n');
        this.gameTextSubject.next([...currentText, ...newLines]);
    }

    /**
     * Clear all game text from the display
     */
    clearGameText(): void {
        this.gameTextSubject.next([]);
    }

    /**
     * Update the sidebar information based on current game state
     * Includes:
     * - Available commands
     * - Known objects in the scene
     * - Current score and moves
     * - Available exits
     * 
     * Filters objects and exits based on game state and visibility
     */
    updateSidebar(): void {
        const scene = this.sceneService.getCurrentScene();
        const state = this.gameState.getCurrentState();

        if (!scene) {
            console.error('No current scene found');
            return;
        }

        // Get known objects
        const knownObjects = Array.from(state.knownObjects)
            .map(id => {
                const obj = scene.objects?.[id];
                return obj ? obj.name : null;
            })
            .filter(name => name !== null)
            .sort()
            .join('\n');

        // Get available exits
        const exits = (scene.exits ?? [])
            .map(exit => {
                if (exit.requiredFlags && 
                    !exit.requiredFlags.every(flag => state.flags[flag])) {
                    return null;
                }
                return exit.direction.charAt(0).toUpperCase() + exit.direction.slice(1);
            })
            .filter((exit): exit is string => exit !== null)
            .join('\n');

        // Get basic commands
        const basicCommands = [
            'Look (l)',
            'Examine (x) [object]',
            'Inventory (i)',
            'Take/Get [object]',
            'Drop [object]',
            'Open [object]',
            'Close [object]',
            'Read [object]',
            'Enter [object/direction]',
            'Go [direction]'
        ].join('\n');

        this.sidebarSubject.next({
            commands: basicCommands,
            objects: knownObjects || 'No known objects',
            score: state.score,
            moves: state.moves,
            exits: exits || 'No visible exits',
        });
    }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SceneService } from './scene.service';
import { GameStateService } from './game-state.service';
import { CommandService } from './commands/command.service';

@Injectable({
    providedIn: 'root'
})
export class UIService {
    private gameTextSubject = new BehaviorSubject<string[]>([]);
    gameText$ = this.gameTextSubject.asObservable();

    private sidebarSubject = new BehaviorSubject<{
        commands: string;
        objects: string;
        score: number;
        moves: number;
        exits: string;
    }>({
        commands: '',
        objects: '',
        score: 0,
        moves: 0,
        exits: ''
    });
    sidebar$ = this.sidebarSubject.asObservable();

    constructor(
        private sceneService: SceneService,
        private gameState: GameStateService,
        private commandService: CommandService
    ) {}

    appendToGameText(text: string): void {
        const currentText = this.gameTextSubject.value;
        const newLines = text.split('\n');
        this.gameTextSubject.next([...currentText, ...newLines]);
    }

    clearGameText(): void {
        this.gameTextSubject.next([]);
    }

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

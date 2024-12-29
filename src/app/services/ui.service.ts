import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Scene } from '../models/game-state.model';
import { GameStateService } from './game-state.service';
import { SceneService } from './scene.service';

interface SidebarState {
    commands: string;
    exits: string;
    objects: string;
    score: number;
    moves: number;
}

@Injectable({
    providedIn: 'root'
})
export class UIService {
    private gameTextSubject = new BehaviorSubject<string[]>([]);
    gameText$ = this.gameTextSubject.asObservable();

    private sidebarSubject = new BehaviorSubject<SidebarState>({
        commands: '',
        exits: '',
        objects: '',
        score: 0,
        moves: 0
    });
    sidebar$ = this.sidebarSubject.asObservable();

    private knownObjects: Set<string> = new Set();

    constructor(
        private gameState: GameStateService,
        private sceneService: SceneService
    ) {}

    appendToGameText(text: string): void {
        console.log('\n=== Appending Game Text ===');
        console.log('Text:', text);
        
        const currentText = this.gameTextSubject.value;
        this.gameTextSubject.next([...currentText, text]);
    }

    getKnownObjects(): Set<string> {
        return this.knownObjects;
    }

    addKnownObject(objectName: string): void {
        console.log('\n=== Adding Known Object ===');
        console.log('Object:', objectName);
        
        console.log('Known objects before:', [...this.knownObjects]);
        this.knownObjects.add(objectName);
        console.log('Known objects after:', [...this.knownObjects]);
    }

    updateSidebar(): void {
        console.log('\n=== Updating Sidebar ===');
        
        const scene = this.sceneService.getCurrentScene();
        if (!scene) return;

        const state = this.gameState.getCurrentState();
        console.log('Current State:', {
            flags: state.flags,
            inventory: state.inventory,
            score: state.score,
            moves: state.moves
        });

        // Basic commands that are always available
        const baseCommands = ['look', 'examine (x)', 'inventory (i)', 'take', 'use', 'open', 'close', 'read'];
        
        // Available exits with descriptions
        const availableExits = this.sceneService.getAvailableExits(scene)
            .map(exit => `${exit.direction} - ${exit.description}`);

        // Visible objects and inventory items
        const visibleObjects = this.sceneService.getVisibleObjects(scene);
        console.log('Visible Objects:', visibleObjects);
        console.log('Known Objects Set:', [...this.knownObjects]);
        console.log('Inventory:', state.inventory);

        const knownObjects = [...new Set([...visibleObjects, ...state.inventory, ...this.knownObjects])].sort();
        console.log('Combined Known Objects:', knownObjects);

        this.sidebarSubject.next({
            commands: baseCommands.sort().join(', '),
            exits: availableExits.join('\n'),
            objects: knownObjects.join(', '),
            score: state.score,
            moves: state.moves
        });
    }
}

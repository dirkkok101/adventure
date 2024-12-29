import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { GameService } from '../../services/game.service';
import { UIService } from '../../services/ui.service';
import { GameStateService } from '../../services/game-state.service';
import { GameOutputComponent } from './game-output/game-output.component';

@Component({
    selector: 'app-game',
    standalone: true,
    imports: [CommonModule, FormsModule, GameOutputComponent],
    template: `
        <div class="game-container">
            <div class="game-main">
                <app-game-output [gameText]="(gameText$ | async) || []"></app-game-output>
            </div>
            <div class="game-sidebar">
                <div class="sidebar-content" *ngIf="sidebar$ | async as sidebar">
                    <div class="score">Score: {{ sidebar.score }}</div>
                    <div class="moves">Moves: {{ sidebar.moves }}</div>
                    <div class="exits">{{ sidebar.exits }}</div>
                    <div class="objects">{{ sidebar.objects }}</div>
                </div>
                <div class="game-input">
                    <input [(ngModel)]="userInput" 
                           (keyup.enter)="onSubmit()"
                           placeholder="What do you want to do?"
                           #inputField>
                </div>
            </div>
        </div>
    `,
    styles: [`
        :host {
            display: block;
            height: 80vh;
            margin: 20px;
        }

        .game-container {
            display: grid;
            grid-template-columns: 1fr 300px;
            gap: 20px;
            height: 100%;
            font-family: monospace;
        }

        .game-main {
            min-width: 0;
            height: 100%;
        }
        
        .game-sidebar {
            display: flex;
            flex-direction: column;
            gap: 20px;
            min-width: 0;
            width: 100%;
        }

        .game-input {
            background: #2d2d2d;
            padding: 10px;
            border-radius: 4px;
        }

        .game-input input {
            width: 100%;
            padding: 8px;
            font-family: monospace;
            background: #1e1e1e;
            border: 1px solid #3d3d3d;
            color: #d4d4d4;
            border-radius: 2px;
        }

        .game-input input:focus {
            outline: none;
            border-color: #0078d4;
        }

        .sidebar-content {
            padding: 10px;
            border: 1px solid #3d3d3d;
            background: #1e1e1e;
            color: #d4d4d4;
            border-radius: 4px;
        }
    `]
})
export class GameComponent implements OnInit {
    @ViewChild('inputField') private inputField!: ElementRef;
    
    userInput: string = '';
    gameText$: Observable<string[]>;
    sidebar$: Observable<{
        commands: string;
        objects: string;
        score: number;
        moves: number;
        exits: string;
    }>;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private gameService: GameService,
        private gameState: GameStateService,
        private uiService: UIService
    ) {
        this.gameText$ = this.uiService.gameText$;
        this.sidebar$ = this.uiService.sidebar$;
    }

    ngOnInit() {
        // Check if we have a game state
        const state = this.gameState.getCurrentState();
        if (!state || !state.currentScene) {
            // If not, initialize the game
            this.gameService.initializeGame();
        } else {
            // If we have a state, update the UI
            const scene = this.gameService.getCurrentScene();
            if (scene) {
                this.uiService.appendToGameText(scene.descriptions.default);
                this.uiService.updateSidebar();
            }
        }
    }

    onSubmit() {
        if (!this.userInput.trim()) return;
        
        this.gameService.processCommand(this.userInput);
        this.userInput = '';
        
        // Focus back on input field
        if (this.inputField) {
            this.inputField.nativeElement.focus();
        }
    }
}

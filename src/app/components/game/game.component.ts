import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { GameOutputComponent } from './game-output/game-output.component';
import { GameStateService } from '../../services/game-state.service';
import { CommandService } from '../../services/commands/command.service';
import { SceneService } from '../../services/scene.service';

@Component({
    selector: 'app-game',
    standalone: true,
    imports: [CommonModule, FormsModule, GameOutputComponent],
    templateUrl: './game.component.html',
    styleUrls: ['./game.component.scss']
})
export class GameComponent implements OnInit {
    @ViewChild('inputField') inputField!: ElementRef;

    gameText$: Observable<string[]>;
    sidebar$: Observable<any>;
    userInput = '';
    suggestions: string[] = [];
    showSuggestions = false;
    commandHistory: string[] = [];
    currentHistoryIndex = -1;

    constructor(
        private gameState: GameStateService,
        private commandService: CommandService,
        private sceneService: SceneService
    ) {
        this.gameText$ = this.gameState.getGameText();
        this.sidebar$ = this.sceneService.getSidebarInfo();
    }

    ngOnInit() {
        this.sceneService.initializeGame();
    }

    onSubmit() {
        if (!this.userInput.trim()) return;

        this.commandHistory.unshift(this.userInput);
        this.currentHistoryIndex = -1;
        const response = this.commandService.processInput(this.userInput);
        this.gameState.addText(response);
        this.userInput = '';
        this.showSuggestions = false;
    }

    onKeyDown(event: KeyboardEvent) {
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (this.currentHistoryIndex < this.commandHistory.length - 1) {
                this.currentHistoryIndex++;
                this.userInput = this.commandHistory[this.currentHistoryIndex];
            }
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (this.currentHistoryIndex > 0) {
                this.currentHistoryIndex--;
                this.userInput = this.commandHistory[this.currentHistoryIndex];
            } else if (this.currentHistoryIndex === 0) {
                this.currentHistoryIndex = -1;
                this.userInput = '';
            }
        } else if (event.key === 'Tab') {
            event.preventDefault();
            if (this.suggestions.length > 0) {
                this.userInput = this.suggestions[0];
                this.showSuggestions = false;
            }
        }
    }

    onInput() {
        this.suggestions = this.commandService.getSuggestions(this.userInput);
        this.showSuggestions = this.suggestions.length > 0;
    }
}

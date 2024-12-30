import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { GameOutputComponent } from './game-output/game-output.component';
import { GameService } from '../../services/game.service';
import { GameTextService } from '../../services/game-text.service';
import { SceneService } from '../../services/scene.service';

interface SidebarInfo {
    location: string;
    score: number;
    turns: number;
    maxScore: number;
}

@Component({
    selector: 'app-game',
    standalone: true,
    imports: [CommonModule, FormsModule, GameOutputComponent],
    templateUrl: './game.component.html',
    styleUrls: ['./game.component.scss']
})
export class GameComponent implements OnInit, OnDestroy {
    @ViewChild('inputField') inputField!: ElementRef;

    gameText$: Observable<string[]>;
    sidebar$: Observable<SidebarInfo>;
    userInput = '';
    suggestions: string[] = [];
    showSuggestions = false;
    commandHistory: string[] = [];
    currentHistoryIndex = -1;

    constructor(
        private gameService: GameService,
        private gameText: GameTextService,
        private sceneService: SceneService
    ) {
        this.gameText$ = this.gameText.getGameText();
        this.sidebar$ = this.sceneService.getSidebarInfo();
    }

    ngOnInit() {
        this.gameService.initializeGame();
    }

    ngOnDestroy() {
        // No subscriptions to clean up since we're using async pipe
    }

    async onSubmit() {
        if (!this.userInput.trim()) return;

        const input = this.userInput.trim();
        this.commandHistory.unshift(input);
        this.currentHistoryIndex = -1;
        this.userInput = '';
        this.showSuggestions = false;
        
        try {
            await this.gameService.processInput(input);
        } catch (error) {
            console.error('Error processing command:', error);
            this.gameText.addText('An error occurred while processing your command.');
        }
    }

    onKeyDown(event: KeyboardEvent) {
        switch (event.key) {
            case 'ArrowUp':
                event.preventDefault();
                if (this.currentHistoryIndex < this.commandHistory.length - 1) {
                    this.currentHistoryIndex++;
                    this.userInput = this.commandHistory[this.currentHistoryIndex];
                }
                break;
            case 'ArrowDown':
                event.preventDefault();
                if (this.currentHistoryIndex > 0) {
                    this.currentHistoryIndex--;
                    this.userInput = this.commandHistory[this.currentHistoryIndex];
                } else if (this.currentHistoryIndex === 0) {
                    this.currentHistoryIndex = -1;
                    this.userInput = '';
                }
                break;
            case 'Tab':
                event.preventDefault();
                if (this.suggestions.length > 0) {
                    this.userInput = this.suggestions[0];
                    this.showSuggestions = false;
                }
                break;
        }
    }

    onInput() {
        this.suggestions = this.gameService.getSuggestions(this.userInput);
        this.showSuggestions = this.suggestions.length > 0;
    }
}

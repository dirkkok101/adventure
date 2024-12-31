import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameOutputComponent } from './game-output/game-output.component';
import { GameInputComponent } from './game-input/game-input.component';
import { GameSidebarComponent } from './game-sidebar/game-sidebar.component';
import { GameService } from '../../services/game.service';
import { GameTextService } from '../../services/game-text.service';
import { GameTitleComponent } from './game-title/game-title.component';

interface SidebarData {
    commands: string;
    objects: string;
    exits: string;
    score: number;
    moves: number;
}

@Component({
    selector: 'app-game',
    standalone: true,
    imports: [CommonModule, FormsModule, GameOutputComponent, GameInputComponent, GameSidebarComponent, GameTitleComponent],
    templateUrl: './game.component.html',
    styleUrls: ['./game.component.scss']
})
export class GameComponent implements OnInit, OnDestroy {
    @ViewChild(GameInputComponent) gameInput!: GameInputComponent;

    gameText$: Observable<string[]>;
    sidebarData?: SidebarData;
    isLoading = false;
    errorMessage = '';

    constructor(
        private router: Router,
        public gameService: GameService,
        private gameText: GameTextService
    ) {
        this.gameText$ = this.gameText.getGameText$();
    }

    async ngOnInit() {
        try {
            this.isLoading = true;
            
            // Try to load saved game
            const hasSave = await this.gameService.hasSavedGame();
            if (hasSave) {
                const loaded = await this.gameService.loadGame();
                if (!loaded) {
                    await this.gameService.startNewGame();
                }
            } else {
                await this.gameService.startNewGame();
            }

            // Subscribe to game state changes to update sidebar
            this.gameService.getCurrentState$().subscribe(async state => {
                this.sidebarData = await this.gameService.getSidebarData(state);
            });

            // Focus input field
            setTimeout(() => {
                if (this.gameInput) {
                    this.gameInput.focus();
                }
            }, 0);
        } catch (error) {
            console.error('Error initializing game component:', error);
            this.errorMessage = 'Error starting game. Please try again.';
        } finally {
            this.isLoading = false;
        }
    }

    ngOnDestroy() {
        // Any cleanup if needed
    }

    async onCommandEntered(command: string) {
        try {
            await this.gameService.processCommand(command);
            this.gameInput.focus();
        } catch (error) {
            console.error('Error processing command:', error);
            this.errorMessage = 'Error processing command. Please try again.';
        }
    }
}

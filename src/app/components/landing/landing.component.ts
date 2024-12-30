import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameService } from '../../services/game.service';
import { GameTextService } from '../../services/game-text.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="landing-container">
      <h1>{{ gameTitle }}</h1>
      <div *ngIf="hasSavedGame" class="game-stats">
        <p>{{ savedGameStats }}</p>
      </div>
      <div class="button-container">
        <button (click)="continueGame()" [disabled]="!hasSavedGame || isLoading">Continue Game</button>
        <button (click)="newGame()" [disabled]="isLoading">New Game</button>
      </div>
      <div *ngIf="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      background: #1e1e1e;
      color: #d4d4d4;
    }

    .landing-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 2rem;
    }

    h1 {
      font-family: monospace;
      font-size: 3rem;
      margin: 0;
      color: #569cd6;
    }

    .game-stats {
      font-family: monospace;
      text-align: center;
      color: #9cdcfe;
    }

    .button-container {
      display: flex;
      gap: 1rem;
    }

    button {
      padding: 1rem 2rem;
      font-size: 1.2rem;
      font-family: monospace;
      background: #2d2d2d;
      border: 1px solid #569cd6;
      color: #d4d4d4;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }

    button:hover:not(:disabled) {
      background: #3d3d3d;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .error-message {
      color: #f14c4c;
      font-family: monospace;
      text-align: center;
      padding: 1rem;
      border: 1px solid #f14c4c;
      border-radius: 4px;
      background: rgba(241, 76, 76, 0.1);
    }
  `]
})
export class LandingComponent implements OnInit {
  hasSavedGame = false;
  gameTitle = 'Welcome to Zork';
  savedGameStats = '';
  isLoading = false;
  errorMessage = '';

  constructor(
    private router: Router,
    private gameService: GameService,
    private gameText: GameTextService
  ) {}

  ngOnInit() {
    this.initializeComponent();
  }

  private async initializeComponent() {
    try {
      this.isLoading = true;
      // Check for saved game
      this.hasSavedGame = await this.gameService.hasSavedGame();
      
      if (this.hasSavedGame) {
        // Get saved game stats without loading the full game
        const gameText = await firstValueFrom(this.gameText.getGameText$());
        if (gameText.length > 0) {
          this.savedGameStats = gameText[gameText.length - 1];
        }
      }
    } catch (error) {
      console.error('Error initializing component:', error);
      this.errorMessage = 'Error loading game data. Please refresh the page.';
    } finally {
      this.isLoading = false;
    }
  }

  async continueGame() {
    try {
      this.isLoading = true;
      this.errorMessage = '';
      
      // Load the saved game state
      const success = await this.gameService.loadGame();
      if (success) {
        // Navigate to game component which will use the loaded state
        await this.router.navigate(['/game']);
      } else {
        this.errorMessage = 'Failed to load saved game. Please try starting a new game.';
      }
    } catch (error) {
      console.error('Error continuing game:', error);
      this.errorMessage = 'Error loading game. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  async newGame() {
    try {
      this.isLoading = true;
      this.errorMessage = '';
      
      // Reset game state and start new game
      await this.gameService.resetGame();
      
      // Navigate to game component which will use the new state
      await this.router.navigate(['/game']);
    } catch (error) {
      console.error('Error starting new game:', error);
      this.errorMessage = 'Error starting new game. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameService } from '../../services/game.service';
import { GameTextService } from '../../services/game-text.service';
import {firstValueFrom, lastValueFrom} from 'rxjs';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
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
    this.initializeComponent().then();
  }

  async initializeComponent() {
    try {
      this.isLoading = true;
      // Check for saved game
      this.hasSavedGame = this.gameService.hasSavedGame();

      if (this.hasSavedGame) {
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
      const success = this.gameService.loadGame();
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
      this.gameService.resetGame();

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

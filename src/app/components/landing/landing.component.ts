import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/game-state.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="landing-container">
      <h1>Welcome to Zork</h1>
      <div class="button-container">
        <button (click)="continueGame()" [disabled]="!hasSavedGame">Continue Game</button>
        <button (click)="newGame()">New Game</button>
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
  `]
})
export class LandingComponent {
  hasSavedGame = false;

  constructor(
    private router: Router,
    private gameStateService: GameStateService
  ) {
    this.hasSavedGame = this.gameStateService.hasSavedGame();
  }

  continueGame() {
    this.gameStateService.loadGame();
    this.router.navigate(['/game']);
  }

  newGame() {
    this.gameStateService.clearSavedGame();
    this.router.navigate(['/game']);
  }
}

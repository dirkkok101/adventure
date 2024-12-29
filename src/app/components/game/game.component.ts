import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { GameService } from '../../services/game.service';
import { GameOutputComponent } from './game-output/game-output.component';
import { GameInputComponent } from './game-input/game-input.component';
import { GameSidebarComponent } from './game-sidebar/game-sidebar.component';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, GameOutputComponent, GameInputComponent, GameSidebarComponent],
  template: `
    <div class="game-container">
      <div class="game-main">
        <app-game-output [gameText]="(gameText$ | async) || []"></app-game-output>
      </div>
      <div class="game-sidebar">
        <app-game-sidebar [data]="(sidebar$ | async) || undefined"></app-game-sidebar>
        <app-game-input #gameInput (commandEntered)="onCommand($event)"></app-game-input>
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
  `]
})
export class GameComponent implements OnInit {
  @ViewChild('gameInput') gameInput!: GameInputComponent;

  readonly gameText$: Observable<string[]>;
  readonly sidebar$: Observable<{
    commands: string;
    objects: string;
    score: number;
    moves: number;
    exits: string;
  }>;

  constructor(private gameService: GameService) {
    this.gameText$ = this.gameService.gameText$;
    this.sidebar$ = this.gameService.sidebar$;
  }

  ngOnInit(): void {
    this.gameService.initializeGame();
  }

  onCommand(command: string): void {
    this.gameService.processInput(command);
    this.focusInput();
  }

  focusInput(): void {
    setTimeout(() => {
      this.gameInput.focus();
    });
  }
}

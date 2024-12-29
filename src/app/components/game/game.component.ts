import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService } from '../../services/game.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, FormsModule, AsyncPipe],
  template: `
    <div class="game-container">
      <div class="game-text">
        <div *ngFor="let text of gameText$ | async">{{ text }}</div>
      </div>
      <div class="game-sidebar">
        <div class="sidebar-content">
          <div class="sidebar-section">
            <h3>Known Commands:</h3>
            <div>{{ knownCommands$ | async }}</div>
          </div>
          <div class="sidebar-section">
            <h3>Known Objects:</h3>
            <div>{{ knownObjects$ | async }}</div>
          </div>
        </div>
        <div class="game-input">
          <input #commandInput
                 [(ngModel)]="currentCommand"
                 (keyup.enter)="onEnter()"
                 placeholder="Enter command...">
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
      display: flex;
      height: 100%;
      gap: 20px;
      font-family: monospace;
    }
    
    .game-text {
      flex: 2;
      overflow-y: auto;
      background: #1e1e1e;
      padding: 20px;
      border-radius: 5px;
      white-space: pre-wrap;
      color: #d4d4d4;
      min-width: 0; /* Allows flex item to shrink below content size */
    }
    
    .game-sidebar {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 20px;
      min-width: 0; /* Allows flex item to shrink below content size */
    }

    .sidebar-content {
      flex: 1;
      background: #1e1e1e;
      padding: 20px;
      border-radius: 5px;
      overflow-y: auto;
    }
    
    .sidebar-section {
      margin-bottom: 20px;
      color: #d4d4d4;
    }
    
    .sidebar-section:last-child {
      margin-bottom: 0;
    }
    
    .sidebar-section h3 {
      margin-top: 0;
      color: #569cd6;
      font-family: monospace;
    }
    
    .game-input {
      background: #1e1e1e;
      padding: 20px;
      border-radius: 5px;
    }
    
    input {
      width: 100%;
      padding: 8px;
      background: #2d2d2d;
      border: 1px solid #569cd6;
      color: #d4d4d4;
      border-radius: 4px;
      font-family: monospace;
      font-size: 1em;
      box-sizing: border-box;
    }

    input:focus {
      outline: none;
      border-color: #569cd6;
      box-shadow: 0 0 0 2px rgba(86, 156, 214, 0.3);
    }
  `]
})
export class GameComponent implements OnInit {
  @ViewChild('commandInput') commandInput!: ElementRef;
  
  currentCommand = '';
  shouldScroll = false;

  readonly gameText$: Observable<string[]>;
  readonly knownCommands$: Observable<string>;
  readonly knownObjects$: Observable<string>;

  constructor(private gameService: GameService) {
    this.gameText$ = this.gameService.gameText$;
    this.knownCommands$ = this.gameService.knownCommands$;
    this.knownObjects$ = this.gameService.knownObjects$;
  }

  ngOnInit() {
    // Focus the input
    setTimeout(() => {
      this.commandInput.nativeElement.focus();
    });

    // Subscribe to text changes to trigger scroll
    this.gameText$.subscribe(() => {
      this.shouldScroll = true;
    });
  }

  onEnter() {
    if (this.currentCommand.trim()) {
      this.gameService.processInput(this.currentCommand);
      this.currentCommand = '';
      // Refocus the input after command
      this.commandInput.nativeElement.focus();
    }
  }
}

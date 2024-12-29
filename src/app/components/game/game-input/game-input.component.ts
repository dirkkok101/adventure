import { Component, ViewChild, ElementRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-game-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="game-input">
      <input #gameInput
             [(ngModel)]="currentCommand"
             (keyup.enter)="onEnter()"
             placeholder="Enter command...">
    </div>
  `,
  styles: [`
    .game-input {
      background: #1e1e1e;
      padding: 10px;
      border-radius: 5px;
    }

    input {
      width: 100%;
      background: #2d2d2d;
      border: none;
      padding: 8px 12px;
      color: #d4d4d4;
      border-radius: 3px;
      font-family: monospace;
    }

    input:focus {
      outline: 1px solid #0078d4;
    }
  `]
})
export class GameInputComponent {
  @ViewChild('gameInput') gameInput!: ElementRef;
  @Output() commandEntered = new EventEmitter<string>();
  
  currentCommand = '';

  onEnter() {
    if (this.currentCommand.trim()) {
      this.commandEntered.emit(this.currentCommand);
      this.currentCommand = '';
    }
  }

  focus(): void {
    try {
      this.gameInput.nativeElement.focus();
    } catch (err) {
      console.error('Error focusing input:', err);
    }
  }
}

import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-game-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './game-input.component.html',
  styleUrls: ['./game-input.component.scss']
})
export class GameInputComponent {
  @ViewChild('gameInput') gameInput!: ElementRef;
  @Output() commandEntered = new EventEmitter<string>();
  @Input() availableCommands: string[] = [];

  currentInput = '';
  filteredCommands: string[] = [];
  commandHistory: string[] = [];
  currentHistoryIndex = -1;

  onInput(event: Event): void {
    const input = (event.target as HTMLInputElement).value.toLowerCase();
    this.currentInput = input;
    
    if (input) {
      this.filteredCommands = this.availableCommands
        .filter(cmd => cmd.toLowerCase().includes(input))
        .slice(0, 10); // Limit to 10 suggestions
    } else {
      this.filteredCommands = [];
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        if (this.currentHistoryIndex > 0) {
          this.currentHistoryIndex--;
          this.currentInput = this.commandHistory[this.currentHistoryIndex];
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (this.currentHistoryIndex < this.commandHistory.length - 1) {
          this.currentHistoryIndex++;
          this.currentInput = this.commandHistory[this.currentHistoryIndex];
        } else {
          this.currentHistoryIndex = this.commandHistory.length;
          this.currentInput = '';
        }
        break;
      case 'Enter':
        event.preventDefault();
        if (this.currentInput.trim()) {
          this.sendCommand(this.currentInput.trim());
        }
        break;
      case 'Tab':
        event.preventDefault();
        if (this.filteredCommands.length > 0) {
          this.selectSuggestion(this.filteredCommands[0]);
        }
        break;
      case 'Escape':
        this.filteredCommands = [];
        break;
    }
  }

  selectSuggestion(command: string): void {
    this.currentInput = command;
    this.sendCommand(command);
    this.gameInput.nativeElement.focus();
  }

  private sendCommand(command: string): void {
    this.commandEntered.emit(command);
    this.commandHistory.push(command);
    this.currentHistoryIndex = this.commandHistory.length;
    this.currentInput = '';
    this.filteredCommands = [];
  }

  focus(): void {
    try {
      this.gameInput.nativeElement.focus();
    } catch (err) {
      console.error('Error focusing input:', err);
    }
  }
}

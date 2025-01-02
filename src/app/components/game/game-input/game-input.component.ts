import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService } from '../../../services/game.service';

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

  constructor(private gameService: GameService) {}

  async onInput(event: Event): Promise<void> {
    const input = (event.target as HTMLInputElement).value.toLowerCase();
    this.currentInput = input;

    if (input) {
      console.log('Getting suggestions for:', input);
      const suggestions = this.gameService.getSuggestions(input);
      console.log('Got suggestions:', suggestions);
      this.filteredCommands = suggestions.slice(0, 10); // Limit to 10 suggestions
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
          this.commandEntered.emit(this.currentInput);
          this.commandHistory.push(this.currentInput);
          this.currentHistoryIndex = this.commandHistory.length;
          this.currentInput = '';
          this.filteredCommands = [];
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
    this.filteredCommands = [];
    this.gameInput.nativeElement.focus();
  }

  focus(): void {
    try {
      this.gameInput.nativeElement.focus();
    } catch (err) {
      console.error('Error focusing input:', err);
    }
  }


}

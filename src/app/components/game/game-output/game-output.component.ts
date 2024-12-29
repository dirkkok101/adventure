import { Component, ViewChild, ElementRef, Input, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-game-output',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="game-text" #gameOutput>
      <div *ngFor="let text of gameText">{{ text }}</div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .game-text {
      height: 100%;
      overflow-y: auto;
      background: #1e1e1e;
      padding: 20px;
      border-radius: 5px;
      white-space: pre-wrap;
      color: #d4d4d4;
      min-width: 0;
    }
  `]
})
export class GameOutputComponent implements AfterViewChecked {
  @ViewChild('gameOutput') gameOutput!: ElementRef;
  @Input() gameText: string[] = [];
  private shouldScroll = false;

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  ngOnChanges() {
    this.shouldScroll = true;
  }

  private scrollToBottom(): void {
    try {
      const element = this.gameOutput.nativeElement;
      element.scrollTop = element.scrollHeight;
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }
}

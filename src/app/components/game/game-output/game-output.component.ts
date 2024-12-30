import { Component, ViewChild, ElementRef, Input, AfterViewChecked, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-game-output',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-output.component.html',
  styleUrls: ['./game-output.component.scss']
})
export class GameOutputComponent implements AfterViewChecked, OnChanges {
  @ViewChild('gameOutput') private gameOutput!: ElementRef;
  @Input() gameText: string[] = [];
  private shouldScroll = true;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['gameText']) {
      // Only auto-scroll if we're already at the bottom or this is new content
      const element = this.gameOutput?.nativeElement;
      if (element) {
        const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
        this.shouldScroll = isAtBottom || changes['gameText'].currentValue.length > changes['gameText'].previousValue?.length;
      }
    }
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
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

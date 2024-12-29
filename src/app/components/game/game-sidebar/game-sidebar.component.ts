import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarSectionComponent } from './sidebar-section/sidebar-section.component';

export interface SidebarData {
  commands: string;
  objects: string;
  score: number;
  moves: number;
  exits: string;
}

@Component({
  selector: 'app-game-sidebar',
  standalone: true,
  imports: [CommonModule, SidebarSectionComponent],
  template: `
    <div class="sidebar-content">
      <app-sidebar-section title="Known Commands" [content]="data?.commands || ''"></app-sidebar-section>
      <app-sidebar-section title="Available Exits" [content]="data?.exits || ''"></app-sidebar-section>
      <app-sidebar-section title="Known Objects" [content]="data?.objects || ''"></app-sidebar-section>
      <app-sidebar-section title="Score" [content]="data?.score?.toString() || '0'"></app-sidebar-section>
      <app-sidebar-section title="Moves" [content]="data?.moves?.toString() || '0'"></app-sidebar-section>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      flex: 1;
      min-height: 0;
    }

    .sidebar-content {
      height: 100%;
      background: #1e1e1e;
      padding: 20px;
      border-radius: 5px;
      overflow-y: auto;
      color: #d4d4d4;
    }
  `]
})
export class GameSidebarComponent {
  @Input() data?: SidebarData;
}

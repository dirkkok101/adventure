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
  templateUrl: './game-sidebar.component.html',
  styleUrl: './game-sidebar.component.scss'
})
export class GameSidebarComponent {
  @Input() data?: SidebarData;
}

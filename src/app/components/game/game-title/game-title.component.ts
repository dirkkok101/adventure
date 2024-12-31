import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarData } from '../game-sidebar/game-sidebar.component';

@Component({
  selector: 'app-game-title',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-title.component.html',
  styleUrls: ['./game-title.component.scss']
})
export class GameTitleComponent {
    @Input() data?: SidebarData;
}
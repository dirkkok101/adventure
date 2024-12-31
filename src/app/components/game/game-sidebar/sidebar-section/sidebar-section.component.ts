import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar-section.component.html',
  styleUrl: './sidebar-section.component.scss'
})
export class SidebarSectionComponent {
  @Input() title: string = '';
  @Input() content: string = '';
}

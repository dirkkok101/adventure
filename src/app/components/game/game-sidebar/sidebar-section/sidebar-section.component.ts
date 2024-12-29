import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sidebar-section">
      <h3>{{ title }}:</h3>
      <div>{{ content }}</div>
    </div>
  `,
  styles: [`
    .sidebar-section {
      margin-bottom: 20px;
    }

    h3 {
      color: #9cdcfe;
      margin: 0 0 8px 0;
      font-size: 1em;
    }

    div {
      font-family: monospace;
      white-space: pre-wrap;
      word-break: break-word;
    }
  `]
})
export class SidebarSectionComponent {
  @Input() title = '';
  @Input() content = '';
}

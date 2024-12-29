import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="section">
      <h3>{{ title }}</h3>
      <pre>{{ content }}</pre>
    </div>
  `,
  styles: [`
    .section {
      margin-bottom: 20px;
      padding: 10px;
      background: #2d2d2d;
      border-radius: 4px;
    }

    h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #9cdcfe;
      text-transform: uppercase;
      border-bottom: 1px solid #3d3d3d;
      padding-bottom: 5px;
    }

    pre {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-size: 12px;
      line-height: 1.4;
      color: #d4d4d4;
    }
  `]
})
export class SidebarSectionComponent {
  @Input() title: string = '';
  @Input() content: string = '';
}

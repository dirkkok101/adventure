import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule, RouterOutlet],
    template: `
        <div class="app-container">
            <h1>Text Adventure</h1>
            <router-outlet></router-outlet>
        </div>
    `,
    styles: [`
        .app-container {
            background-color: #121212;
            min-height: 100vh;
            color: #00ff00;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 2rem;
        }

        h1 {
            font-family: monospace;
            margin-bottom: 2rem;
        }
    `]
})
export class AppComponent {}

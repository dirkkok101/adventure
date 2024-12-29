import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameComponent } from './components/game/game.component';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule, GameComponent],
    template: `
        <div class="app-container">
            <h1>Text Adventure</h1>
            <app-game></app-game>
        </div>
    `,
    styles: [`
        .app-container {
            background-color: #121212;
            min-height: 100vh;
            color: #00ff00;
            display: flex;
            flex-direction: column;
        }

        h1 {
            text-align: center;
            margin: 10px 0;
            font-family: monospace;
            flex-shrink: 0;
        }
    `]
})
export class AppComponent {
    title = 'Text Adventure';
}

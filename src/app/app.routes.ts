import { Routes } from '@angular/router';
import { LandingComponent } from './components/landing/landing.component';
import { GameComponent } from './components/game/game.component';

export const routes: Routes = [
    { path: '', component: LandingComponent },
    { path: 'game', component: GameComponent },
    { path: '**', redirectTo: '' }
];

import { Injectable } from '@angular/core';
import { GameStateService } from '../game-state.service';

@Injectable({
    providedIn: 'root'
})
export class FlagMechanicsService {
    constructor(private gameState: GameStateService) {}

    setFlag(flag: string) {
        this.gameState.updateState(state => ({
            ...state,
            flags: {
                ...state.flags,
                [flag]: true
            }
        }));
    }

    removeFlag(flag: string) {
        this.gameState.updateState(state => {
            const { [flag]: _, ...remainingFlags } = state.flags;
            return {
                ...state,
                flags: remainingFlags
            };
        });
    }

    hasFlag(flag: string): boolean {
        return !!this.gameState.getCurrentState().flags[flag];
    }

    checkFlags(flags: string[]): boolean {
        return flags.every(flag => {
            if (flag.startsWith('!')) {
                return !this.hasFlag(flag.substring(1));
            }
            return this.hasFlag(flag);
        });
    }
}

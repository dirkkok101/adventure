import { Injectable } from '@angular/core';
import { GameState } from "../../../models"';
import { SaveState } from '../save-load.service';

@Injectable({
    providedIn: 'root'
})
export class GameStateLoggerService {
    logState(message: string, state: GameState) {
        console.log(`[GameState] ${message}:`, {
            currentScene: state.currentScene,
            inventory: state.inventory,
            flags: state.flags,
            score: state.score,
            moves: state.moves,
            knownObjects: Array.from(state.knownObjects),
            containers: state.containers
        });
    }

    logSaveState(message: string, state: SaveState) {
        console.log(`[SaveState] ${message}:`, 
            JSON.stringify(state));
    }

    logStateUpdate(oldState: GameState, updates: Partial<GameState>) {
        console.log('[GameState] State update:', {
            from: oldState,
            updates: updates
        });
    }

    logFlagAdd(flag: string, currentFlags: string[]) {
        console.log(`[GameState] Adding flag: ${flag}`, {
            currentFlags: currentFlags
        });
    }

    logFlagRemove(flag: string, currentFlags: string[]) {
        console.log(`[GameState] Removing flag: ${flag}`, {
            currentFlags: currentFlags
        });
    }

    logMovesIncrement(currentMoves: number) {
        console.log(`[GameState] Incrementing moves from ${currentMoves} to ${currentMoves + 1}`);
    }

    logScoreChange(currentScore: number, points: number) {
        console.log(`[GameState] Score change: ${currentScore} + ${points} = ${currentScore + points}`);
    }
}

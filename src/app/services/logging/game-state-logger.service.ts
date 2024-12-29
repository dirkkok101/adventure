import { Injectable } from '@angular/core';
import { GameState } from '../../models/game-state.model';

@Injectable({
    providedIn: 'root'
})
export class GameStateLoggerService {
    logStateUpdate(currentState: GameState, updates: Partial<GameState>): void {
        console.log('\n=== Game State Update ===');
        console.log('Details:', {
            currentState,
            updates,
            newState: { ...currentState, ...updates }
        });
    }

    logFlagAdd(flag: string, currentFlags: string[]): void {
        console.log('\n=== Flag Addition ===');
        console.log('Details:', {
            addedFlag: flag,
            flagsBefore: currentFlags,
            flagsAfter: [...currentFlags, flag]
        });
    }

    logFlagRemove(flag: string, currentFlags: string[]): void {
        console.log('\n=== Flag Removal ===');
        console.log('Details:', {
            removedFlag: flag,
            flagsBefore: currentFlags,
            flagsAfter: currentFlags.filter(f => f !== flag)
        });
    }

    logScoreChange(currentScore: number, points: number): void {
        console.log('\n=== Score Update ===');
        console.log('Details:', {
            currentScore,
            pointsAdded: points,
            newScore: currentScore + points
        });
    }

    logMovesIncrement(currentMoves: number): void {
        console.log('\n=== Moves Update ===');
        console.log('Details:', {
            currentMoves,
            newMoves: currentMoves + 1
        });
    }

    logGameStatus(state: GameState): void {
        console.log('\n=== Game Status ===');
        console.log('Status:', {
            isGameOver: state.gameOver,
            isGameWon: state.gameWon,
            score: state.score,
            moves: state.moves
        });
    }
}

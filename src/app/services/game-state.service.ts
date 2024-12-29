import { Injectable } from '@angular/core';
import { GameState } from '../models/game-state.model';
import { BehaviorSubject } from 'rxjs';
import { GameStateLoggerService } from './logging/game-state-logger.service';
import { InventoryLoggerService } from './logging/inventory-logger.service';

@Injectable({
    providedIn: 'root'
})
export class GameStateService {
    private gameState: GameState = {
        currentScene: 'west-of-house',
        flags: [],
        inventory: [],
        score: 0,
        moves: 0,
        gameOver: false,
        gameWon: false
    };
    private gameStateSubject = new BehaviorSubject<GameState>(this.gameState);
    gameState$ = this.gameStateSubject.asObservable();

    constructor(
        private gameStateLogger: GameStateLoggerService,
        private inventoryLogger: InventoryLoggerService
    ) {}

    getCurrentState(): GameState {
        return this.gameState;
    }

    updateState(updates: Partial<GameState>): void {
        this.gameStateLogger.logStateUpdate(this.gameState, updates);
        this.gameState = { ...this.gameState, ...updates };
        this.gameStateSubject.next(this.gameState);
    }

    addToInventory(objectId: string): void {
        if (!this.gameState.inventory.includes(objectId)) {
            this.inventoryLogger.logInventoryAdd(objectId, this.gameState.inventory);
            this.updateState({
                inventory: [...this.gameState.inventory, objectId]
            });
        }
    }

    removeFromInventory(objectId: string): void {
        this.inventoryLogger.logInventoryRemove(objectId, this.gameState.inventory);
        this.updateState({
            inventory: this.gameState.inventory.filter(id => id !== objectId)
        });
    }

    addFlag(flag: string): void {
        if (!this.gameState.flags.includes(flag)) {
            this.gameStateLogger.logFlagAdd(flag, this.gameState.flags);
            this.updateState({
                flags: [...this.gameState.flags, flag]
            });
        }
    }

    removeFlag(flag: string): void {
        this.gameStateLogger.logFlagRemove(flag, this.gameState.flags);
        this.updateState({
            flags: this.gameState.flags.filter(f => f !== flag)
        });
    }

    incrementMoves(): void {
        this.gameStateLogger.logMovesIncrement(this.gameState.moves);
        this.updateState({
            moves: this.gameState.moves + 1
        });
    }

    incrementScore(points: number): void {
        this.gameStateLogger.logScoreChange(this.gameState.score, points);
        this.updateState({
            score: this.gameState.score + points
        });
    }
}

import { Injectable } from '@angular/core';
import { GameStateService } from '../game-state.service';
import { Observable, map } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class FlagMechanicsService {
    constructor(private gameState: GameStateService) {}

    setFlag(flag: string): void {
        this.gameState.updateState(state => ({
            ...state,
            flags: {
                ...state.flags,
                [flag]: true
            }
        }));
    }

    removeFlag(flag: string): void {
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
            // Check for OR condition
            if (flag.includes('|')) {
                const orFlags = flag.split('|');
                return orFlags.some(orFlag => {
                    if (orFlag.startsWith('!')) {
                        return !this.hasFlag(orFlag.substring(1));
                    }
                    return this.hasFlag(orFlag);
                });
            }

            // Regular NOT or flag check
            if (flag.startsWith('!')) {
                return !this.hasFlag(flag.substring(1));
            }
            return this.hasFlag(flag);
        });
    }

    // Common flag operations
    setContainerOpen(containerId: string, isOpen: boolean): void {
        const flag = `${containerId}Open`;
        if (isOpen) {
            this.setFlag(flag);
        } else {
            this.removeFlag(flag);
        }
    }

    isContainerOpen(containerId: string): boolean {
        return this.hasFlag(`${containerId}Open`);
    }

    setObjectRevealed(objectId: string): void {
        this.gameState.updateState(state => ({
            ...state,
            knownObjects: new Set([...state.knownObjects, objectId])
        }));
    }

    isObjectRevealed(objectId: string): boolean {
        return this.gameState.getCurrentState().knownObjects.has(objectId);
    }

    // Light-related flags
    setLightSource(sourceId: string, isOn: boolean): void {
        if (isOn) {
            this.setFlag(`${sourceId}_on`);
        } else {
            this.removeFlag(`${sourceId}_on`);
        }
    }

    isLightSourceOn(sourceId: string): boolean {
        return this.hasFlag(`${sourceId}_on`);
    }

    setLightSourceDead(sourceId: string): void {
        this.setFlag(`${sourceId}_dead`);
    }

    isLightSourceDead(sourceId: string): boolean {
        return this.hasFlag(`${sourceId}_dead`);
    }

    // Flag observation
    observeFlag(flag: string): Observable<boolean> {
        return this.gameState.state$.pipe(
            map(state => !!state.flags[flag])
        );
    }
}

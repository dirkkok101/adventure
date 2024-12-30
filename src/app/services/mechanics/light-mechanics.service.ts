import { Injectable } from '@angular/core';
import { GameStateService } from '../game-state.service';
import { SceneService } from '../scene.service';
import { SceneObject } from '../../models/game-state.model';
import { distinctUntilChanged, map } from 'rxjs';
import { FlagMechanicsService } from './flag-mechanics.service';

@Injectable({
    providedIn: 'root'
})
export class LightMechanicsService {
    private readonly LANTERN_BATTERY_LIFE = 100;

    constructor(
        private gameState: GameStateService,
        private sceneService: SceneService,
        private flagMechanics: FlagMechanicsService
    ) {
        // Monitor lantern usage
        this.gameState.state$.pipe(
            map(state => ({ turns: state.turns, lanternOn: this.flagMechanics.isLightSourceOn('lantern') })),
            distinctUntilChanged((prev, curr) => 
                prev.turns === curr.turns && prev.lanternOn === curr.lanternOn
            )
        ).subscribe(({ turns, lanternOn }) => {
            this.handleLanternBattery(turns, lanternOn);
        });
    }

    private handleLanternBattery(turns: number, lanternOn: boolean): void {
        if (!lanternOn) return;

        if (turns >= this.LANTERN_BATTERY_LIFE) {
            this.flagMechanics.setLightSourceDead('lantern');
            this.flagMechanics.setLightSource('lantern', false);
            this.updateLightState();
        }
    }

    private updateLightState(): void {
        const hasLight = this.calculateLightPresence();
        if (hasLight) {
            this.flagMechanics.setFlag('hasLight');
        } else {
            this.flagMechanics.removeFlag('hasLight');
        }
    }

    private calculateLightPresence(): boolean {
        const state = this.gameState.getCurrentState();
        const scene = this.sceneService.getCurrentScene();

        // Check scene natural light
        if (scene?.light) {
            return true;
        }

        // Check for light sources in inventory
        return Object.entries(scene?.objects || {}).some(([id, obj]) => 
            obj.providesLight && 
            state.inventory[id] && 
            this.flagMechanics.isLightSourceOn(id) &&
            !this.flagMechanics.isLightSourceDead(id)
        );
    }

    isLightPresent(): boolean {
        return this.calculateLightPresence();
    }

    isObjectVisible(object: SceneObject): boolean {
        const state = this.gameState.getCurrentState();

        // Always visible if in inventory
        if (state.inventory[object.id]) {
            return true;
        }

        // Check if naturally visible
        if (object.visibleOnEntry) {
            return true;
        }

        // Check if revealed by other actions
        return this.flagMechanics.isObjectRevealed(object.id);
    }

    handleLightSource(sourceId: string, turnOn: boolean): { success: boolean; message: string } {
        const state = this.gameState.getCurrentState();
        const scene = this.sceneService.getCurrentScene();
        const source = scene?.objects?.[sourceId];

        if (!source?.providesLight) {
            return { success: false, message: 'That is not a light source.' };
        }

        if (turnOn) {
            if (this.flagMechanics.isLightSourceDead(sourceId)) {
                return { success: false, message: `The ${source.name} is dead.` };
            }
            this.flagMechanics.setLightSource(sourceId, true);
            this.updateLightState();
            return { success: true, message: `The ${source.name} is now on.` };
        } else {
            this.flagMechanics.setLightSource(sourceId, false);
            this.updateLightState();
            return { success: true, message: `The ${source.name} is now off.` };
        }
    }

    getLanternBatteryStatus(): string {
        if (this.flagMechanics.isLightSourceDead('lantern')) {
            return 'The lantern battery is dead.';
        }
        const remainingTurns = Math.max(0, this.LANTERN_BATTERY_LIFE - this.gameState.getCurrentState().turns);
        return `The lantern battery has ${remainingTurns} turns remaining.`;
    }
}

import { Injectable } from '@angular/core';
import { GameCommand, SceneObject, CommandResponse } from '../../../models/game-state.model';
import { GameStateService } from '../../game-state.service';
import { SceneService } from '../../scene.service';
import { FlagMechanicsService } from '../../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../../mechanics/progress-mechanics.service';
import { LightMechanicsService } from '../../mechanics/light-mechanics.service';
import { InventoryMechanicsService } from '../../mechanics/inventory-mechanics.service';
import { ContainerMechanicsService } from '../../mechanics/container-mechanics.service';
import { ScoreMechanicsService } from '../../mechanics/score-mechanics.service';
import { GameTextService } from '../../game-text.service';
import { MovementBaseCommandService } from '../bases/movement-base-command.service';

@Injectable({
    providedIn: 'root'
})
export class OpenCloseExitCommandService extends MovementBaseCommandService {
    constructor(
        gameState: GameStateService,
        sceneService: SceneService,
        flagMechanics: FlagMechanicsService,
        progress: ProgressMechanicsService,
        lightMechanics: LightMechanicsService,
        inventoryMechanics: InventoryMechanicsService,
        scoreMechanics: ScoreMechanicsService,
        containerMechanics: ContainerMechanicsService,
        private gameText: GameTextService
    ) {
        super(
            gameState,
            sceneService,
            flagMechanics,
            progress,
            lightMechanics,
            inventoryMechanics,
            scoreMechanics,
            containerMechanics
        );
    }

    canHandle(command: GameCommand): boolean {
        return command.verb === 'open' || command.verb === 'close' || command.verb === 'shut';
    }

    async handle(command: GameCommand): Promise<CommandResponse> {
        if (!command.object) {
            return {
                success: false,
                message: this.gameText.get('error.noObject', { action: command.verb }),
                incrementTurn: false
            };
        }

        const isOpenCommand = command.verb === 'open';
        const action = isOpenCommand ? 'open' : 'close';

        // Check light first
        if (!this.lightMechanics.isLightPresent()) {
            return {
                success: false,
                message: this.gameText.get('error.tooDark', { action }),
                incrementTurn: false
            };
        }

        // First try to find an exit with this name/direction
        const exit = this.sceneService.findExit(command.object);
        if (exit) {
            const result = isOpenCommand ? 
                await this.sceneService.openExit(exit) :
                await this.sceneService.closeExit(exit);

            if (result.success && result.score) {
                await this.scoreMechanics.addScore(result.score);
            }

            return {
                success: result.success,
                message: result.message,
                incrementTurn: result.success
            };
        }

        throw new Error('Not implemented');
        
    }

    override async getSuggestions(command: GameCommand): Promise<string[]> {
        console.log('OpenCloseExitCommandService.getSuggestions called with:', command);
        const suggestions = await super.getSuggestions(command);
        console.log('Base suggestions:', suggestions);

        if (!command.verb || !['open', 'close', 'shut'].includes(command.verb)) {
            return [];
        }

        const scene = this.sceneService.getCurrentScene();
        if (!scene) return [];

        const result: string[] = [];
        

        // Get openable/closeable objects from current scene
        if (scene.objects) {
            console.log('Scene objects:', Object.keys(scene.objects));
            for (const object of Object.values(scene.objects)) {
                const isVisible = await this.checkVisibility(object);
                console.log('Checking scene object:', object.id, object.name, 
                    'visible:', isVisible,
                    'is container:', object.isContainer,
                    'has open interaction:', !!object.interactions?.['open'],
                    'has close interaction:', !!object.interactions?.['close']);
                
                if (isVisible && (object.isContainer || object.interactions?.[command.verb])) {
                    result.push(`${command.verb} ${object.name.toLowerCase()}`);
                }
            }
        }

        console.log('Open/close suggestions:', result);
        return result;
    }
}

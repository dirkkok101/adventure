import { Injectable } from '@angular/core';
import { Command } from '../../models/command.model';
import { CommandHandler } from './command-handler.interface';
import { SceneService } from '../scene.service';
import { GameStateService } from '../game-state.service';
import { processInteraction, checkRequiredFlags } from '../../utils/interaction-utils';

@Injectable({
    providedIn: 'root'
})
export class ExamineCommandService implements CommandHandler {
    constructor(
        private sceneService: SceneService,
        private gameState: GameStateService
    ) {}

    canHandle(command: Command): boolean {
        return command.verb === 'examine' || command.verb === 'x';
    }

    handle(command: Command): string {
        if (!command.object) {
            return 'What do you want to examine?';
        }

        const scene = this.sceneService.getCurrentScene();
        if (!scene?.objects?.[command.object]) {
            return `I don't see any ${command.object} here.`;
        }

        const object = scene.objects[command.object];
        const interaction = object.interactions?.['examine'];
        if (!interaction) {
            return object.descriptions.default;
        }

        const state = this.gameState.getCurrentState();
        
        // Check if the interaction is allowed based on flags
        if (interaction.requiredFlags) {
            const canInteract = checkRequiredFlags(state, interaction.requiredFlags);
            if (!canInteract) {
                return interaction.failureMessage || `You cannot examine that.`;
            }
        }

        // Process the interaction and update game state
        return processInteraction(interaction, state);
    }
}

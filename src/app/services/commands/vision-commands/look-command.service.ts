import { Injectable } from '@angular/core';
import { BaseCommandService } from '../bases/base-command.service';
import { GameStateService } from '../../game-state.service';
import { SceneMechanicsService } from '../../mechanics/scene-mechanics.service';
import { FlagMechanicsService } from '../../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../../mechanics/progress-mechanics.service';
import { LightMechanicsService } from '../../mechanics/light-mechanics.service';
import { InventoryMechanicsService } from '../../mechanics/inventory-mechanics.service';
import { ContainerMechanicsService } from '../../mechanics/container-mechanics.service';
import { ScoreMechanicsService } from '../../mechanics/score-mechanics.service';
import { ExaminationMechanicsService } from '../../mechanics/examination-mechanics.service';
import { GameTextService } from '../../game-text.service';
import { GameCommand, CommandResponse } from '../../../models';

/**
 * Command service for handling look/l commands.
 * Provides basic object examination functionality.
 * 
 * Key Responsibilities:
 * - Handle look commands
 * - Validate look targets
 * - Provide look suggestions
 * 
 * Dependencies:
 * - ExaminationMechanicsService: Core examination logic
 * - SceneMechanicsService: Scene and object access
 * - LightMechanicsService: Visibility checks
 */
@Injectable({
    providedIn: 'root'
})
export class LookCommandService extends BaseCommandService {
    constructor(
        gameState: GameStateService,
        sceneService: SceneMechanicsService,
        flagMechanics: FlagMechanicsService,
        progress: ProgressMechanicsService,
        lightMechanics: LightMechanicsService,
        inventoryMechanics: InventoryMechanicsService,
        containerMechanics: ContainerMechanicsService,
        scoreMechanics: ScoreMechanicsService,
        private examinationMechanics: ExaminationMechanicsService,
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
        return command.verb === 'look' || command.verb === 'l';
    }

    async handle(command: GameCommand): Promise<CommandResponse> {
        // If no object specified, describe the current scene
        if (!command.object) {
            const scene = this.sceneService.getCurrentScene();
            if (!scene) {
                return {
                    success: false,
                    message: this.gameText.get('error.noScene'),
                    incrementTurn: false
                };
            }

            // Check light
            if (!await this.lightMechanics.isLightPresent()) {
                return {
                    success: false,
                    message: this.gameText.get('error.tooDark', { action: 'look' }),
                    incrementTurn: false
                };
            }

            // Get appropriate scene description
            let description = scene.descriptions.default;

            // Use dark description if available and no light
            if (!scene.light && scene.descriptions.dark) {
                description = scene.descriptions.dark;
            }
            // Use visited description if available and scene has been visited
            else if (scene.visited && scene.descriptions.visited) {
                description = scene.descriptions.visited;
            }
            // Check for state-based descriptions
            else if (scene.descriptions.states) {
                for (const [flagCombo, desc] of Object.entries(scene.descriptions.states)) {
                    const flags = flagCombo.split(',');
                    const matches = this.flagMechanics.checkFlags(flags);
                    if (matches) {
                        description = desc;
                        break;
                    }
                }
            }

            return {
                success: true,
                message: description,
                incrementTurn: true
            };
        }

        const object = await this.sceneService.findObjectById(command.object);
        if (!object) {
            return {
                success: false,
                message: this.gameText.get('error.objectNotFound', { item: command.object }),
                incrementTurn: false
            };
        }

        // Check if we can examine the object
        const canExamine = await this.examinationMechanics.canExamine(object);
        if (!canExamine.success) {
            return canExamine;
        }

        // Get the object description
        const description = await this.examinationMechanics.getObjectDescription(object, false);
        return {
            success: true,
            message: description,
            incrementTurn: true
        };
    }

    override async getSuggestions(command: GameCommand): Promise<string[]> {
        if (!command.verb || !['look', 'l'].includes(command.verb)) {
            return [];
        }

        const examinableObjects = await this.examinationMechanics.getExaminableObjects();
        return examinableObjects.map(obj => `${command.verb} ${obj}`);
    }
}

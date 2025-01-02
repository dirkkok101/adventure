import { Injectable } from '@angular/core';
import { GameCommand } from '../../models';
import { SceneMechanicsService } from '../mechanics/scene-mechanics.service';
import { LightMechanicsService } from '../mechanics/light-mechanics.service';
import { ContainerMechanicsService } from '../mechanics/container-mechanics.service';

/**
 * Service responsible for providing container-related command suggestions.
 *
 * State Dependencies:
 * - Scene visibility via LightMechanicsService
 * - Container state via ContainerMechanicsService
 * - Scene state via SceneMechanicsService
 *
 * Key Responsibilities:
 * - Container suggestion generation
 * - Visibility validation
 * - Container state validation
 */
@Injectable({
    providedIn: 'root'
})
export class CommandSuggestionService {
    constructor(
        private sceneService: SceneMechanicsService,
        private lightMechanics: LightMechanicsService,
        private containerMechanics: ContainerMechanicsService
    ) {}

    /**
     * Gets suggestions for container-related commands
     *
     * @param command - The current command being typed
     * @returns Array of suggested container names
     *
     * State Dependencies:
     * - Scene visibility via LightMechanicsService
     * - Container state via ContainerMechanicsService
     */
    getContainerSuggestions(command: GameCommand): string[] {
        const scene = this.sceneService.getCurrentScene();
        if (!scene?.objects || !this.lightMechanics.isLightPresent()) {
            return [];
        }

        // Get visible containers
        const visibleContainers =
            Object.values(scene.objects)
                .filter(obj => obj.isContainer)
                .map(obj => {
                    const isVisible = this.lightMechanics.isObjectVisible(obj);
                    const isLocked = this.containerMechanics.isLocked(obj.id);
                    return isVisible && (!isLocked || command.verb === 'unlock') ? obj.name : null;
                }
        );

        return visibleContainers.filter((name): name is string => name !== null);
    }
}

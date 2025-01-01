import { Injectable } from '@angular/core';
import { GameStateService } from '../../game-state.service';
import { SceneMechanicsService } from '../../mechanics/scene-mechanics.service';
import { FlagMechanicsService } from '../../mechanics/flag-mechanics.service';
import { ProgressMechanicsService } from '../../mechanics/progress-mechanics.service';
import { LightMechanicsService } from '../../mechanics/light-mechanics.service';
import { ScoreMechanicsService } from '../../mechanics/score-mechanics.service';
import { InventoryMechanicsService } from '../../mechanics/inventory-mechanics.service';
import { MovementMechanicsService } from '../../mechanics/movement-mechanics.service';
import { ContainerMechanicsService } from '../../mechanics/container-mechanics.service';
import { GameCommand, CommandResponse } from '../../../models';

@Injectable({
    providedIn: 'root'
})
export class MovementCommandService {
    protected readonly DIRECTIONS = new Set([
        'north', 'south', 'east', 'west', 'up', 'down',
        'n', 's', 'e', 'w', 'u', 'd'
    ]);

    protected readonly DIRECTION_ALIASES: { [key: string]: string } = {
        'n': 'north',
        's': 'south',
        'e': 'east',
        'w': 'west',
        'u': 'up',
        'd': 'down'
    };

    constructor(
        private gameState: GameStateService,
        private sceneService: SceneMechanicsService,
        private flagMechanics: FlagMechanicsService,
        private progress: ProgressMechanicsService,
        private lightMechanics: LightMechanicsService,
        private inventoryMechanics: InventoryMechanicsService,
        private scoreMechanics: ScoreMechanicsService,
        private containerMechanics: ContainerMechanicsService,
        private movementMechanics: MovementMechanicsService
    ) {}

    canHandle(command: GameCommand): boolean {
        return command.verb === 'enter' || this.resolveDirection(command) !== null;
    }

    async handle(command: GameCommand): Promise<CommandResponse> {
        // Try directional movement first
        const direction = this.resolveDirection(command);
        if (direction) {
            return this.movementMechanics.handleMovement(direction);
        }

        return {
            success: false,
            message: "I don't understand that direction.",
            incrementTurn: false
        };
    }

    async getSuggestions(command: GameCommand): Promise<string[]> {
        if (command.verb === 'enter' && !command.object) {
            const scene = this.sceneService.getCurrentScene();
            if (!scene?.objects || !this.checkLightInScene()) {
                return [];
            }
            // Return names of visible objects that might be enterable
            return Object.values(scene.objects)
                .filter(obj => this.lightMechanics.isObjectVisible(obj))
                .map(obj => obj.name);
        }
        return this.movementMechanics.getAvailableExits();
    }

    protected resolveDirection(command: GameCommand): string | null {
        let direction = command.verb;
        
        // Handle 'go', 'move', or 'enter' commands with directional objects
        if ((command.verb === 'go' || command.verb === 'move' || command.verb === 'enter') && command.object) {
            direction = command.object;
        }

        // Check if it's a valid direction
        if (!this.DIRECTIONS.has(direction.toLowerCase())) {
            return null;
        }

        // Resolve aliases
        return this.DIRECTION_ALIASES[direction.toLowerCase()] || direction.toLowerCase();
    }
}

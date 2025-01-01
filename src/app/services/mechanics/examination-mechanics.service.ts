import { Injectable } from '@angular/core';
import { SceneMechanicsService } from './scene-mechanics.service';
import { FlagMechanicsService } from './flag-mechanics.service';
import { LightMechanicsService } from './light-mechanics.service';
import { ContainerMechanicsService } from './container-mechanics.service';
import { ScoreMechanicsService } from './score-mechanics.service';
import { GameTextService } from '../game-text.service';
import { SceneObject, CommandResponse } from '../../models';

/**
 * Service responsible for handling object examination mechanics.
 * 
 * State Dependencies (via FlagMechanicsService):
 * - [objectId]_examined: Tracks if object has been examined
 * - [objectId]_score_examine: Tracks if examine score has been awarded
 * - [objectId]_state_[stateName]: Object state flags
 * 
 * Service Dependencies:
 * - FlagMechanicsService: State management and flag tracking
 * - LightMechanicsService: Visibility checks
 * - ContainerMechanicsService: Container content handling
 * - SceneMechanicsService: Scene and object access
 * - ScoreMechanicsService: Examination scoring
 * - GameTextService: Localized text
 * 
 * Key Responsibilities:
 * - Object description management
 * - State-based descriptions
 * - Container content descriptions
 * - Visibility checks
 * - Examination scoring
 * 
 * Error Handling:
 * - Validates object visibility
 * - Checks light conditions
 * - Validates container access
 * - Provides descriptive error messages
 * 
 * State Management:
 * - All state changes go through FlagMechanicsService
 * - State queries use FlagMechanicsService
 * - Maintains data consistency
 */
@Injectable({
    providedIn: 'root'
})
export class ExaminationMechanicsService {
    constructor(
        private sceneService: SceneMechanicsService,
        private flagMechanics: FlagMechanicsService,
        private lightMechanics: LightMechanicsService,
        private containerMechanics: ContainerMechanicsService,
        private scoreMechanics: ScoreMechanicsService,
        private gameText: GameTextService
    ) {}

    /**
     * Get the description for an object based on its state and type
     * @param object Object to get description for
     * @param detailed Whether to use detailed (examine) description
     * @returns Description text with any applicable container contents
     * 
     * State Effects:
     * - May update examination score flags
     * - May update first-time examination flags
     * 
     * Error Conditions:
     * - Object not visible
     * - No light present
     */
    async getObjectDescription(object: SceneObject, detailed: boolean = false): Promise<string> {
        // Validate visibility
        const canExamine = await this.canExamine(object);
        if (!canExamine.success) {
            return this.gameText.get('error.cannotExamine', { item: object.name });
        }

        // Get base description
        const description = await this.getBaseDescription(object, detailed);

        // Add container contents if applicable
        const containerDesc = object.isContainer ? 
            await this.containerMechanics.getContainerContents(object) : '';

        // Handle scoring
        await this.handleExaminationScoring(object, detailed);

        return description + (containerDesc ? '\n\n' + containerDesc : '');
    }

    /**
     * Get the base description for an object
     * @param object Object to get description for
     * @param detailed Whether to use detailed description
     * @returns Base description text
     * 
     * State Dependencies:
     * - Object state flags for state-based descriptions
     */
    private async getBaseDescription(object: SceneObject, detailed: boolean): Promise<string> {
        // For brief descriptions, return default
        if (!detailed) {
            return object.descriptions.default;
        }

        // For detailed examination, prefer examine description
        if (object.descriptions.examine) {
            return object.descriptions.examine;
        }

        // Fall back to state-based description
        return this.getStateBasedDescription(object);
    }

    /**
     * Get state-based description for an object
     * @param object Object to get description for
     * @returns Description based on current object state
     */
    private getStateBasedDescription(object: SceneObject): string {
        let description = object.descriptions.default;

        if (object.descriptions.states) {
            for (const [flagCombo, desc] of Object.entries(object.descriptions.states)) {
                const flags = flagCombo.split(',');
                if (this.flagMechanics.checkFlags(flags)) {
                    description = desc;
                    break;
                }
            }
        }

        return description;
    }

    /**
     * Handle scoring for examining objects
     * @param object Object being examined
     * @param detailed Whether this is a detailed examination
     * 
     * State Effects:
     * - May update score via ScoreMechanicsService
     * - Sets examination scored flag
     */
    private async handleExaminationScoring(object: SceneObject, detailed: boolean): Promise<void> {
        if (!detailed || !object.scoring?.examine) {
            return;
        }

        // Track examination
        this.flagMechanics.setObjectExamined(object.id);

        // Handle scoring if not already scored
        if (!this.flagMechanics.isExamineScored(object.id)) {
            await this.scoreMechanics.addScore(object.scoring.examine);
            this.flagMechanics.setExamineScored(object.id);
        }
    }

    /**
     * Get list of objects that can be examined in current context
     * @returns Array of object names that can be examined
     * 
     * State Dependencies:
     * - Light state
     * - Container open states
     */
    async getExaminableObjects(): Promise<string[]> {
        // Check light first
        if (!await this.lightMechanics.isLightPresent()) {
            return [];
        }

        const scene = this.sceneService.getCurrentScene();
        if (!scene?.objects) {
            return [];
        }

        const suggestions = new Set<string>();

        for (const obj of Object.values(scene.objects)) {
            if (!await this.isObjectExaminable(obj)) {
                continue;
            }

            suggestions.add(obj.name.toLowerCase());
        }

        return Array.from(suggestions);
    }

    /**
     * Check if an object can be examined
     * @param object Object to check
     * @returns CommandResponse indicating if examination is possible
     * 
     * State Dependencies:
     * - Light state
     * - Object visibility
     */
    async canExamine(object: SceneObject): Promise<CommandResponse> {
        if (!await this.lightMechanics.isLightPresent()) {
            return {
                success: false,
                message: this.gameText.get('error.tooDark', { action: 'examine' }),
                incrementTurn: false
            };
        }

        if (!await this.lightMechanics.isObjectVisible(object)) {
            return {
                success: false,
                message: this.gameText.get('error.objectNotVisible', { item: object.name }),
                incrementTurn: false
            };
        }

        return {
            success: true,
            message: '',
            incrementTurn: false
        };
    }

    /**
     * Check if an object is currently examinable
     * @param object Object to check
     * @returns Whether the object can be examined
     * 
     * State Dependencies:
     * - Light state
     * - Object visibility
     * - Container states
     */
    public async isObjectExaminable(object: SceneObject): Promise<boolean> {
        // Check visibility
        if (!await this.lightMechanics.isObjectVisible(object)) {
            return false;
        }

        // Check if in closed container
        const container = this.containerMechanics.findContainerWithItem(object.id);
        if (container && !await this.containerMechanics.isOpen(container.id)) {
            return false;
        }

        // Check if object has examination properties
        return !!(object.descriptions?.examine || object.interactions?.['examine']);
    }
}

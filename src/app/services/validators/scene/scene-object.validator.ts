import { Scene, SceneObject } from '../../../models/game-state.model';
import { ValidationError } from '../validation-error.model';

export class SceneObjectValidator {
    validateSceneObjects(sceneId: string, scene: Scene): ValidationError[] {
        const errors: ValidationError[] = [];

        if (!scene.objects) return errors;

        for (const [objectId, object] of Object.entries(scene.objects)) {
            errors.push(...this.validateObject(sceneId, objectId, object));
        }

        return errors;
    }

    private validateObject(sceneId: string, objectId: string, object: SceneObject): ValidationError[] {
        const errors: ValidationError[] = [];

        // Basic object validation
        if (!object.name) {
            errors.push({
                scene: sceneId,
                type: 'error',
                message: `Object ${objectId} missing name`
            });
        }

        if (!object.descriptions?.default) {
            errors.push({
                scene: sceneId,
                type: 'error',
                message: `Object ${objectId} missing default description`
            });
        }

        // Container validation
        if (object.isContainer && object.capacity === undefined) {
            errors.push({
                scene: sceneId,
                type: 'error',
                message: `Container object ${objectId} missing capacity`
            });
        }

        // Weight validation
        if (object.canTake && object.weight === undefined) {
            errors.push({
                scene: sceneId,
                type: 'error',
                message: `Takeable object ${objectId} missing weight`
            });
        }

        // Interaction validation
        if (object.interactions) {
            for (const [action, interaction] of Object.entries(object.interactions)) {
                if (!interaction.message) {
                    errors.push({
                        scene: sceneId,
                        type: 'error',
                        message: `Object ${objectId} interaction ${action} missing message`
                    });
                }

                if (interaction.requiredFlags && interaction.requiredFlags.length > 0 && !interaction.failureMessage) {
                    errors.push({
                        scene: sceneId,
                        type: 'warning',
                        message: `Object ${objectId} interaction ${action} has required flags but no failure message`
                    });
                }
            }
        }

        return errors;
    }
}

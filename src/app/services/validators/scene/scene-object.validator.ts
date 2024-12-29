import { Scene, SceneObject } from '../../../models/game-state.model';
import { ValidationError } from '../validation-error.model';

export class SceneObjectValidator {
    validateSceneObjects(sceneId: string, scene: Scene): ValidationError[] {
        const errors: ValidationError[] = [];
        
        if (!scene.objects) {
            errors.push({
                scene: sceneId,
                type: 'error',
                message: 'Scene has no objects defined',
                path: 'objects',
                fix: 'Add objects: {} to scene'
            });
            return errors;
        }

        for (const [objectId, object] of Object.entries(scene.objects)) {
            errors.push(...this.validateObject(sceneId, objectId, object));
        }

        return errors;
    }

    private validateObject(sceneId: string, objectId: string, object: SceneObject): ValidationError[] {
        const errors: ValidationError[] = [];
        const path = `objects.${objectId}`;

        // Required fields
        if (!object.id) {
            errors.push({
                scene: sceneId,
                type: 'error',
                message: `Object ${objectId} missing required field: id`,
                path: `${path}.id`,
                fix: `Add id: '${objectId}' to object`
            });
        } else if (object.id !== objectId) {
            errors.push({
                scene: sceneId,
                type: 'error',
                message: `Object ${objectId} has mismatched id: ${object.id}`,
                path: `${path}.id`,
                fix: `Change id to '${objectId}'`
            });
        }

        if (!object.name) {
            errors.push({
                scene: sceneId,
                type: 'error',
                message: `Object ${objectId} missing required field: name`,
                path: `${path}.name`,
                fix: 'Add name field to object'
            });
        }

        if (object.visibleOnEntry === undefined) {
            errors.push({
                scene: sceneId,
                type: 'error',
                message: `Object ${objectId} missing required field: visibleOnEntry`,
                path: `${path}.visibleOnEntry`,
                fix: 'Add visibleOnEntry: true or false'
            });
        }

        if (object.canTake === undefined) {
            errors.push({
                scene: sceneId,
                type: 'error',
                message: `Object ${objectId} missing required field: canTake`,
                path: `${path}.canTake`,
                fix: 'Add canTake: true or false'
            });
        }

        // Validate descriptions
        if (!object.descriptions) {
            errors.push({
                scene: sceneId,
                type: 'error',
                message: `Object ${objectId} missing required field: descriptions`,
                path: `${path}.descriptions`,
                fix: 'Add descriptions object with default message'
            });
        } else if (!object.descriptions.default) {
            errors.push({
                scene: sceneId,
                type: 'error',
                message: `Object ${objectId} missing default description`,
                path: `${path}.descriptions.default`,
                fix: 'Add default description message'
            });
        }

        // Validate interactions
        if (object.interactions) {
            for (const [interactionId, interaction] of Object.entries(object.interactions)) {
                if (!interaction.message) {
                    errors.push({
                        scene: sceneId,
                        type: 'error',
                        message: `Object ${objectId} interaction ${interactionId} missing required field: message`,
                        path: `${path}.interactions.${interactionId}.message`,
                        fix: 'Add message for interaction'
                    });
                }
            }
        }

        return errors;
    }
}

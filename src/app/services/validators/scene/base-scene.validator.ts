import { ValidationError } from '../validation-error.model';
import {Scene} from '../../../models';

export class BaseSceneValidator {
    validateScene(sceneId: string, scene: Scene): ValidationError[] {
        const errors: ValidationError[] = [];
        const path = sceneId;

        // Required fields
        if (!scene.id) {
            errors.push({
                scene: sceneId,
                type: 'error',
                message: 'Scene missing required field: id',
                path: `${path}.id`,
                fix: `Add id: '${sceneId}' to scene`
            });
        } else if (scene.id !== sceneId) {
            errors.push({
                scene: sceneId,
                type: 'error',
                message: `Scene has mismatched id: ${scene.id}`,
                path: `${path}.id`,
                fix: `Change id to '${sceneId}'`
            });
        }

        if (!scene.name) {
            errors.push({
                scene: sceneId,
                type: 'error',
                message: 'Scene missing required field: name',
                path: `${path}.name`,
                fix: 'Add name field to scene'
            });
        }

        if (!scene.region) {
            errors.push({
                scene: sceneId,
                type: 'error',
                message: 'Scene missing required field: region',
                path: `${path}.region`,
                fix: 'Add region field to scene'
            });
        }

        if (scene.light === undefined) {
            errors.push({
                scene: sceneId,
                type: 'error',
                message: 'Scene missing required field: light',
                path: `${path}.light`,
                fix: 'Add light: true or false'
            });
        }

        // Validate descriptions
        if (!scene.descriptions) {
            errors.push({
                scene: sceneId,
                type: 'error',
                message: 'Scene missing required field: descriptions',
                path: `${path}.descriptions`,
                fix: 'Add descriptions object with default message'
            });
        } else if (!scene.descriptions.default) {
            errors.push({
                scene: sceneId,
                type: 'error',
                message: 'Scene missing default description',
                path: `${path}.descriptions.default`,
                fix: 'Add default description message'
            });
        }

        return errors;
    }
}

import { Injectable } from '@angular/core';
import { scenes } from '../../../data/scenes';
import { ValidationError, ValidationSummary } from '../validation-error.model';
import { BaseSceneValidator } from './base-scene.validator';
import { SceneObjectValidator } from './scene-object.validator';
import { SceneExitValidator } from './scene-exit.validator';

@Injectable({
    providedIn: 'root'
})
export class SceneValidatorService {
    private baseValidator = new BaseSceneValidator();
    private objectValidator = new SceneObjectValidator();
    private exitValidator = new SceneExitValidator();

    validateAllScenes(): ValidationSummary {
        const errors: ValidationError[] = [];
        
        // Check if we have any scenes
        if (Object.keys(scenes).length === 0) {
            errors.push({
                scene: 'global',
                type: 'error',
                message: 'No scenes defined in the game'
            });
            return this.createSummary(errors);
        }

        // Validate each scene
        for (const [sceneId, scene] of Object.entries(scenes)) {
            errors.push(
                ...this.baseValidator.validateScene(sceneId, scene),
                ...this.objectValidator.validateSceneObjects(sceneId, scene),
                ...this.exitValidator.validateSceneExits(sceneId, scene)
            );
        }

        return this.createSummary(errors);
    }

    private createSummary(errors: ValidationError[]): ValidationSummary {
        const errorCount = errors.filter(e => e.type === 'error').length;
        const warningCount = errors.filter(e => e.type === 'warning').length;

        return {
            errors: errorCount,
            warnings: warningCount,
            details: errors,
            toString: () => {
                if (errors.length === 0) {
                    return 'All scenes validated successfully!';
                }

                const lines: string[] = [];
                
                // Group by scene
                const byScene = new Map<string, ValidationError[]>();
                errors.forEach(error => {
                    const scene = error.scene;
                    if (!byScene.has(scene)) {
                        byScene.set(scene, []);
                    }
                    byScene.get(scene)!.push(error);
                });

                // Output each scene's errors
                byScene.forEach((sceneErrors, scene) => {
                    lines.push(`Scene: ${scene}`);
                    sceneErrors.forEach(error => {
                        const prefix = error.type === 'error' ? '❌' : '⚠️';
                        let message = `${prefix} ${error.message}`;
                        if (error.path) {
                            message += ` at: ${error.path}`;
                        }
                        if (error.fix) {
                            message += ` fix: ${error.fix}`;
                        }
                        lines.push(message);
                    });
                });

                return lines.join('\n');
            }
        };
    }
}

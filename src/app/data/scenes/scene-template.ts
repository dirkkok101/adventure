import { Scene, SceneObject, SceneInteraction } from '../../models/game-state.model';

/**
 * Template for creating new scenes
 * Copy this file and modify it to create a new scene
 */
export const sceneTemplate: Scene = {
    id: 'sceneTemplate',
    name: 'Scene Template',
    region: 'Template Region',
    light: true,
    descriptions: {
        default: 'This is a template scene. Describe the scene here.',
        dark: 'It is pitch dark. You are likely to be eaten by a grue.',
        states: {
            'someFlag': 'Description of the scene when someFlag is set.'
        }
    },
    objects: {
        templateObject: {
            id: 'templateObject',
            name: 'Template Object',
            visibleOnEntry: true,
            descriptions: {
                default: 'Description of the object.',
                states: {
                    'someFlag': 'Description of the object when someFlag is set.'
                }
            },
            interactions: {
                examine: {
                    message: 'Examining the object reveals...',
                    states: {
                        'someFlag': 'Description when examining the object with someFlag set.'
                    }
                },
                take: {
                    message: 'You take the object.',
                    failureMessage: 'You cannot take that.',
                    grantsFlags: ['hasObject'],
                    score: 5
                }
            } as { [key: string]: SceneInteraction }
        } as SceneObject,
        templateContainer: {
            id: 'templateContainer',
            name: 'Template Container',
            visibleOnEntry: true,
            isContainer: true,
            isOpen: false,
            capacity: 5,
            descriptions: {
                default: 'Description of the container.',
                contents: 'The container contains:',
                empty: 'The container is empty.',
                states: {
                    'containerOpen': 'The container is open.'
                }
            },
            interactions: {
                examine: {
                    message: 'The container appears to be closed.',
                    states: {
                        'containerOpen': 'The container is open, revealing its contents.'
                    }
                },
                open: {
                    message: 'You open the container.',
                    grantsFlags: ['containerOpen'],
                    requiredFlags: ['!containerOpen'],
                    score: 5
                },
                close: {
                    message: 'You close the container.',
                    removesFlags: ['containerOpen'],
                    requiredFlags: ['containerOpen']
                }
            } as { [key: string]: SceneInteraction }
        } as SceneObject
    },
    exits: [
        {
            direction: 'north',
            targetScene: 'targetScene',
            description: 'A path leads north.',
            requiredFlags: ['someFlag'],
            failureMessage: 'You cannot go that way until someFlag is set.'
        }
    ]
};

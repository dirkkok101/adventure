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
        default: 'This is a template scene. You can see various objects here.',
        states: {
            'someFlag': 'The scene looks different when someFlag is set.',
            'objectMoved': 'The scene looks different after moving an object.'
        }
    },
    objects: {
        templateObject: {
            id: 'templateObject',
            name: 'Template Object',
            visibleOnEntry: true,
            canTake: true,
            descriptions: {
                default: 'Description of the object.',
                states: {
                    'someFlag': 'Description when someFlag is set.',
                    'hasItem': 'Description after item is taken.',
                    'itemUsed': 'Description after item is used.'
                }
            },
            interactions: {
                // Examine is handled by ExamineCommandService
                examine: {
                    message: 'Examining the object reveals...',
                    states: {
                        'someFlag': 'Different examine description when someFlag is set.'
                    }
                },
                // Take is handled by TakeCommandService
                take: {
                    message: 'You take the object.',
                    failureMessage: 'You cannot take that.',
                    grantsFlags: ['hasItem'],
                    removesFlags: ['itemVisible'],
                    score: 5
                },
                // Push/Pull are physical interactions
                push: {
                    message: 'You push the object.',
                    grantsFlags: ['objectMoved'],
                    revealsObjects: ['hiddenObject'],
                    requiredFlags: ['!objectMoved'],
                    score: 5
                },
                pull: {
                    message: 'You pull the object.',
                    grantsFlags: ['objectMoved'],
                    revealsObjects: ['hiddenObject'],
                    requiredFlags: ['!objectMoved'],
                    score: 5
                },
                // Read is handled by ReadCommandService
                read: {
                    message: 'You read the text on the object.',
                    requiredFlags: ['hasLight']
                },
                // Use interactions for combining items
                use_with_key: {
                    message: 'You use the key with the object.',
                    grantsFlags: ['objectUnlocked'],
                    removesFlags: ['isLocked'],
                    requiredFlags: ['hasKey', '!objectUnlocked'],
                    score: 10
                }
            },
            scoring: {
                use: 5,
                containerTargets: {
                    'targetObject': 10
                }
            }
        },
        hiddenObject: {
            id: 'hiddenObject',
            name: 'Hidden Object',
            visibleOnEntry: false,
            canTake: true,
            descriptions: {
                default: 'This object was hidden until revealed.',
                states: {
                    'hasItem': 'Description after taking the hidden object.'
                }
            },
            interactions: {
                examine: {
                    message: 'The hidden object appears to be important.',
                    states: {
                        'someFlag': 'The hidden object looks different when someFlag is set.'
                    }
                },
                take: {
                    message: 'You take the hidden object.',
                    grantsFlags: ['hasHiddenItem'],
                    score: 10
                }
            }
        },
        container: {
            id: 'container',
            name: 'Container',
            visibleOnEntry: true,
            isContainer: true,
            capacity: 5,
            descriptions: {
                default: 'A container that can hold items.',
                states: {
                    'isOpen': 'The container is open.',
                    'isClosed': 'The container is closed.'
                }
            },
            interactions: {
                // Open/Close handled by OpenCloseCommandService
                open: {
                    message: 'You open the container.',
                    grantsFlags: ['isOpen'],
                    removesFlags: ['isClosed'],
                    requiredFlags: ['!isOpen', '!isLocked']
                },
                close: {
                    message: 'You close the container.',
                    grantsFlags: ['isClosed'],
                    removesFlags: ['isOpen']
                },
                examine: {
                    message: 'A sturdy container that can hold items.',
                    states: {
                        'isOpen': 'The container is open. Inside you can see:',
                        'isClosed': 'The container is closed.'
                    }
                }
            }
        }
    },
    exits: [
        {
            direction: 'north',
            targetScene: 'targetScene',
            description: 'Path leading north.',
            requiredFlags: ['someFlag'],
            failureMessage: 'You cannot go that way right now.'
        }
    ]
};

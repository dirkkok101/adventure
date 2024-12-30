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
            // Multiple flags can be combined with commas
            'someFlag': 'Description when someFlag is set.',
            'hasItem': 'Description when item is taken.',
            'someFlag,hasItem': 'Description when both flags are set.',
            '!someFlag,hasItem': 'Description when someFlag is NOT set but hasItem is.'
        }
    },
    objects: {
        templateObject: {
            id: 'templateObject',
            name: 'Template Object',
            visibleOnEntry: true,
            canTake: true, // Whether the object can be taken
            weight: 1, // Weight for inventory purposes
            isTreasure: false, // Whether this is a treasure for the trophy case
            descriptions: {
                default: 'Description of the object.',
                states: {
                    'someFlag': 'Description when someFlag is set.',
                    'hasItem': 'Description after item is taken.',
                    'itemUsed': 'Description after item is used.'
                }
            },
            interactions: {
                examine: {
                    message: 'Examining the object reveals...',
                    states: {
                        'someFlag': 'Different examine description when someFlag is set.'
                    }
                },
                take: {
                    message: 'You take the object.',
                    failureMessage: 'You cannot take that.',
                    grantsFlags: ['hasItem'],
                    removesFlags: ['itemVisible'],
                    score: 5
                },
                move: {
                    message: 'You move the object.',
                    grantsFlags: ['objectMoved'],
                    revealsObjects: ['hiddenObject'], // Makes other objects visible
                    requiredFlags: ['!objectMoved'],
                    score: 5
                },
                read: {
                    message: 'You read the text on the object.',
                    requiredFlags: ['hasLight'] // Can require flags for actions
                },
                use: {
                    message: 'You use the object.',
                    grantsFlags: ['itemUsed'],
                    removesFlags: ['hasItem'],
                    requiredFlags: ['hasItem', '!itemUsed'],
                    score: 10
                },
                on: {
                    message: 'You turn the object on.',
                    grantsFlags: ['objectOn', 'hasLight'],
                    requiredFlags: ['hasItem', '!objectOn', '!objectDead'],
                    failureMessage: 'You can\'t turn that on.'
                },
                off: {
                    message: 'You turn the object off.',
                    removesFlags: ['objectOn', 'hasLight'],
                    requiredFlags: ['objectOn']
                }
            }
        },
        templateContainer: {
            id: 'templateContainer',
            name: 'Template Container',
            visibleOnEntry: true,
            canTake: false,
            isContainer: true,
            isOpen: false,
            capacity: 5,
            descriptions: {
                default: 'Description of the container.',
                contents: 'The container contains:', // Used when listing contents
                empty: 'The container is empty.',
                states: {
                    'containerOpen': 'The container is open.',
                    'hasItem': 'Description changes when items are inside.'
                }
            },
            interactions: {
                examine: {
                    message: 'The container appears to be closed.',
                    states: {
                        'containerOpen': 'The container is open, revealing its contents.',
                        'containerOpen,hasItem': 'The container is open, containing some items.'
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
                },
                enter: {
                    message: 'You enter the container.',
                    requiredFlags: ['containerOpen'],
                    failureMessage: 'The container must be opened first.'
                }
            }
        },
        hiddenObject: {
            id: 'hiddenObject',
            name: 'Hidden Object',
            visibleOnEntry: false, // Hidden until revealed
            canTake: true,
            weight: 1,
            descriptions: {
                default: 'A previously hidden object.',
                states: {
                    'hasItem': 'Description after taking the hidden item.'
                }
            },
            interactions: {
                examine: {
                    message: 'You examine the hidden object.',
                    requiredFlags: ['objectMoved'], // Only accessible after being revealed
                    failureMessage: 'You can\'t see any such thing.'
                },
                take: {
                    message: 'You take the hidden object.',
                    grantsFlags: ['hasHiddenItem'],
                    requiredFlags: ['objectMoved'],
                    score: 10
                }
            }
        }
    },
    exits: [
        {
            direction: 'north',
            targetScene: 'targetScene',
            description: 'A path leads north.',
            requiredFlags: ['someFlag', 'hasLight'], // Can require multiple flags
            failureMessage: 'You can\'t go that way right now.'
        },
        {
            direction: 'down',
            targetScene: 'basement',
            description: 'A staircase leads down.',
            requiredFlags: ['trapdoorOpen', 'hasLight'],
            failureMessage: 'You need to open the trapdoor first.'
        }
    ]
};

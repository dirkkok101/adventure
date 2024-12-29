import { Scene, SceneObject, SceneInteraction } from '../../models/game-state.model';

export const closet: Scene = {
    id: 'closet',
    name: 'Closet',
    region: 'Inside House',
    light: false,
    descriptions: {
        default: 'This is a cramped closet. The only exit is a gothic door leading west back to the living room.',
        dark: 'It is pitch dark. You are likely to be eaten by a grue.',
        states: {
            'hasLight': 'This is a cramped closet filled with old coats and a rusty toolbox. A gothic door leads west back to the living room.'
        }
    },
    objects: {
        coats: {
            id: 'coats',
            name: 'Old Coats',
            visibleOnEntry: true,
            descriptions: {
                default: 'Several old coats hang from hooks on the wall.'
            },
            interactions: {
                examine: {
                    message: 'The coats are old and musty. They look like they haven\'t been worn in years.',
                    requiredFlags: ['hasLight']
                },
                search: {
                    message: 'You search through the coat pockets but find nothing of interest.',
                    requiredFlags: ['hasLight']
                },
                take: {
                    message: 'The coats are too old and musty to be of any use.',
                    failureMessage: 'You decide against taking any of the old coats.',
                    requiredFlags: ['hasLight']
                }
            } as { [key: string]: SceneInteraction }
        } as SceneObject,
        toolbox: {
            id: 'toolbox',
            name: 'Rusty Toolbox',
            visibleOnEntry: true,
            isContainer: true,
            isOpen: false,
            capacity: 5,
            descriptions: {
                default: 'A rusty metal toolbox sits on the floor.',
                contents: 'The toolbox contains:',
                empty: 'The toolbox is empty.'
            },
            interactions: {
                examine: {
                    message: 'The toolbox is made of metal and quite rusty. It appears to be closed.',
                    states: {
                        'toolboxOpen': 'The toolbox is made of metal and quite rusty. It\'s open, revealing its contents.'
                    },
                    requiredFlags: ['hasLight']
                },
                open: {
                    message: 'You open the rusty toolbox. The hinges creak loudly.',
                    grantsFlags: ['toolboxOpen'],
                    requiredFlags: ['hasLight', '!toolboxOpen']
                },
                close: {
                    message: 'You close the toolbox with a metallic clang.',
                    removesFlags: ['toolboxOpen'],
                    requiredFlags: ['hasLight', 'toolboxOpen']
                },
                take: {
                    message: 'The toolbox is too heavy to carry around.',
                    failureMessage: 'The toolbox is quite heavy and probably better left here.',
                    requiredFlags: ['hasLight']
                }
            } as { [key: string]: SceneInteraction }
        } as SceneObject,
        gothicDoor: {
            id: 'gothicDoor',
            name: 'Gothic Door',
            visibleOnEntry: true,
            descriptions: {
                default: 'A wooden door with gothic lettering leads west.',
                states: {
                    'gothicDoorOpen': 'The gothic door is open, leading west to the living room.'
                }
            },
            interactions: {
                examine: {
                    message: 'The door is made of solid wood with ornate gothic lettering carved into it. From this side, the letters spell "Living Room".',
                    states: {
                        'gothicDoorOpen': 'The ornate gothic door is open, leading back to the living room.'
                    },
                    requiredFlags: ['hasLight']
                },
                read: {
                    message: 'The gothic lettering spells out "Living Room" in an ornate, medieval style.',
                    requiredFlags: ['hasLight']
                },
                open: {
                    message: 'The door opens smoothly.',
                    grantsFlags: ['gothicDoorOpen'],
                    requiredFlags: ['hasLight', '!gothicDoorOpen']
                },
                close: {
                    message: 'You close the gothic door.',
                    removesFlags: ['gothicDoorOpen'],
                    requiredFlags: ['hasLight', 'gothicDoorOpen']
                }
            } as { [key: string]: SceneInteraction }
        } as SceneObject
    },
    exits: [
        {
            direction: 'west',
            targetScene: 'livingRoom',
            description: 'A gothic door leads west to the living room.',
            requiredFlags: ['hasLight', 'gothicDoorOpen'],
            failureMessage: 'The gothic door is closed.'
        }
    ]
};

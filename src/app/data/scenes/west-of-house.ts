import { Scene, SceneInteraction, SceneObject } from "../../models";

export const westOfHouse: Scene = {
    id: 'westOfHouse',
    name: 'West of House',
    region: 'Outside House',
    light: true,
    descriptions: {
        default: 'You are standing in an open field west of a white house, with a boarded front door. A small window is visible on this side of the house. There is a small mailbox here.',
        states: {
            'mailboxOpen,mailboxEmpty': 'You are standing in an open field west of a white house, with a boarded front door. A small window is visible on this side of the house. There is a small mailbox here, its door open and empty.',
            'mailboxOpen,!mailboxEmpty': 'You are standing in an open field west of a white house, with a boarded front door. A small window is visible on this side of the house. There is a small mailbox here, its door open, revealing a leaflet inside.',
            'windowOpen': 'You are standing in an open field west of a white house. A window on this side of the house stands open. There is a small mailbox here.'
        }
    },
    objects: {
        house: {
            id: 'house',
            name: 'White House',
            visibleOnEntry: true,
            canTake: false,
            descriptions: {
                default: 'The house is a beautiful colonial house which is painted white. It is clear that the owners must have been quite wealthy.'
            },
            interactions: {
                examine: {
                    message: 'The house is a beautiful colonial house which is painted white. It is clear that the owners must have been quite wealthy.'
                },
                enter: {
                    message: 'The door is boarded and cannot be opened.',
                    failureMessage: 'The door is boarded shut.'
                }
            } as { [key: string]: SceneInteraction }
        } as SceneObject,
        window: {
            id: 'window',
            name: 'Window',
            visibleOnEntry: true,
            canTake: false,
            descriptions: {
                default: 'The window is slightly ajar.',
                states: {
                    'windowOpen': 'The window is open.'
                }
            },
            interactions: {
                examine: {
                    message: 'The window is slightly ajar. It looks like it could be opened wider.',
                    states: {
                        'windowOpen': 'The window is wide open, revealing the kitchen inside.'
                    }
                },
                open: {
                    message: 'With a little effort, you open the window wide enough to enter.',
                    grantsFlags: ['windowOpen'],
                    requiredFlags: ['!windowOpen'],
                    score: 5
                },
                close: {
                    message: 'You close the window.',
                    removesFlags: ['windowOpen'],
                    requiredFlags: ['windowOpen']
                },
                enter: {
                    message: 'You climb through the window into the kitchen.',
                    requiredFlags: ['windowOpen'],
                    failureMessage: 'The window needs to be opened wider first.'
                }
            } as { [key: string]: SceneInteraction }
        } as SceneObject,
        mailbox: {
            id: 'mailbox',
            name: 'Mailbox',
            visibleOnEntry: true,
            canTake: false,
            isContainer: true,
            isOpen: false,
            capacity: 1,
            descriptions: {
                default: 'There is a small mailbox here.',
                contents: 'The mailbox contains:',
                empty: 'The mailbox is empty.',
                states: {
                    'mailboxOpen': 'The mailbox door is open.',
                    'mailboxEmpty': 'The mailbox door is open, and the mailbox is empty.'
                }
            },
            interactions: {
                examine: {
                    message: 'It\'s a small mailbox.',
                    states: {
                        'mailboxOpen': 'The mailbox door is open.',
                        'mailboxEmpty': 'The mailbox door is open, and it\'s empty.'
                    }
                },
                open: {
                    message: 'Opening the small mailbox reveals a leaflet.',
                    grantsFlags: ['mailboxOpen'],
                    requiredFlags: ['!mailboxOpen'],
                    revealsObjects: ['leaflet'],
                    score: 5
                },
                close: {
                    message: 'You close the mailbox.',
                    removesFlags: ['mailboxOpen'],
                    requiredFlags: ['mailboxOpen']
                }
            } as { [key: string]: SceneInteraction }
        } as SceneObject,
        leaflet: {
            id: 'leaflet',
            name: 'Leaflet',
            visibleOnEntry: false,
            canTake: true,
            weight: 1,
            descriptions: {
                default: 'A simple leaflet.'
            },
            interactions: {
                examine: {
                    message: 'Welcome to Zork!\n\nZork is a game of adventure, danger, and low cunning. In it you will explore some of the most amazing territory ever seen by mortals.',
                    requiredFlags: ['mailboxOpen|hasLeaflet']
                },
                read: {
                    message: 'Welcome to Zork!\n\nZork is a game of adventure, danger, and low cunning. In it you will explore some of the most amazing territory ever seen by mortals.',
                    requiredFlags: ['mailboxOpen|hasLeaflet']
                },
                take: {
                    message: 'You take the leaflet from the mailbox.',
                    grantsFlags: ['hasLeaflet', 'mailboxEmpty'],
                    requiredFlags: ['mailboxOpen', '!hasLeaflet'],
                    addToInventory: ['leaflet'],
                    removeFromContainer: {
                        containerId: 'mailbox',
                        itemIds: ['leaflet']
                    },
                    score: 5
                }
            } as { [key: string]: SceneInteraction }
        } as SceneObject,
        door: {
            id: 'door',
            name: 'Front Door',
            visibleOnEntry: true,
            canTake: false,
            descriptions: {
                default: 'The front door is boarded up.'
            },
            interactions: {
                examine: {
                    message: 'The door is boarded shut with large wooden planks.'
                },
                open: {
                    message: 'The door cannot be opened.',
                    failureMessage: 'The door is securely boarded and cannot be opened.'
                }
            } as { [key: string]: SceneInteraction }
        } as SceneObject
    },
    exits: [
        {
            direction: 'north',
            targetScene: 'northOfHouse',
            description: 'The path leads north along the house.'
        },
        {
            direction: 'south',
            targetScene: 'southOfHouse',
            description: 'The path leads south along the house.'
        },
        {
            direction: 'west',
            targetScene: 'forest',
            description: 'A forest path leads west into the trees.'
        },
        {
            direction: 'east',
            targetScene: 'kitchen',
            description: 'You can enter through the window.',
            requiredFlags: ['windowOpen'],
            failureMessage: 'The window needs to be opened first.'
        }
    ]
};

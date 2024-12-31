import { Scene } from '../../models/game-state.model';

export const kitchen: Scene = {
    id: 'kitchen',
    name: 'Kitchen',
    region: 'house',
    light: true,
    descriptions: {
        default: 'You are in the kitchen of the white house. A table seems to have been used recently for the preparation of food. A passage leads to the west and a dark staircase can be seen leading upward. A window looks out onto the front yard. On the table is an elongated brown sack, smelling of hot peppers.',
        states: {
            'hasSack': 'You are in the kitchen of the white house. A table seems to have been used recently for the preparation of food. A passage leads to the west and a dark staircase can be seen leading upward. A window looks out onto the front yard.',
            'windowOpen': 'You are in the kitchen of the white house. A table seems to have been used recently for the preparation of food. A passage leads to the west and a dark staircase can be seen leading upward. The window is open, letting in a fresh breeze.',
            'hasSack,windowOpen': 'You are in the kitchen of the white house. A table seems to have been used recently for the preparation of food. A passage leads to the west and a dark staircase can be seen leading upward. The window is open, letting in a fresh breeze.'
        }
    },
    objects: {
        window: {
            id: 'window',
            name: 'Window',
            descriptions: {
                default: 'The window looks out onto the front yard.',
                states: {
                    'windowOpen': 'The window is open, letting in a fresh breeze.'
                }
            },
            visibleOnEntry: true,
            canTake: false,
            moveable: false,
            interactions: {
                examine: {
                    message: 'The window looks out onto the front yard. You can see the mailbox from here.',
                    states: {
                        'windowOpen': 'The window is open wide, providing access to the front yard.'
                    }
                },
                open: {
                    message: 'You open the window.',
                    grantsFlags: ['windowOpen'],
                    requiredFlags: ['!windowOpen'],
                    score: 5
                },
                close: {
                    message: 'You close the window.',
                    removesFlags: ['windowOpen'],
                    requiredFlags: ['windowOpen']
                }
            }
        },
        table: {
            id: 'table',
            name: 'Table',
            descriptions: {
                default: 'The table seems to have been used recently for the preparation of food. On it you can see a bottle of water and a clove of garlic.',
                states: {
                    'hasWater,hasGarlic': 'The table seems to have been used recently for the preparation of food.',
                    'hasWater,!hasGarlic': 'The table seems to have been used recently for the preparation of food. On it you can see a clove of garlic.',
                    '!hasWater,hasGarlic': 'The table seems to have been used recently for the preparation of food. On it you can see a bottle of water.'
                }
            },
            visibleOnEntry: true,
            canTake: false,
            moveable: false,
            interactions: {
                examine: {
                    message: 'The table seems to have been used recently for the preparation of food. On it you can see a bottle of water and a clove of garlic.',
                    states: {
                        'hasWater,hasGarlic': 'The table seems to have been used recently for the preparation of food.',
                        'hasWater,!hasGarlic': 'The table seems to have been used recently for the preparation of food. On it you can see a clove of garlic.',
                        '!hasWater,hasGarlic': 'The table seems to have been used recently for the preparation of food. On it you can see a bottle of water.'
                    }
                }
            }
        },
        water: {
            id: 'water',
            name: 'Bottle of Water',
            descriptions: {
                default: 'A clear glass bottle full of water.',
                examine: 'The bottle is made of clear glass and is full of water.'
            },
            visibleOnEntry: true,
            canTake: true,
            weight: 2,
            interactions: {
                examine: {
                    message: 'The bottle is made of clear glass and is full of water.'
                },
                take: {
                    message: 'Taken.',
                    grantsFlags: ['hasWater'],
                    score: 2,
                    addToInventory: ['water']
                },
                drink: {
                    message: 'The water is cool and refreshing.',
                    removesFlags: ['hasWater'],
                    requiredFlags: ['hasWater'],
                    removeFromInventory: ['water']
                }
            }
        },
        garlic: {
            id: 'garlic',
            name: 'Garlic Clove',
            descriptions: {
                default: 'A fresh clove of garlic.',
                examine: 'The garlic clove looks fresh and pungent.'
            },
            visibleOnEntry: true,
            canTake: true,
            weight: 1,
            interactions: {
                examine: {
                    message: 'The garlic clove looks fresh and pungent.'
                },
                take: {
                    message: 'Taken.',
                    grantsFlags: ['hasGarlic'],
                    score: 2,
                    addToInventory: ['garlic']
                },
                eat: {
                    message: 'The raw garlic is very strong! Your breath will smell for hours.',
                    removesFlags: ['hasGarlic'],
                    requiredFlags: ['hasGarlic'],
                    removeFromInventory: ['garlic']
                }
            }
        },
        sack: {
            id: 'sack',
            name: 'Brown Sack',
            descriptions: {
                default: 'The brown sack smells of hot peppers.',
                empty: 'The brown sack is empty.',
                examine: 'The brown sack smells of hot peppers and appears to contain something.'
            },
            visibleOnEntry: true,
            canTake: true,
            isContainer: true,
            capacity: 5,
            interactions: {
                examine: {
                    message: 'The brown sack smells of hot peppers and appears to contain something.',
                    states: {
                        'sackEmpty': 'The brown sack is empty.'
                    }
                },
                take: {
                    message: 'Taken.',
                    grantsFlags: ['hasSack'],
                    score: 2,
                    addToInventory: ['sack']
                }
            }
        }
    },
    exits: [
        {
            direction: 'west',
            targetScene: 'livingRoom',
            description: 'A passage leads west into the living room.'
        },
        {
            direction: 'east',
            targetScene: 'westOfHouse',
            description: 'The window leads to the front of the house.',
            requiredFlags: ['windowOpen'],
            failureMessage: 'The window is closed.'
        },
        {
            direction: 'up',
            targetScene: 'attic',
            description: 'The stairs are dark and dusty.'
        }
    ]
};

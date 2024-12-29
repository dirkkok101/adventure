import { Scene } from '../../models/game-state.model';

export const kitchen: Scene = {
    id: 'kitchen',
    name: 'Kitchen',
    region: 'house',
    light: true,
    descriptions: {
        default: 'You are in the kitchen of the white house. A table seems to have been used recently for the preparation of food. A passage leads to the west and a dark staircase can be seen leading upward. A window looks out onto the front yard. On the table is an elongated brown sack, smelling of hot peppers.',
        states: {
            'tableEmpty': 'You are in the kitchen of the white house. A table seems to have been used recently for the preparation of food. A passage leads to the west and a dark staircase can be seen leading upward. A window looks out onto the front yard.',
            'windowOpen': 'You are in the kitchen of the white house. A table seems to have been used recently for the preparation of food. A passage leads to the west and a dark staircase can be seen leading upward. The window is open, letting in a fresh breeze.'
        }
    },
    objects: {
        window: {
            id: 'window',
            name: 'Window',
            visibleOnEntry: true,
            canTake: false,
            descriptions: {
                default: 'The window looks out onto the front yard.',
                states: {
                    'windowOpen': 'The window is open, letting in a fresh breeze.'
                }
            },
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
                    grantsFlags: ['!windowOpen'],
                    requiredFlags: ['windowOpen']
                }
            }
        },
        table: {
            id: 'table',
            name: 'Table',
            visibleOnEntry: true,
            canTake: false,
            descriptions: {
                default: 'The table seems to have been used recently for the preparation of food. On it you can see a bottle of water and a clove of garlic.',
                states: {
                    'tableEmpty': 'The table is empty.'
                }
            },
            interactions: {
                examine: {
                    message: 'The table seems to have been used recently for the preparation of food. On it you can see a bottle of water and a clove of garlic.',
                    states: {
                        'tableEmpty': 'The table is empty.'
                    }
                }
            }
        },
        water: {
            id: 'water',
            name: 'Bottle of Water',
            visibleOnEntry: true,
            canTake: true,
            weight: 2,
            descriptions: {
                default: 'A clear glass bottle full of water.'
            },
            interactions: {
                examine: {
                    message: 'The bottle is made of clear glass and is full of water.'
                },
                take: {
                    message: 'Taken.',
                    grantsFlags: ['hasWater']
                },
                drink: {
                    message: 'The water is cool and refreshing.',
                    grantsFlags: ['!hasWater'],
                    requiredFlags: ['hasWater']
                }
            }
        },
        garlic: {
            id: 'garlic',
            name: 'Garlic Clove',
            visibleOnEntry: true,
            canTake: true,
            weight: 1,
            descriptions: {
                default: 'A fresh clove of garlic.'
            },
            interactions: {
                examine: {
                    message: 'The garlic clove looks fresh and pungent.'
                },
                take: {
                    message: 'Taken.',
                    grantsFlags: ['hasGarlic']
                },
                eat: {
                    message: 'The raw garlic is very strong! Your breath will smell for hours.',
                    grantsFlags: ['!hasGarlic'],
                    requiredFlags: ['hasGarlic']
                }
            }
        },
        sack: {
            id: 'sack',
            name: 'Brown Sack',
            visibleOnEntry: true,
            canTake: true,
            descriptions: {
                default: 'The brown sack smells of hot peppers.',
                empty: 'The brown sack is empty.'
            },
            interactions: {
                examine: {
                    message: 'The brown sack smells of hot peppers and appears to contain something.',
                    states: {
                        'sackEmpty': 'The brown sack is empty.'
                    }
                },
                take: {
                    message: 'Taken.',
                    grantsFlags: ['hasSack']
                }
            }
        }
    },
    exits: [
        {
            direction: 'west',
            targetScene: 'livingRoom',
            description: 'An archway leads west into the living room.'
        },
        {
            direction: 'up',
            targetScene: 'attic',
            description: 'A dark staircase leads upward.'
        },
        {
            direction: 'east',
            targetScene: 'westOfHouse',
            description: 'The window leads outside.',
            requiredFlags: ['windowOpen'],
            failureMessage: 'The window needs to be opened first.'
        }
    ]
};

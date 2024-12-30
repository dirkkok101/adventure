import { Scene, SceneObject, SceneInteraction } from '../../models/game-state.model';

export const livingRoom: Scene = {
    id: 'livingRoom',
    name: 'Living Room',
    region: 'Inside House',
    light: true,
    descriptions: {
        default: 'You are in the living room. There is a doorway to the east, a wooden door with strange gothic lettering to the west, which appears to be nailed shut, and a large oriental rug in the center of the room. Above the trophy case hangs an elvish sword of great antiquity. A battery-powered brass lantern is on the trophy case.',
        states: {
            'rugMoved': 'You are in the living room. There is a doorway to the east and a wooden door with strange gothic lettering to the west. A large oriental rug has been moved aside, revealing a trap door in the floor. Above the trophy case hangs an elvish sword of great antiquity. A battery-powered brass lantern is on the trophy case.',
            'hasSword': 'You are in the living room. There is a doorway to the east and a wooden door with strange gothic lettering to the west. A large oriental rug covers the floor. A battery-powered brass lantern is on the trophy case.',
            'hasLantern': 'You are in the living room. There is a doorway to the east and a wooden door with strange gothic lettering to the west. A large oriental rug covers the floor. Above the trophy case hangs an elvish sword of great antiquity.',
            'hasSword,hasLantern': 'You are in the living room. There is a doorway to the east and a wooden door with strange gothic lettering to the west. A large oriental rug covers the floor.',
            'rugMoved,hasSword': 'You are in the living room. There is a doorway to the east and a wooden door with strange gothic lettering to the west. A large oriental rug has been moved aside, revealing a trap door in the floor. A battery-powered brass lantern is on the trophy case.',
            'rugMoved,hasLantern': 'You are in the living room. There is a doorway to the east and a wooden door with strange gothic lettering to the west. A large oriental rug has been moved aside, revealing a trap door in the floor. Above the trophy case hangs an elvish sword of great antiquity.',
            'rugMoved,hasSword,hasLantern': 'You are in the living room. There is a doorway to the east and a wooden door with strange gothic lettering to the west. A large oriental rug has been moved aside, revealing a trap door in the floor.'
        }
    },
    objects: {
        trophyCase: {
            id: 'trophyCase',
            name: 'Trophy Case',
            visibleOnEntry: true,
            canTake: false,
            isContainer: true,
            isOpen: true,
            capacity: 10,
            descriptions: {
                default: 'A trophy case stands against the wall.',
                empty: 'The trophy case is empty.',
                contents: 'The trophy case contains:'
            },
            interactions: {
                examine: {
                    message: 'The trophy case is empty. It is securely fastened to the wall and cannot be removed.',
                    states: {
                        'hasTreasure': 'The trophy case contains your treasures.'
                    }
                },
                open: {
                    message: 'The trophy case is already open.',
                    failureMessage: 'The trophy case is already open.'
                },
                close: {
                    message: 'The trophy case cannot be closed.',
                    failureMessage: 'The trophy case cannot be closed.'
                },
                take: {
                    message: 'The trophy case is securely fastened to the wall.',
                    failureMessage: 'The trophy case is securely fastened to the wall.'
                }
            }
        },
        orientalRug: {
            id: 'orientalRug',
            name: 'Oriental Rug',
            visibleOnEntry: true,
            canTake: false,
            descriptions: {
                default: 'A large oriental rug covers the center of the floor.',
                states: {
                    'rugMoved': 'The rug has been moved to one side of the room, revealing a trap door.'
                }
            },
            interactions: {
                examine: {
                    message: 'The rug is extremely valuable and quite heavy.',
                    states: {
                        'rugMoved': 'The rug has been moved to reveal a trap door.'
                    }
                },
                move: {
                    message: 'With a great effort, you move the rug to one side of the room, revealing a closed trap door.',
                    grantsFlags: ['rugMoved'],
                    revealsObjects: ['trapDoor'],
                    score: 5,
                    requiredFlags: ['!rugMoved']
                },
                take: {
                    message: 'The rug is extremely heavy, much too heavy to take.',
                    failureMessage: 'The rug is much too heavy to take.'
                }
            }
        },
        trapDoor: {
            id: 'trapDoor',
            name: 'Trap Door',
            visibleOnEntry: false,
            canTake: false,
            descriptions: {
                default: 'The trap door is closed.',
                states: {
                    'trapDoorOpen': 'The trap door is open, revealing a dark passage below.'
                }
            },
            interactions: {
                examine: {
                    message: 'The trap door is closed.',
                    states: {
                        'trapDoorOpen': 'The trap door is open, revealing a dark passage leading down to a cellar.'
                    },
                    requiredFlags: ['rugMoved']
                },
                open: {
                    message: 'The door reluctantly opens to reveal a rickety staircase descending into darkness.',
                    grantsFlags: ['trapDoorOpen'],
                    requiredFlags: ['rugMoved', '!trapDoorOpen'],
                    score: 5
                },
                close: {
                    message: 'The trap door swings shut and closes with a loud bang.',
                    removesFlags: ['trapDoorOpen'],
                    requiredFlags: ['trapDoorOpen']
                },
                enter: {
                    message: 'The trap door must be opened first.',
                    requiredFlags: ['trapDoorOpen'],
                    failureMessage: 'The trap door must be opened first.'
                }
            }
        },
        sword: {
            id: 'sword',
            name: 'Elvish Sword',
            visibleOnEntry: true,
            canTake: true,
            weight: 3,
            descriptions: {
                default: 'Above the trophy case hangs an elvish sword of great antiquity.',
                states: {
                    'enemyNearby': 'Your sword is glowing with a bright blue light!',
                    'hasSword': 'Your elvish sword is by your side.'
                }
            },
            interactions: {
                examine: {
                    message: 'The sword is of elvish workmanship. Strange runes are inscribed on the blade.',
                    states: {
                        'enemyNearby': 'The sword is glowing bright blue - danger must be nearby!',
                        'hasSword': 'The sword appears to be quite valuable. Strange runes are inscribed on the blade.'
                    }
                },
                take: {
                    message: 'Taken. The sword feels perfectly balanced in your hand.',
                    grantsFlags: ['hasSword'],
                    score: 10
                },
                read: {
                    message: 'The runes are written in an ancient elvish script. They read "Sting is my name, I am the spider\'s bane."'
                }
            }
        },
        lantern: {
            id: 'lantern',
            name: 'Brass Lantern',
            visibleOnEntry: true,
            canTake: true,
            weight: 2,
            descriptions: {
                default: 'A battery-powered brass lantern is sitting on the trophy case.',
                states: {
                    'lanternOn': 'Your brass lantern is on, providing light.',
                    'lanternDead': 'Your brass lantern\'s batteries have died.',
                    'hasLantern': 'You are carrying a brass lantern.'
                }
            },
            interactions: {
                examine: {
                    message: 'It\'s a typical brass lantern, battery-powered and quite useful in dark places.',
                    states: {
                        'lanternOn': 'The lantern is on, casting a warm light.',
                        'lanternDead': 'The lantern\'s batteries are dead.',
                        'hasLantern': 'The lantern is currently turned off.'
                    }
                },
                take: {
                    message: 'Taken.',
                    grantsFlags: ['hasLantern']
                },
                on: {
                    message: 'The brass lantern is now on.',
                    grantsFlags: ['lanternOn', 'hasLight'],
                    requiredFlags: ['hasLantern', '!lanternOn', '!lanternDead'],
                    failureMessage: 'The lantern\'s batteries are dead.'
                },
                off: {
                    message: 'The brass lantern is now off.',
                    removesFlags: ['lanternOn', 'hasLight'],
                    requiredFlags: ['lanternOn']
                }
            }
        }
    },
    exits: [
        {
            direction: 'east',
            targetScene: 'kitchen',
            description: 'A doorway leads east into the kitchen.'
        },
        {
            direction: 'west',
            targetScene: 'closet',
            description: 'A wooden door with gothic lettering leads west.',
            requiredFlags: ['gothicDoorOpen'],
            failureMessage: 'The door appears to be nailed shut.'
        },
        {
            direction: 'down',
            targetScene: 'cellar',
            description: 'A dark staircase leads down into the cellar.',
            requiredFlags: ['rugMoved', 'trapDoorOpen', 'hasLight'],
            failureMessage: 'You can\'t go that way.'
        }
    ]
};

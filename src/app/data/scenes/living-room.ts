import { Scene } from "../../models";

export const livingRoom: Scene = {
    id: 'livingRoom',
    name: 'Living Room',
    region: 'Inside House',
    light: true,
    descriptions: {
        default: 'You are in the living room of the white house. A trophy case stands against one wall. A large oriental rug is in the center of the room.',
        states: {
            'rugMoved': 'You are in the living room of the white house. A trophy case stands against one wall. An oriental rug has been pushed to one side of the room, revealing a trap door.',
            'trapdoorOpen': 'You are in the living room of the white house. A trophy case stands against one wall. An oriental rug has been pushed to one side of the room, revealing an open trap door leading down into darkness.'
        }
    },
    objects: {
        trophyCase: {
            id: 'trophyCase',
            name: 'Trophy Case',
            visibleOnEntry: true,
            isContainer: true,
            capacity: 10,
            descriptions: {
                default: 'The trophy case is mounted securely to the wall.',
                states: {
                    'hasTreasure': 'The trophy case contains your treasures.'
                }
            },
            interactions: {
                examine: {
                    message: 'The trophy case is empty. It is securely fastened to the wall and cannot be removed.',
                    states: {
                        'hasTreasure': 'The trophy case contains your treasures.'
                    }
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
                push: {
                    message: 'With a great effort, you move the rug to one side of the room, revealing a trap door in the floor!',
                    grantsFlags: ['rugMoved'],
                    revealsObjects: ['trapdoor'],
                    requiredFlags: ['!rugMoved'],
                    score: 5
                },
                pull: {
                    message: 'With a great effort, you move the rug to one side of the room, revealing a trap door in the floor!',
                    grantsFlags: ['rugMoved'],
                    revealsObjects: ['trapdoor'],
                    requiredFlags: ['!rugMoved'],
                    score: 5
                }
            }
        },
        trapdoor: {
            id: 'trapdoor',
            name: 'Trap Door',
            visibleOnEntry: false,
            canTake: false,
            descriptions: {
                default: 'A closed trap door is set into the floor.',
                states: {
                    'trapdoorOpen': 'An open trap door reveals a passage leading down into darkness.'
                }
            },
            interactions: {
                examine: {
                    message: 'The trap door is closed.',
                    states: {
                        'trapdoorOpen': 'The trap door is open, revealing a dark passage below.'
                    }
                },
                open: {
                    message: 'The trap door opens, revealing a passage leading down into darkness.',
                    grantsFlags: ['trapdoorOpen'],
                    requiredFlags: ['!trapdoorOpen']
                },
                close: {
                    message: 'You close the trap door.',
                    removesFlags: ['trapdoorOpen'],
                    requiredFlags: ['trapdoorOpen']
                }
            }
        },
        sword: {
            id: 'sword',
            name: 'Elvish Sword',
            visibleOnEntry: true,
            canTake: true,
            isTreasure: true,
            descriptions: {
                default: 'An elvish sword of great antiquity.',
                states: {
                    'hasSword': 'Your elvish sword glows with a faint blue light.'
                }
            },
            interactions: {
                examine: {
                    message: 'The sword is extremely old but in perfect condition. Strange runes are set into the blade.',
                    states: {
                        'hasSword': 'The sword glows with a faint blue light. Strange runes are set into the blade.'
                    }
                },
                take: {
                    message: 'Taken.',
                    grantsFlags: ['hasSword'],
                    score: 10
                },
                read: {
                    message: 'The runes say "Sting is my name; I am the spider\'s bane."',
                    requiredFlags: ['hasLight']
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
            description: 'An entrance to the kitchen is to the east.'
        },
        {
            direction: 'west',
            targetScene: 'westOfHouse',
            description: 'The front door leads west.',
            requiredFlags: ['frontDoorOpen'],
            failureMessage: 'The front door is closed.'
        },
        {
            direction: 'down',
            targetScene: 'cellar',
            description: 'A trap door leads down into darkness.',
            requiredFlags: ['rugMoved', 'trapdoorOpen', 'hasLight'],
            failureMessage: 'You can\'t go that way.'
        }
    ]
};

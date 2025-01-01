
import { westOfHouse } from './west-of-house';
import { northOfHouse } from './north-of-house';
import { southOfHouse } from './south-of-house';
import { behindHouse } from './behind-house';
import { kitchen } from './kitchen';
import { forest } from './forest';
import { livingRoom } from './living-room';
import { cellar } from './cellar';
import { attic } from './attic';
import { Scene } from '../../models';

export const scenes: { [key: string]: Scene } = {
    westOfHouse,
    northOfHouse,
    southOfHouse,
    behindHouse,
    kitchen,
    forest,
    livingRoom,
    cellar,
    attic
};

// Starting point of the game
export const startingScene = 'westOfHouse';

// Maximum score possible in the game
export const maxScore = 350;

// Maximum weight a player can carry
export const maxWeight = 50;

// Game regions for organization
export const regions = [
    'Above Ground',
    'Inside House',
    'Below Ground'
];

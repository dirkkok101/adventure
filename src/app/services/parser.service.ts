import { Injectable } from '@angular/core';
import { GameCommand } from '../models/game-state.model';
import { verbSynonyms } from '../data/game-mechanics';

@Injectable({
    providedIn: 'root'
})
export class ParserService {
    parseCommand(input: string): GameCommand {
        const words = input.toLowerCase().trim().split(/\s+/);
        
        if (words.length === 0) {
            return {
                verb: '',
                originalInput: input
            };
        }

        const verb = this.normalizeVerb(words[0]);
        
        if (words.length === 1) {
            return {
                verb,
                originalInput: input
            };
        }

        // Check for prepositions
        const prepositions = ['in', 'on', 'at', 'with', 'to', 'from'];
        const prepIndex = words.findIndex((word, index) => index > 0 && prepositions.includes(word));

        let object = '';
        let preposition = '';
        let target = '';

        if (prepIndex !== -1) {
            object = this.normalizeObjectId(words.slice(1, prepIndex).join(' '));
            preposition = words[prepIndex];
            target = this.normalizeObjectId(words.slice(prepIndex + 1).join(' '));
        } else {
            object = this.normalizeObjectId(words.slice(1).join(' '));
        }

        return {
            verb,
            object,
            preposition,
            target,
            originalInput: input
        };
    }

    private normalizeVerb(verb: string): string {
        // Check direct match first
        if (verbSynonyms[verb]) {
            return verb;
        }

        // Check synonyms
        for (const [mainVerb, synonyms] of Object.entries(verbSynonyms)) {
            if (synonyms.includes(verb)) {
                return mainVerb;
            }
        }

        return verb;
    }

    private normalizeObjectId(input: string): string {
        // Convert to camelCase
        return input.toLowerCase()
            .replace(/[^a-zA-Z0-9 ]/g, '')
            .split(' ')
            .reduce((result, word, index) => 
                result + (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
            , '');
    }
}

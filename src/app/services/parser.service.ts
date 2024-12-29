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

        if (prepIndex !== -1) {
            return {
                verb,
                object: words.slice(1, prepIndex).join(' '),
                preposition: words[prepIndex],
                target: words.slice(prepIndex + 1).join(' '),
                originalInput: input
            };
        }

        return {
            verb,
            object: words.slice(1).join(' '),
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
}

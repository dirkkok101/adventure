import { Injectable } from "@angular/core";
import { verbSynonyms } from "../data/verb-synonyms";
import { GameCommand } from "../models";

/**
 * Service responsible for parsing user input into structured game commands.
 * Handles text normalization, verb synonyms, and command structure parsing.
 * 
 * Key responsibilities:
 * - Parse raw text input into GameCommand objects
 * - Normalize verbs and object names
 * - Handle prepositions and multi-part commands
 * - Support verb synonyms (e.g., "get" = "take")
 */
@Injectable({
    providedIn: 'root'
})
export class ParserService {
    /**
     * Parse a raw input string into a structured GameCommand
     * Handles verb normalization, object identification, and prepositions
     * 
     * Examples:
     * - "take lamp" -> { verb: "take", object: "lamp" }
     * - "put book in box" -> { verb: "put", object: "book", preposition: "in", target: "box" }
     * 
     * @param input Raw input string from player
     * @returns Structured GameCommand object
     */
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

    /**
     * Normalize a verb by checking against known synonyms
     * For example, "get" -> "take", "grab" -> "take"
     * 
     * @param verb Raw verb from input
     * @returns Normalized verb or original if no synonym found
     */
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

    /**
     * Normalize an object identifier by removing articles and extra spaces
     * For example, "the brass lantern" -> "brass lantern"
     * 
     * @param objectId Raw object identifier from input
     * @returns Normalized object identifier
     */
    private normalizeObjectId(objectId: string): string {
        // Convert to camelCase
        return objectId.toLowerCase()
            .replace(/[^a-zA-Z0-9 ]/g, '')
            .split(' ')
            .reduce((result, word, index) => 
                result + (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
            , '');
    }
}

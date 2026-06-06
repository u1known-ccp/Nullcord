/*
 * Kittycord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Offline correction: a curated map of common misspellings per language + one safe rule.
// No dictionary download, no network, no key - everything stays on the user's machine.
// It only fixes clear, unambiguous typos (whole-word, case-preserving); it never rephrases.
// Entries are deliberately conservative to avoid "correcting" real words.

const COMMON_TYPOS: Record<string, Record<string, string>> = {
    en: {
        teh: "the", thsi: "this", taht: "that", adn: "and", ot: "to",
        recieve: "receive", recieved: "received", seperate: "separate", seperated: "separated",
        definately: "definitely", definatly: "definitely", occured: "occurred", occuring: "occurring",
        untill: "until", wich: "which", becuase: "because", becasue: "because", alot: "a lot",
        thier: "their", freind: "friend", freinds: "friends", beleive: "believe", beleived: "believed",
        wierd: "weird", accross: "across", agressive: "aggressive", apparant: "apparent",
        arguement: "argument", calender: "calendar", comming: "coming", commited: "committed",
        concious: "conscious", dissapoint: "disappoint", embarass: "embarrass", enviroment: "environment",
        existance: "existence", familar: "familiar", finaly: "finally", foriegn: "foreign",
        gaurd: "guard", goverment: "government", grammer: "grammar", happend: "happened",
        harrass: "harass", immediatly: "immediately", independant: "independent", knowlege: "knowledge",
        libary: "library", lisence: "license", maintainance: "maintenance", neccessary: "necessary",
        occassion: "occasion", occurence: "occurrence", persistant: "persistent", posession: "possession",
        prefered: "preferred", priviledge: "privilege", probaly: "probably", pronounciation: "pronunciation",
        publically: "publicly", recomend: "recommend", recomended: "recommended", refered: "referred",
        relevent: "relevant", religous: "religious", remeber: "remember", resturant: "restaurant",
        rythm: "rhythm", sucessful: "successful", suprise: "surprise", suprised: "surprised",
        tommorow: "tomorrow", truely: "truly", unfortunatly: "unfortunately", usualy: "usually",
        vaccum: "vacuum", yuo: "you", youre: "you're", theyre: "they're", dont: "don't",
        cant: "can't", didnt: "didn't", doesnt: "doesn't", isnt: "isn't", wasnt: "wasn't",
        couldnt: "couldn't", shouldnt: "shouldn't", wouldnt: "wouldn't", havent: "haven't",
        hasnt: "hasn't", arent: "aren't", werent: "weren't", im: "I'm", ive: "I've",
        thats: "that's", whats: "what's", theres: "there's"
    },
    de: {
        seperat: "separat", Standart: "Standard", warscheinlich: "wahrscheinlich",
        wahrscheindlich: "wahrscheinlich", villeicht: "vielleicht", vileicht: "vielleicht",
        intressant: "interessant", interesant: "interessant", nähmlich: "nämlich",
        Rythmus: "Rhythmus", Addresse: "Adresse", agressiv: "aggressiv", garnicht: "gar nicht",
        garnichts: "gar nichts", garkein: "gar kein", zumindestens: "zumindest",
        wiederspiegeln: "widerspiegeln", aufjedenfall: "auf jeden Fall",
        standartmäßig: "standardmäßig", einzigste: "einzige", Entschuldung: "Entschuldigung",
        tatsächlig: "tatsächlich", debugen: "debuggen"
    },
    fr: {
        parceque: "parce que", quelquechose: "quelque chose", aujourdhui: "aujourd'hui",
        biensur: "bien sûr", developpement: "développement", deja: "déjà", etre: "être",
        probleme: "problème"
    },
    es: {
        tambien: "también", porfavor: "por favor", aproposito: "a propósito",
        deberia: "debería", habia: "había", asi: "así", ablar: "hablar", aora: "ahora"
    },
    it: {
        perchè: "perché", perche: "perché", piu: "più", cosi: "così",
        sopratutto: "soprattutto", propio: "proprio"
    },
    pt: {
        concerteza: "com certeza", derrepente: "de repente", apartir: "a partir",
        voce: "você", nao: "não", tambem: "também", entao: "então"
    }
};

const regexCache: Record<string, RegExp> = {};

function buildRegex(lang: string, map: Record<string, string>): RegExp {
    if (regexCache[lang]) return regexCache[lang];
    const keys = Object.keys(map)
        .sort((a, b) => b.length - a.length)
        .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const re = new RegExp(`\\b(${keys.join("|")})\\b`, "gi");
    regexCache[lang] = re;
    return re;
}

function applyCase(original: string, replacement: string): string {
    if (original.length > 1 && original === original.toUpperCase()) return replacement.toUpperCase();
    if (original[0] === original[0].toUpperCase()) return replacement[0].toUpperCase() + replacement.slice(1);
    return replacement;
}

/** Offline typo correction. Returns the corrected text (or the original if nothing matched). */
export function localCorrect(text: string, lang: string): string {
    const map = COMMON_TYPOS[lang];
    if (!map) return text; // no list for this language -> never apply another language's fixes

    let out = text.replace(buildRegex(lang, map), match => {
        const fix = map[match.toLowerCase()];
        return fix ? applyCase(match, fix) : match;
    });

    // English: a lone lowercase "i" is virtually always "I".
    if (lang === "en") out = out.replace(/\bi\b/g, "I");

    return out;
}

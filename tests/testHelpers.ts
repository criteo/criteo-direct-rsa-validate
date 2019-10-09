export function mutateHexString(s: string): string {
    const idxToReplace = getRandomIntInclusive(0, s.length - 1);
    const newChar = s.charAt(idxToReplace) === "0" ? "1" : "0";
    return s.slice(0, idxToReplace) + newChar + s.slice(idxToReplace + 1);
}

function getRandomIntInclusive(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive
}

export function splitHashAndCode(text: string): {hash: string, code: string} {
    const firstLineEnd = text.indexOf('\n');
    const firstLine = text.substr(0, firstLineEnd).trim();
    if (firstLine.substr(0, 9) !== '// Hash: ') {
        throw new Error('No hash found in FastBid');
    }

    const hash = firstLine.substr(9);
    const code = text.substr(firstLineEnd + 1);

    return {
        hash: hash,
        code: code,
    };
}


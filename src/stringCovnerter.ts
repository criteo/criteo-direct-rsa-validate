const b64map = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const b64pad = "=";

const BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";

function int2char(n:number) {
    return BI_RM.charAt(n);
}

export function b64toHex(s:string): string {
    let ret = "";
    let i;
    let k = 0; // b64 state, 0-3
    let slop = 0;
    for (i = 0; i < s.length; ++i) {
        if (s.charAt(i) == b64pad) {
            break;
        }
        const v = b64map.indexOf(s.charAt(i));
        if (v < 0) {
            continue;
        }
        if (k == 0) {
            ret += int2char(v >> 2);
            slop = v & 3;
            k = 1;
        } else if (k == 1) {
            ret += int2char((slop << 2) | (v >> 4));
            slop = v & 0xf;
            k = 2;
        } else if (k == 2) {
            ret += int2char(slop);
            ret += int2char(v >> 2);
            slop = v & 3;
            k = 3;
        } else {
            ret += int2char((slop << 2) | (v >> 4));
            ret += int2char(v & 0xf);
            k = 0;
        }
    }
    if (k == 1) {
        ret += int2char(slop << 2);
    }
    return ret;
}

export function removeExtraSymbols(s: string): string {
    return s
        .replace(/^1f+00/, "")
        .replace("3031300d060960864801650304020105000420", "");
}

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

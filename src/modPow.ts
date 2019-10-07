// returns: x^e mod n as hexString, where x and n - numbers presented as hexStrings
export function modPow(xStr: string, e: number, nStr: string): string {
    const x = bigIntHexStr(xStr);
    const n = bigIntHexStr(nStr);
    const r = modPow2(x, e, n);
    return toHexStr(r);
}

function modPow2(x: number[], e: number, n: number[]): number[] {
    let a = x.slice();
    let res = bigIntNum(1);
    const nByPowed2: Array<number[]> = [n];
    while (e > 0) {
        if (e % 2 === 1) res = mod(mult(res, a), n, nByPowed2);
        a = mod(mult(a, a), n, nByPowed2);
        e >>= 1;
    }
    return res;
}

function mod(x: number[], n: number[], nByPowed2: Array<number[]>): number[] {
    if (less(x, n)) return x;
    while (!less(x, n)) x = subtract(x, getMaxLessThan(x, nByPowed2));
    return x;
}

function getMaxLessThan(x: number[], nByPowed2: Array<number[]>) {
    let last = nByPowed2[nByPowed2.length - 1];
    while (less(last, x)) {
        last = multByNumber(last, 2);
        nByPowed2.push(last);
    }
    let i = nByPowed2.length - 1;
    while (i >= 0 && more(nByPowed2[i], x)) i--;
    return i >= 0 ? nByPowed2[i] : bigIntNum(0);
}

function multByNumber(a: number[], n: number, shift: number = 0): number[] {
    const res: number[] = [];
    for (let i = 0; i < shift; i++) res.push(0);
    for (let j = 0; j < a.length; j++) res.push(a[j] * n);
    return normalizeOverflow(res);
}

function mult(a: number[], b: number[]): number[] {
    let res = bigIntNum(0);
    for (let i = 0; i < b.length; i++) res = sum(res, multByNumber(a, b[i], i));
    return res;
}

function subtract(a: number[], b: number[]): number[] {
    if (more(b, a)) throw new Error("Negative values are not supported");
    const res: number[] = [];
    for (let i = 0; i < b.length; i++) res.push(a[i] - b[i]);
    for (let i = b.length; i < a.length; i++) res.push(a[i]);
    return normalizeNegatives(res);
}

function sum(a: number[], b: number[]): number[] {
    const longer = a.length >= b.length ? a : b;
    const shorter = a.length >= b.length ? b : a;
    const res: number[] = [];
    for (let i = 0; i < shorter.length; i++) res.push(a[i] + b[i]);
    for (let i = shorter.length; i < longer.length; i++) res.push(longer[i]);
    return normalizeOverflow(res);
}

function normalizeOverflow(x: number[]): number[] {
    let extra = 0;
    for (let i = 0; i < x.length; i++) {
        const cur = x[i] + extra;
        extra = Math.floor(cur / foundation);
        x[i] = cur % foundation;
    }
    while (extra > 0) {
        x.push(extra % foundation);
        extra = Math.floor(extra / foundation);
    }
    return x;
}

function normalizeNegatives(x: number[]): number[] {
    for (let i = 0; i < x.length; i++) {
        if (x[i] < 0) {
            if (i + 1 == x.length) throw new Error("Negative values are not supported");
            x[i] += foundation;
            x[i + 1]--;
        }
    }
    let idx = x.length;
    while (idx > 1 && x[idx - 1] === 0) idx--;
    return x.slice(0, idx);
}

function less(a: number[], b: number[]): boolean {
    return moreOrLess(a, b, (x1, x2) => x1 < x2);
}

function more(a: number[], b: number[]): boolean {
    return moreOrLess(a, b, (x1, x2) => x1 > x2);
}

function moreOrLess(a: number[], b: number[], f: (x1: number, x2: number) => boolean): boolean {
    if (a.length !== b.length) return f(a.length, b.length);
    for (let i = a.length; i >= 0; i--) {
        if (a[i] === b[i]) continue;
        return f(a[i], b[i]);
    }
    return false;
}

function bigIntNum(x: number): number[] {
    if (x === 0) {
        return [0];
    }
    const res: number[] = [];
    while (x != 0) {
        res.push(x % foundation);
        x = Math.round(x / foundation);
    }
    return res;
}

function bigIntHexStr(hexStr: string): number[] {
    const chars = hexStr.toLowerCase().split("").reverse();
    var chunkCount = Math.floor((hexStr.length - 1) / 3) + 1;
    const res = [];
    for (let i = 0; i < chunkCount; i++)
        res.push(getInt(chars, 3 * i) + getInt(chars, 3 * i + 1) * X1 + getInt(chars, 3 * i + 2) * X2);
    return normalizeNegatives(res);
}

function getInt(chars: string[], idx: number): number {
    if (idx >= chars.length) return 0;
    const x = chars[idx].charCodeAt(0) - 48;
    return x < 10 ? x : x - 39;
}

export function toHexStr(x: number[]): string {
    let res: number[] = [];
    x.forEach(p => {
        const p0 = p % X2;
        res.push(p0 % X1, Math.floor(p0 / X1), Math.floor(p / X2));
    });
    let i = res.length;
    while (i >= 1) {
        const rrr = res[--i];
        if (rrr !== 0) {
            break;
        }
    }
    return res.slice(0, i + 1).reverse().map(x => intToHexLetter(x)).join("");
}

function intToHexLetter(x: number): string {
    return String.fromCharCode(x + (x < 10 ? 48 : 87));
}

const foundation: number = 4096; // 16^3
const X1: number = 16;
const X2: number = 256;
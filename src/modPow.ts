// returns: x^e mod n as hexString, where x and n - numbers presented as hexStrings
export function modPow(xStr: string, e: number, nStr: string): string {
    const x = bigIntHexStr(xStr);
    const n = bigIntHexStr(nStr);
    const r = modPow2(x, e, n);
    return toHexStr(r);
}

function buildNs(n: number[]): Array<number[]> {
    const res: Array<number[]> = [n];
    while (res.length < 1025) {
        n = sum(n, n);
        res.push(n);
    }
    return res;
}

function modPow2(x: number[], e: number, n: number[]): number[] {
    let a = x.slice();
    let res = bigIntNum(1);
    const nByPowed2: Array<number[]> = buildNs(n);
    while (e > 0) {
        if (e % 2 === 1)
            res = mod(mult(res, a, n, nByPowed2), n, nByPowed2);
        a = mod(mult(a, a, n, nByPowed2), n, nByPowed2);
        e >>= 1;
    }
    return res;
}

function mod(x: number[], n: number[], nByPowed2: Array<number[]>): number[] {
    if (less(x, n)) return x;
    let last = nByPowed2[nByPowed2.length - 1];
    while (less(last, x)) {
        last = sum(last, last);
        nByPowed2.push(last);
    }
    let startFrom = nByPowed2.length - 1;
    while (!less(x, n)) {
        let maxLessThan = getMaxLessThan(x, nByPowed2, startFrom);
        x = subtract(x, maxLessThan.value);
        startFrom = maxLessThan.index - 1;
    }
    return x;
}

function getMaxLessThan(x: number[], nByPowed2: Array<number[]>, i: number): { value: number[], index: number } {
    while (i >= 0 && more(nByPowed2[i], x)) i--;
    return {value: i >= 0 ? nByPowed2[i] : [0], index: i};
}

function multByNumber(a: number[], n: number, shift: number = 0): number[] {
    if (n === 0) return [0];
    if (n === 1) return a.slice();
    if (n === 2) return sum(a, a);
    const res: number[] = [];
    for (let i = 0; i < shift; i++) res.push(0);
    let carry: number = 0;
    for (let j = 0; j < a.length || carry > 0; j++) {
        const value = (j < a.length ? a[j] : 0) * n + carry;
        carry = Math.floor(value / foundation);
        res.push(value % foundation);
    }
    return res;
}

function mult(a: number[], b: number[], n: number[], nByPowed2: Array<number[]>): number[] {
    let res = bigIntNum(0);
    for (let i = 0; i < b.length; i++) res = mod(sum(res, multByNumber(a, b[i], i)), n, nByPowed2);
    return res;
}

function subtract(a: number[], b: number[]): number[] {
    if (more(b, a))
        throw new Error("Negative values are not supported");
    const res: number[] = a.slice();
    let carry: number = 0;
    for (let i = 0; i < b.length || carry > 0; i++) {
        res[i] -= carry + (i < b.length ? b[i] : 0);
        carry = res[i] < 0 ? 1 : 0;
        if (carry) res[i] += foundation;
    }
    let idx = res.length;
    while (idx > 1 && res[idx - 1] === 0) idx--;
    return res.slice(0, idx);
}

function dropLeadingZeros(x: number[]): number[] {
    let idx = x.length;
    while (idx > 1 && x[idx - 1] === 0) idx--;
    return x.slice(0, idx);
}

function sum(a: number[], b: number[]): number[] {
    const max = Math.max(a.length, b.length);
    const res: number[] = a.slice();
    let carry: number = 0;
    for (let i = 0; i < max; i++) {
        res[i] = (i === res.length ? 0 : res[i]) + (i < b.length ? b[i] : 0) + carry;
        carry = res[i] >= foundation ? 1 : 0;
        if (carry > 0) res[i] -= foundation;
    }
    if (carry) res.push(1);
    return res;
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

export function bigIntHexStr(hexStr: string): number[] {
    const chars = hexStr.toLowerCase().split("").reverse();
    const chunkCount = Math.floor((hexStr.length - 1) / foundationPow) + 1;
    const res = [];
    for (let i = 0; i < chunkCount; i++) {
        let chunkValue = 0;
        for (let j = 0; j < foundationPow; j++) {
            chunkValue += getInt(chars, foundationPow * i + j) * foundationParts[j];
        }
        res.push(chunkValue);
    }
    return dropLeadingZeros(res);
}

function getInt(chars: string[], idx: number): number {
    if (idx >= chars.length) return 0;
    const x = chars[idx].charCodeAt(0) - 48;
    return x < 10 ? x : x - 39;
}

export function toHexStr(x: number[]): string {
    let res: number[] = [];
    let currentPart: number[] = [];
    x.forEach(p => {
        for (let j = foundationPow - 1; j >= 0; j--) {
            const part = foundationParts[j];
            currentPart.push(Math.floor(p / part));
            p %= part;
        }
        res = res.concat(currentPart.reverse());
        currentPart = [];
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

const foundationPow = 6;
const foundation: number = Math.pow(16, foundationPow);
const foundationParts: number[] = [];
for(let i = 0; i <= foundationPow; i++) foundationParts.push(Math.pow(16, i));

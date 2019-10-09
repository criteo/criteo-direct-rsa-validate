import {SHA256} from "crypto-js";
import {b64toHex, BigInteger, removeExtraSymbols} from "./jsbnLite";

// todo: remove for-loop & console.log()
export function verify(text: string, nStrPubKey: string, ePubKey: number, tryCount: number = 1): boolean {
    const splitResult = splitHashAndCode(text);
    const xStr = b64toHex(splitResult.hash);
    let spentSum = 0;
    let resultStr = "";
    for(let i = 0; i < tryCount; i++) {
        const startTime = performance.now();

        const x = new BigInteger(xStr);
        const m = new BigInteger(nStrPubKey);
        const r = x.modPowInt(ePubKey, m);
        resultStr = r.toHexString();

        const endTime = performance.now();
        const spent = endTime - startTime;
        spentSum += spent;
        console.log(`Try #${i}, spent: ${endTime - startTime} ms`);
    }

    const actual = removeExtraSymbols(resultStr);
    const expected = SHA256(splitResult.code).toString();

    let isSourceCodeValid = actual === expected;
    console.log(`Verify result: ${(isSourceCodeValid ? "OK" : "FAIL")} spent average: ${spentSum / tryCount} in ${tryCount} tries`);
    return isSourceCodeValid;
}

// todo: add checks for invalid size string or nulls!
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

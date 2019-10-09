import {b64toHex, BigInteger, removeExtraSymbols} from "./jsbnLite";

// todo: remove for-loop & console.log()
export function verify(code_sha256: string, hash: string, nStrPubKey: string, ePubKey: number, tryCount: number = 1): boolean {
    const xStr = b64toHex(hash);
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

    let isSourceCodeValid: boolean = removeExtraSymbols(resultStr) === code_sha256;
    console.log(`Verify result: ${(isSourceCodeValid ? "OK" : "FAIL")} spent average: ${spentSum / tryCount} in ${tryCount} tries`);
    return isSourceCodeValid;
}

// todo: add checks for invalid size string or nulls!

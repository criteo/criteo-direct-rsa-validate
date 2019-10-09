import {splitHashAndCode} from "../src/verify";

const globalAny:any = global;
globalAny.navigator = globalAny.navigator || {};
globalAny.navigator.appName = "Netscape";

import fs from "fs";
import {SHA256} from "crypto-js";
import {b64toHex, BigInteger, removeExtraSymbols} from "../src/jsbnLite";
import {mutateHexString} from "./testHelpers";

// PUBLIC KEY INFO
const e = 65537;
const nStr = "ced418c02139054ed3f420cce617baacaa1a6ecb57466933c79e3314f66459b2b9df4770b4b04379a5813311c1513e79098c9ba11fc467879f8213e2dc2a0d19f1967b3a63928f4fea9d84c0602bb4711e4b8b2586efd2a522053231ba7ddae946836e200321ab567e3ebffe1ce775a5384529e185af6fcd86d020f935c0cda5";

describe("performance tests", () => {
    it("valid", () => {
        for(let i = 50; i <= 65; i++) {
            const text = fs.readFileSync(`tests/testCases/${i}/prod.min.js`).toString();
            const hashAndCode = splitHashAndCode(text);
            const expected = SHA256(hashAndCode.code).toString();
            const xStr = b64toHex(hashAndCode.hash);

            const st = process.hrtime();
            const x = new BigInteger(xStr);
            const m = new BigInteger(nStr);
            const r = x.modPowInt(e, m);
            const rStr = r.toHexString();
            const et = process.hrtime(st);

            const actual = removeExtraSymbols(rStr);
            expect(actual === expected).toBe(true);

            console.log(`TestCase(${i}) was in ms ${et[1] / 1000000}`);
        }
    });

    it("invalid", () => {
        for(let i = 50; i <= 65; i++) {
            const text = fs.readFileSync(`tests/testCases/${i}/prod.min.js`).toString();
            const hashAndCode = splitHashAndCode(text);
            const expected = SHA256(hashAndCode.code).toString();
            const xStr = mutateHexString(b64toHex(hashAndCode.hash));

            const st = process.hrtime();
            const x = new BigInteger(xStr);
            const m = new BigInteger(nStr);
            const r = x.modPowInt(e, m);
            const rStr = r.toHexString();
            const et = process.hrtime(st);

            const actual = removeExtraSymbols(rStr);
            expect(actual === expected).toBe(true);

            console.log(`TestCase(${i}) was in ms ${et[1] / 1000000}`);
        }
    });
});



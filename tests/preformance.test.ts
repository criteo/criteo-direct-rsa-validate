import fs from "fs";
import {SHA256} from "crypto-js";
import {modPow} from "../src/modPow";
import {splitHashAndCode} from "../src/inputParser";
import {b64toHex, mutateHexString, removeExtraSymbols} from "../src/stringCovnerter";

// PUBLIC KEY INFO
const e = 65537;
const nStr = "ced418c02139054ed3f420cce617baacaa1a6ecb57466933c79e3314f66459b2b9df4770b4b04379a5813311c1513e79098c9ba11fc467879f8213e2dc2a0d19f1967b3a63928f4fea9d84c0602bb4711e4b8b2586efd2a522053231ba7ddae946836e200321ab567e3ebffe1ce775a5384529e185af6fcd86d020f935c0cda5";

describe("performance tests", () => {
    it("valid", () => {
        for(let i = 50; i <= 65; i++) {
            const text = fs.readFileSync(`tests/testCases/${i}/prod.min.js`).toString();
            const hashAndCode = splitHashAndCode(text);
            const xStr = b64toHex(hashAndCode.hash);

            const startTime = process.hrtime();
            const resultStr = modPow(xStr, e, nStr);
            const endTime = process.hrtime(startTime);
            const actual = removeExtraSymbols(resultStr);
            const expected = SHA256(hashAndCode.code).toString();

            expect(actual).toBe(expected);

            console.log(`TestCase(${i}) was in ms ${endTime[1] / 1000000}`);
        }
    });

    it("invalid", () => {
        for(let i = 50; i <= 65; i++) {
            const text = fs.readFileSync(`tests/testCases/${i}/prod.min.js`).toString();
            const hashAndCode = splitHashAndCode(text);
            const xStr = mutateHexString(b64toHex(hashAndCode.hash));

            const startTime = process.hrtime();
            const resultStr = modPow(xStr, e, nStr);
            const endTime = process.hrtime(startTime);
            const actual = removeExtraSymbols(resultStr);
            const expected = SHA256(hashAndCode.code).toString();

            expect(actual === expected).toBe(false);

            console.log(`TestCase(${i}) was in ms ${endTime[1] / 1000000}`);
        }
    });
});



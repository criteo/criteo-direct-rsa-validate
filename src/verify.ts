import {splitHashAndCode} from "./inputParser";
import {b64toHex, removeExtraSymbols} from "./stringCovnerter";
import {modPow} from "./modPow";
import {SHA256} from "crypto-js";

const e = 65537;
const nStr = "ced418c02139054ed3f420cce617baacaa1a6ecb57466933c79e3314f66459b2b9df4770b4b04379a5813311c1513e79098c9ba11fc467879f8213e2dc2a0d19f1967b3a63928f4fea9d84c0602bb4711e4b8b2586efd2a522053231ba7ddae946836e200321ab567e3ebffe1ce775a5384529e185af6fcd86d020f935c0cda5";

export function verify() {
    const text = readValueFromLocalStorage();
    const hashAndCode = splitHashAndCode(text);
    const xStr = b64toHex(hashAndCode.hash);
    const startTime = performance.now();
    const resultStr = modPow(xStr, e, nStr);
    const endTime = performance.now();
    const actual = removeExtraSymbols(resultStr);
    const expected = SHA256(hashAndCode.code).toString();

    console.log(`Verify result: ${(actual === expected ? "OK" : "FAIL")} was in ms ${endTime - startTime}`);
}

function readValueFromLocalStorage(): string {
    let lsKey = 'my_ls_key';
    let lsValue: string | null = localStorage.getItem(lsKey);
    if (lsValue === null) {
        throw new Error("Local Storage is empty");
    } else {
        console.log("Read from Local Storage was successful.")
    }
    return lsValue;
}

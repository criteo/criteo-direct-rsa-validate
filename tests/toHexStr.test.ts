import {bigIntHexStr, toHexStr} from "../src/modPow";

describe("toHexStr tests", () => {

    it("should trim leading zeros", () => expect(toHexStr([1])).toBe("1"));

    it("should NOT trim first zero if value is 0", () => expect(toHexStr([0])).toBe("0"));

    it("should trim leading zero in array",
        () => expect(toHexStr([1, 0])).toBe("1"));

    it("should be ok", () => {
        const hexStr = "abc567867878cd67987cde8978987897ab7897c878987fff7987f978789f97f7";
        const n = bigIntHexStr(hexStr);
        const back = toHexStr(n);

        expect(back).toBe(hexStr);
    });
});

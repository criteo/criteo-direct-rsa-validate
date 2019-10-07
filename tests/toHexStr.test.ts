import {toHexStr} from "../src/modPow";

describe("toHexStr tests", () => {

    it("should trim leading zeros", () => expect(toHexStr([1])).toBe("1"));

    it("should NOT trim first zero if value is 0", () => expect(toHexStr([0])).toBe("0"));

    it("should NOT trim non-leading zeros", () => expect(toHexStr([1, 2])).toBe("2001"));

    it("should trim leading zero in array",
        () => expect(toHexStr([1, 0])).toBe("1"));

    it("should convert letters", () => expect(toHexStr([1, 0, 9, 10, 11, 12, 13, 14, 15])).toBe("f00e00d00c00b00a009000001"));
});
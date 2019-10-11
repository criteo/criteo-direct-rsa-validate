import fs from "fs";
import {SHA256} from "crypto-js";
import {Sha256} from "../src/sha256";
import {b64toHex} from "../src/jsbnLite";

describe("test sha256", () => {
    it("should build sha256", () => {
        const text = fs.readFileSync(`tests/testCases/50/prod.min.js`).toString();
        let totalTime1 = 0;
        let totalTime2 = 0;
        for(let i = 0; i < 500; i++) {
            const startTime1 = process.hrtime();
            const result1 = SHA256(text).toString();
            const endTime1 = process.hrtime(startTime1);
            const spentTime1 = endTime1[1] / 1000000;
            totalTime1 += spentTime1;

            const startTime2 = process.hrtime();
            const result2 = Sha256.hash(text);
            const endTime2 = process.hrtime(startTime2);
            const spentTime2 = endTime2[1] / 1000000;
            totalTime2 += spentTime2;

            if(i % 100 === 0) console.log(`=: ${(result1 === result2).toString()}, t1:${spentTime1}, t2:${spentTime2}`);
        }

        console.log(`AVG: a1:${totalTime1 / 500}, a2:${totalTime2 / 500}`);
    });

    it("should convert pubKey from b64 to hex string properly", () => {
        const input = "ztQYwCE5BU7T9CDM5he6rKoabstXRmkzx54zFPZkWbK530dwtLBDeaWBMxHBUT55CYyboR/EZ4efghPi3CoNGfGWezpjko9P6p2EwGArtHEeS4slhu/SpSIFMjG6fdrpRoNuIAMhq1Z+Pr/+HOd1pThFKeGFr2/NhtAg+TXAzaU=";
        const output = "ced418c02139054ed3f420cce617baacaa1a6ecb57466933c79e3314f66459b2b9df4770b4b04379a5813311c1513e79098c9ba11fc467879f8213e2dc2a0d19f1967b3a63928f4fea9d84c0602bb4711e4b8b2586efd2a522053231ba7ddae946836e200321ab567e3ebffe1ce775a5384529e185af6fcd86d020f935c0cda5";

        expect(b64toHex(input)).toBe(output);
    });
});



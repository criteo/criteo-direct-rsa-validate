import fs from "fs";
import {SHA256} from "crypto-js";
import {Sha256} from "../src/sha256";

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
});



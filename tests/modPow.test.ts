import {modPow} from "../src/modPow";

//todo проверить все деления, тут number - не целое число!

describe("modPow tests", () => {
    it('big values', () => {
        const x = "d2b9f0e1855390adca6d2b9f0e1855390adca6272d33181fe6e7116a94e1e244b1fd2863eda485e7c1ae6b7f4226809f8e8093d60b837114664c85df9f9f50be4ac9dee933e272d33181fe6e7116a94e1e244b1fd2863eda485e7c1ae6b7f4226809f8e8093d60b837114664c85df9f9f50be4ac9dee933e";
        const n = "1388340dc71824f3";
        const e = 5034419;
        const exp = "100d1273f438042e";

        const r = modPow(x, e, n);

        console.log(r);

        expect(r).toBe(exp);
    });

    it('small values', () => {
        const x = "126347891623467abc";
        const n = "ab123123";
        const e = 123;
        const exp = "df01bb0";

        const r = modPow(x, e, n);

        console.log(r);

        expect(r).toBe(exp);
    });
});
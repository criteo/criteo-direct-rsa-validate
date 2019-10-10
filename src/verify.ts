import {b64toHex, BigInteger, removeExtraSymbols} from "./jsbnLite";
import {Sha256} from "./sha256";

export function verify(code: string, hash: string, nStrPubKey: string, ePubKey: number): boolean {
    const xStr = b64toHex(hash);
        const x = new BigInteger(xStr);
        const m = new BigInteger(nStrPubKey);
        const r = x.modPowInt(ePubKey, m);
    return  removeExtraSymbols(r.toHexString()) === Sha256.hash(code);
}

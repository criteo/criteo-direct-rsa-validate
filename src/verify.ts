import {b64toHex, BigInteger, removeExtraSymbols} from "./jsbnLite";
import {Sha256} from "./sha256";

export function verify(code: string, hash: string, nStrPubKey: string, ePubKey: number): boolean {
    const x = new BigInteger(b64toHex(hash));
    const m = new BigInteger(b64toHex(nStrPubKey));
    const r = x.modPowInt(ePubKey, m);
    return removeExtraSymbols(r.toHexString()) === Sha256.hash(code);
}

// Bits per digit
let dbits;

// JavaScript engine analysis
const canary = 0xdeadbeefcafe;
const j_lm = ((canary & 0xffffff) == 0xefcafe);

export class BigInteger {
    constructor(a:string | null) {
        if(a !== null) {
            this.fromHexString(a);
        }
    }

    public toHexString():string {
        if (this.s < 0) {
            return "-" + this.negate().toHexString();
        }
        const k = 4;
        const km = (1 << k) - 1;
        let d;
        let m = false;
        let r = "";
        let i = this.t;
        let p = this.DB - (i * this.DB) % k;
        if (i-- > 0) {
            if (p < this.DB && (d = this[i] >> p) > 0) {
                m = true;
                r = int2char(d);
            }
            while (i >= 0) {
                if (p < k) {
                    d = (this[i] & ((1 << p) - 1)) << (k - p);
                    d |= this[--i] >> (p += this.DB - k);
                } else {
                    d = (this[i] >> (p -= k)) & km;
                    if (p <= 0) {
                        p += this.DB;
                        --i;
                    }
                }
                if (d > 0) {
                    m = true;
                }
                if (m) {
                    r += int2char(d);
                }
            }
        }
        return m ? r : "0";
    }

    public fromHexString(s:string | null) {
        if(s === null) {
            return;
        }

        let k = 4;
        this.t = 0;
        this.s = 0;
        let i = s.length;
        let mi = false;
        let sh = 0;
        while (--i >= 0) {
            const x = (k == 8) ? (+s[i]) & 0xff : intAt(s as string, i);
            if (x < 0) {
                if ((s as string).charAt(i) == "-") {
                    mi = true;
                }
                continue;
            }
            mi = false;
            if (sh == 0) {
                this[this.t++] = x;
            } else if (sh + k > this.DB) {
                this[this.t - 1] |= (x & ((1 << (this.DB - sh)) - 1)) << sh;
                this[this.t++] = (x >> (this.DB - sh));
            } else {
                this[this.t - 1] |= x << sh;
            }
            sh += k;
            if (sh >= this.DB) {
                sh -= this.DB;
            }
        }
        if (k == 8 && ((+s[0]) & 0x80) != 0) {
            this.s = -1;
            if (sh > 0) {
                this[this.t - 1] |= ((1 << (this.DB - sh)) - 1) << sh;
            }
        }
        this.clamp();
        if (mi) {
            BigInteger.ZERO.subTo(this, this);
        }
    }

    protected negate():BigInteger {
        const r = nbi();
        BigInteger.ZERO.subTo(this, r);
        return r;
    }

    public abs() {
        return (this.s < 0) ? this.negate() : this;
    }

    public mod(a:BigInteger):BigInteger {
        const r = nbi();
        this.abs().divRemTo(a, null, r);
        if (this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) {
            a.subTo(r, r);
        }
        return r;
    }

    public copyTo(r:BigInteger) {
        for (let i = this.t - 1; i >= 0; --i) {
            r[i] = this[i];
        }
        r.t = this.t;
        r.s = this.s;
    }

    protected lShiftTo(n:number, r:BigInteger) {
        const bs = n % this.DB;
        const cbs = this.DB - bs;
        const bm = (1 << cbs) - 1;
        const ds = Math.floor(n / this.DB);
        let c = (this.s << bs) & this.DM;

        for (let i = this.t - 1; i >= 0; --i) {
            r[i + ds + 1] = (this[i] >> cbs) | c;
            c = (this[i] & bm) << bs;
        }
        for (let i = ds - 1; i >= 0; --i) {
            r[i] = 0;
        }
        r[ds] = c;
        r.t = this.t + ds + 1;
        r.s = this.s;
        r.clamp();
    }

    public invDigit():number {
        if (this.t < 1) {
            return 0;
        }
        const x = this[0];
        if ((x & 1) == 0) {
            return 0;
        }
        let y = x & 3; // y == 1/x mod 2^2
        y = (y * (2 - (x & 0xf) * y)) & 0xf; // y == 1/x mod 2^4
        y = (y * (2 - (x & 0xff) * y)) & 0xff; // y == 1/x mod 2^8
        y = (y * (2 - (((x & 0xffff) * y) & 0xffff))) & 0xffff; // y == 1/x mod 2^16
        // last step - calculate inverse mod DV directly;
        // assumes 16 < DB <= 32 and assumes ability to handle 48-bit ints
        y = (y * (2 - x * y % this.DV)) % this.DV; // y == 1/x mod 2^dbits
        // we really want the negative inverse, and -DV < y < DV
        return (y > 0) ? this.DV - y : -y;
    }

    public dlShiftTo(n:number, r:BigInteger) {
        let i;
        for (i = this.t - 1; i >= 0; --i) {
            r[i + n] = this[i];
        }
        for (i = n - 1; i >= 0; --i) {
            r[i] = 0;
        }
        r.t = this.t + n;
        r.s = this.s;
    }

    public squareTo(r:BigInteger) {
        const x = this.abs();
        let i = r.t = 2 * x.t;
        while (--i >= 0) {
            r[i] = 0;
        }
        for (i = 0; i < x.t - 1; ++i) {
            const c = x.am(i, x[i], r, 2 * i, 0, 1);
            if ((r[i + x.t] += x.am(i + 1, 2 * x[i], r, 2 * i + 1, c, x.t - i - 1)) >= x.DV) {
                r[i + x.t] -= x.DV;
                r[i + x.t + 1] = 1;
            }
        }
        if (r.t > 0) {
            r[r.t - 1] += x.am(i, x[i], r, 2 * i, 0, 1);
        }
        r.s = 0;
        r.clamp();
    }

    public multiplyTo(a:BigInteger, r:BigInteger) {
        const x = this.abs();
        const y = a.abs();
        let i = x.t;
        r.t = i + y.t;
        while (--i >= 0) {
            r[i] = 0;
        }
        for (i = 0; i < y.t; ++i) {
            r[i + x.t] = x.am(0, y[i], r, i, 0, x.t);
        }
        r.s = 0;
        r.clamp();
        if (this.s != a.s) {
            BigInteger.ZERO.subTo(r, r);
        }
    }

    public divRemTo(m:BigInteger, q:BigInteger | null, r:BigInteger) {
        const pm = m.abs();
        if (pm.t <= 0) {
            return;
        }
        const pt = this.abs();
        if (pt.t < pm.t) {
            if (q != null) {
                q.fromHexString("0");
            }
            if (r != null) {
                this.copyTo(r);
            }
            return;
        }
        if (r == null) {
            r = nbi();
        }
        const y = nbi();
        const ts = this.s;
        const ms = m.s;
        const nsh = this.DB - nbits(pm[pm.t - 1]); // normalize modulus
        if (nsh > 0) {
            pm.lShiftTo(nsh, y);
            pt.lShiftTo(nsh, r);
        } else {
            pm.copyTo(y);
            pt.copyTo(r);
        }
        const ys = y.t;
        const y0 = y[ys - 1];
        if (y0 == 0) {
            return;
        }
        const yt = y0 * (1 << this.F1) + ((ys > 1) ? y[ys - 2] >> this.F2 : 0);
        const d1 = this.FV / yt;
        const d2 = (1 << this.F1) / yt;
        const e = 1 << this.F2;
        let i = r.t;
        let j = i - ys;
        const t = (q == null) ? nbi() : q;
        y.dlShiftTo(j, t);
        if (r.compareTo(t) >= 0) {
            r[r.t++] = 1;
            r.subTo(t, r);
        }
        BigInteger.ONE.dlShiftTo(ys, t);
        t.subTo(y, y); // "negative" y so we can replace sub with am later
        while (y.t < ys) {
            y[y.t++] = 0;
        }
        while (--j >= 0) {
            // Estimate quotient digit
            let qd = (r[--i] == y0) ? this.DM : Math.floor(r[i] * d1 + (r[i - 1] + e) * d2);
            if ((r[i] += y.am(0, qd, r, j, 0, ys)) < qd) { // Try it out
                y.dlShiftTo(j, t);
                r.subTo(t, r);
                while (r[i] < --qd) {
                    r.subTo(t, r);
                }
            }
        }
        if (q != null) {
            r.drShiftTo(ys, q);
            if (ts != ms) {
                BigInteger.ZERO.subTo(q, q);
            }
        }
        r.t = ys;
        r.clamp();
        if (nsh > 0) {
            r.rShiftTo(nsh, r);
        } // Denormalize remainder
        if (ts < 0) {
            BigInteger.ZERO.subTo(r, r);
        }
    }

    protected rShiftTo(n:number, r:BigInteger) {
        r.s = this.s;
        const ds = Math.floor(n / this.DB);
        if (ds >= this.t) {
            r.t = 0;
            return;
        }
        const bs = n % this.DB;
        const cbs = this.DB - bs;
        const bm = (1 << bs) - 1;
        r[0] = this[ds] >> bs;
        for (let i = ds + 1; i < this.t; ++i) {
            r[i - ds - 1] |= (this[i] & bm) << cbs;
            r[i - ds] = this[i] >> bs;
        }
        if (bs > 0) {
            r[this.t - ds - 1] |= (this.s & bm) << cbs;
        }
        r.t = this.t - ds;
        r.clamp();
    }

    public drShiftTo(n:number, r:BigInteger) {
        for (let i = n; i < this.t; ++i) {
            r[i - n] = this[i];
        }
        r.t = Math.max(this.t - n, 0);
        r.s = this.s;
    }

    public subTo(a:BigInteger, r:BigInteger) {
        let i = 0;
        let c = 0;
        const m = Math.min(a.t, this.t);
        while (i < m) {
            c += this[i] - a[i];
            r[i++] = c & this.DM;
            c >>= this.DB;
        }
        if (a.t < this.t) {
            c -= a.s;
            while (i < this.t) {
                c += this[i];
                r[i++] = c & this.DM;
                c >>= this.DB;
            }
            c += this.s;
        } else {
            c += this.s;
            while (i < a.t) {
                c -= a[i];
                r[i++] = c & this.DM;
                c >>= this.DB;
            }
            c -= a.s;
        }
        r.s = (c < 0) ? -1 : 0;
        if (c < -1) {
            r[i++] = this.DV + c;
        } else if (c > 0) {
            r[i++] = c;
        }
        r.t = i;
        r.clamp();
    }

    public clamp() {
        const c = this.s & this.DM;
        while (this.t > 0 && this[this.t - 1] == c) {
            --this.t;
        }
    }

    public modPowInt(e:number, m:BigInteger):BigInteger {
        let z;
        if (e < 256 || m.isEven()) {
            z = new Classic(m);
        } else {
            z = new Montgomery(m);
        }
        return this.exp(e, z);
    }

    protected exp(e:number, z:IReduction) {
        if (e > 0xffffffff || e < 1) {
            return BigInteger.ONE;
        }
        let r = nbi();
        let r2 = nbi();
        const g = z.convert(this);
        let i = nbits(e) - 1;
        g.copyTo(r);
        while (--i >= 0) {
            z.sqrTo(r, r2);
            if ((e & (1 << i)) > 0) {
                z.mulTo(r2, g, r);
            } else {
                const t = r;
                r = r2;
                r2 = t;
            }
        }
        return z.revert(r);
    }

    protected isEven() {
        return ((this.t > 0) ? (this[0] & 1) : this.s) == 0;
    }

    public compareTo(a:BigInteger):number {
        let r = this.s - a.s;
        if (r != 0) {
            return r;
        }
        let i = this.t;
        r = i - a.t;
        if (r != 0) {
            return (this.s < 0) ? -r : r;
        }
        while (--i >= 0) {
            if ((r = this[i] - a[i]) != 0) {
                return r;
            }
        }
        return 0;
    }

    // @ts-ignore
    public s:number;
    // @ts-ignore
    public t:number;

    // @ts-ignore
    public DB:number;
    // @ts-ignore
    public DM:number;
    // @ts-ignore
    public DV:number;

    // @ts-ignore
    public FV:number;
    // @ts-ignore
    public F1:number;
    // @ts-ignore
    public F2:number;
    // @ts-ignore

    // @ts-ignore
    public am:(i:number, x:number, w:BigInteger, j:number, c:number, n:number) => number;

    [index:number]:number;

    public static ONE:BigInteger;
    public static ZERO:BigInteger;

    public am1(i:number, x:number, w:BigInteger, j:number, c:number, n:number) {
        while (--n >= 0) {
            const v = x * this[i++] + w[j] + c;
            c = Math.floor(v / 0x4000000);
            w[j++] = v & 0x3ffffff;
        }
        return c;
    }
// am2 avoids a big mult-and-extract completely.
// Max digit bits should be <= 30 because we do bitwise ops
// on values up to 2*hdvalue^2-hdvalue-1 (< 2^31)
    public am2(i:number, x:number, w:BigInteger, j:number, c:number, n:number) {
        const xl = x & 0x7fff;
        const xh = x >> 15;
        while (--n >= 0) {
            let l = this[i] & 0x7fff;
            const h = this[i++] >> 15;
            const m = xh * l + h * xl;
            l = xl * l + ((m & 0x7fff) << 15) + w[j] + (c & 0x3fffffff);
            c = (l >>> 30) + (m >>> 15) + xh * h + (c >>> 30);
            w[j++] = l & 0x3fffffff;
        }
        return c;
    }
// Alternately, set max digit bits to 28 since some
// browsers slow down when dealing with 32-bit numbers.
    public am3(i:number, x:number, w:BigInteger, j:number, c:number, n:number) {
        const xl = x & 0x3fff;
        const xh = x >> 14;
        while (--n >= 0) {
            let l = this[i] & 0x3fff;
            const h = this[i++] >> 14;
            const m = xh * l + h * xl;
            l = xl * l + ((m & 0x3fff) << 14) + w[j] + c;
            c = (l >> 28) + (m >> 14) + xh * h;
            w[j++] = l & 0xfffffff;
        }
        return c;
    }
}

export function nbi() { return new BigInteger(null); }

export function nbits(x:number) {
    let r = 1;
    let t;
    if ((t = x >>> 16) != 0) {
        x = t;
        r += 16;
    }
    if ((t = x >> 8) != 0) {
        x = t;
        r += 8;
    }
    if ((t = x >> 4) != 0) {
        x = t;
        r += 4;
    }
    if ((t = x >> 2) != 0) {
        x = t;
        r += 2;
    }
    if ((t = x >> 1) != 0) {
        x = t;
        r += 1;
    }
    return r;
}

const BI_RC:number[] = [];
let rr;
let vv;
rr = "0".charCodeAt(0);
for (vv = 0; vv <= 9; ++vv) {
    BI_RC[rr++] = vv;
}
rr = "a".charCodeAt(0);
for (vv = 10; vv < 36; ++vv) {
    BI_RC[rr++] = vv;
}
rr = "A".charCodeAt(0);
for (vv = 10; vv < 36; ++vv) {
    BI_RC[rr++] = vv;
}

export function intAt(s:string, i:number) {
    const c = BI_RC[s.charCodeAt(i)];
    return (c == null) ? -1 : c;
}

const BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";

export function int2char(n:number) {
    return BI_RM.charAt(n);
}

export interface IReduction {
    convert(x:BigInteger):BigInteger;

    revert(x:BigInteger):BigInteger;

    mulTo(x:BigInteger, y:BigInteger, r:BigInteger):void;

    sqrTo(x:BigInteger, r:BigInteger):void;
}

class Classic implements IReduction {
    constructor(protected m:BigInteger) {
    }

    // Classic.prototype.convert = cConvert;
    public convert(x:BigInteger) {
        if (x.s < 0 || x.compareTo(this.m) >= 0) {
            return x.mod(this.m);
        } else {
            return x;
        }
    }

    // Classic.prototype.revert = cRevert;
    public revert(x:BigInteger) {
        return x;
    }

    // Classic.prototype.reduce = cReduce;
    public reduce(x:BigInteger) {
        x.divRemTo(this.m, null, x);
    }

    // Classic.prototype.mulTo = cMulTo;
    public mulTo(x:BigInteger, y:BigInteger, r:BigInteger) {
        x.multiplyTo(y, r);
        this.reduce(r);
    }

    // Classic.prototype.sqrTo = cSqrTo;
    public sqrTo(x:BigInteger, r:BigInteger) {
        x.squareTo(r);
        this.reduce(r);
    }
}

class Montgomery implements IReduction {
    constructor(protected m:BigInteger) {
        this.mp = m.invDigit();
        this.mpl = this.mp & 0x7fff;
        this.mph = this.mp >> 15;
        this.um = (1 << (m.DB - 15)) - 1;
        this.mt2 = 2 * m.t;
    }

    protected mp:number;
    protected mpl:number;
    protected mph:number;
    protected um:number;
    protected mt2:number;

    // Montgomery.prototype.convert = montConvert;
    // xR mod m
    public convert(x:BigInteger) {
        const r = nbi();
        x.abs().dlShiftTo(this.m.t, r);
        r.divRemTo(this.m, null, r);
        if (x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) {
            this.m.subTo(r, r);
        }
        return r;
    }

    // Montgomery.prototype.revert = montRevert;
    // x/R mod m
    public revert(x:BigInteger) {
        const r = nbi();
        x.copyTo(r);
        this.reduce(r);
        return r;
    }

    // Montgomery.prototype.reduce = montReduce;
    // x = x/R mod m (HAC 14.32)
    public reduce(x:BigInteger) {
        while (x.t <= this.mt2) {
            // pad x so am has enough room later
            x[x.t++] = 0;
        }
        for (let i = 0; i < this.m.t; ++i) {
            // faster way of calculating u0 = x[i]*mp mod DV
            let j = x[i] & 0x7fff;
            const u0 = (j * this.mpl + (((j * this.mph + (x[i] >> 15) * this.mpl) & this.um) << 15)) & x.DM;
            // use am to combine the multiply-shift-add into one call
            j = i + this.m.t;
            x[j] += this.m.am(0, u0, x, i, 0, this.m.t);
            // propagate carry
            while (x[j] >= x.DV) {
                x[j] -= x.DV;
                x[++j]++;
            }
        }
        x.clamp();
        x.drShiftTo(this.m.t, x);
        if (x.compareTo(this.m) >= 0) {
            x.subTo(this.m, x);
        }
    }

    // Montgomery.prototype.mulTo = montMulTo;
    // r = "xy/R mod m"; x,y != r
    public mulTo(x:BigInteger, y:BigInteger, r:BigInteger) {
        x.multiplyTo(y, r);
        this.reduce(r);
    }

    // Montgomery.prototype.sqrTo = montSqrTo;
    // r = "x^2/R mod m"; x != r
    public sqrTo(x:BigInteger, r:BigInteger) {
        x.squareTo(r);
        this.reduce(r);
    }
}

export function nbv(i:number) {
    const r = nbi();
    r.fromHexString(i.toString());
    return r;
}

BigInteger.ZERO = nbv(0);
BigInteger.ONE = nbv(1);

if (j_lm && (navigator.appName == "Microsoft Internet Explorer")) {
    BigInteger.prototype.am = BigInteger.prototype.am2;
    dbits = 30;
} else if (j_lm && (navigator.appName != "Netscape")) {
    BigInteger.prototype.am = BigInteger.prototype.am1;
    dbits = 26;
} else { // Mozilla/Netscape seems to prefer am3
    BigInteger.prototype.am = BigInteger.prototype.am3;
    dbits = 28;
}

BigInteger.prototype.DB = dbits;
BigInteger.prototype.DM = ((1 << dbits) - 1);
BigInteger.prototype.DV = (1 << dbits);

const BI_FP = 52;
BigInteger.prototype.FV = Math.pow(2, BI_FP);
BigInteger.prototype.F1 = BI_FP - dbits;
BigInteger.prototype.F2 = 2 * dbits - BI_FP;

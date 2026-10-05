import { createHash } from "crypto";

// PayFast settings. Without real merchant secrets the public PayFast sandbox
// account is used, so the whole flow can be tested with no real money.
export function payfastConfig() {
  const id = process.env["PAYFAST_MERCHANT_ID"];
  const key = process.env["PAYFAST_MERCHANT_KEY"];
  const live = !!id && !!key && process.env["PAYFAST_MODE"] === "live";
  return {
    merchantId: id || "10004002",
    merchantKey: key || "q1cd2rdny4a53",
    passphrase: id ? process.env["PAYFAST_PASSPHRASE"] ?? "" : "payfast",
    host: live ? "www.payfast.co.za" : "sandbox.payfast.co.za",
    live,
  };
}

/** PHP-style urlencode, which PayFast signs against. */
export function pfEncode(v: string) {
  return encodeURIComponent(v.trim())
    .replace(/%20/g, "+")
    .replace(/[!'()*~]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

export const md5 = (s: string) => createHash("md5").update(s).digest("hex");

/** Signature over fields in the order they will be posted (blank fields skipped). */
export function signFields(fields: [string, string][], passphrase: string) {
  const base = fields.filter(([, v]) => v !== "").map(([k, v]) => `${k}=${pfEncode(v)}`).join("&");
  return md5(passphrase ? `${base}&passphrase=${pfEncode(passphrase)}` : base);
}

#!/usr/bin/env python3
"""Minimal ACME v2 (RFC 8555) DNS-01 client using Cloudflare for TXT records.
Self-contained: stdlib + cryptography. Issues a Let's Encrypt cert."""
import base64, hashlib, json, os, sys, time, urllib.request, urllib.error

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
from cryptography import x509
from cryptography.x509.oid import NameOID

DIRECTORY = os.environ.get("ACME_DIR", "https://acme-v02.api.letsencrypt.org/directory")
DOMAIN = os.environ["DOMAIN"]
EMAIL = os.environ.get("EMAIL", "ysnocklol@gmail.com")
CF_TOKEN = os.environ["CF_TOKEN"]
ZONE_ID = os.environ["ZONE_ID"]
OUT_DIR = os.environ.get("OUT_DIR", ".")

def b64(b):
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()

def http(url, data=None, headers=None, method=None):
    h = {"User-Agent": "mini-acme/1.0", "Accept": "application/json"}
    if headers: h.update(headers)
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        r = urllib.request.urlopen(req, timeout=30)
        return r.getcode(), r.read(), dict(r.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read(), dict(e.headers)

# ---- account key (EC P-256) ----
acct_key = ec.generate_private_key(ec.SECP256R1())
nums = acct_key.public_key().public_numbers()
x = nums.x.to_bytes(32, "big"); y = nums.y.to_bytes(32, "big")
JWK = {"crv": "P-256", "kty": "EC", "x": b64(x), "y": b64(y)}
thumb = b64(hashlib.sha256(json.dumps(JWK, separators=(",", ":"), sort_keys=True).encode()).digest())

def sign(protected, payload):
    p64 = b64(json.dumps(protected, separators=(",", ":")).encode())
    pl64 = "" if payload == "" else b64(json.dumps(payload, separators=(",", ":")).encode())
    signing = (p64 + "." + pl64).encode()
    der = acct_key.sign(signing, ec.ECDSA(hashes.SHA256()))
    r, s = decode_dss_signature(der)
    sig = b64(r.to_bytes(32, "big") + s.to_bytes(32, "big"))
    return json.dumps({"protected": p64, "payload": pl64, "signature": sig}).encode()

dirj = json.loads(http(DIRECTORY)[1])
_nonce = [http(dirj["newNonce"], method="HEAD")[2]["Replay-Nonce"]]

def acme(url, payload, kid=None):
    prot = {"alg": "ES256", "nonce": _nonce[0], "url": url}
    if kid: prot["kid"] = kid
    else: prot["jwk"] = JWK
    code, body, hdrs = http(url, data=sign(prot, payload),
                            headers={"Content-Type": "application/jose+json"})
    if "Replay-Nonce" in hdrs: _nonce[0] = hdrs["Replay-Nonce"]
    return code, body, hdrs

# ---- new account ----
code, body, hdrs = acme(dirj["newAccount"], {"termsOfServiceAgreed": True, "contact": ["mailto:" + EMAIL]})
assert code in (200, 201), ("newAccount", code, body)
KID = hdrs["Location"]
print("[acme] account ok")

# ---- new order ----
code, body, hdrs = acme(dirj["newOrder"], {"identifiers": [{"type": "dns", "value": DOMAIN}]}, kid=KID)
assert code == 201, ("newOrder", code, body)
order = json.loads(body); order_url = hdrs["Location"]

# ---- authorization -> dns-01 ----
authz_url = order["authorizations"][0]
code, body, _ = acme(authz_url, "", kid=KID)
authz = json.loads(body)
chal = next(c for c in authz["challenges"] if c["type"] == "dns-01")
keyauth = chal["token"] + "." + thumb
txt_value = b64(hashlib.sha256(keyauth.encode()).digest())
rec_name = "_acme-challenge." + DOMAIN
print("[acme] dns-01 TXT", rec_name, "=", txt_value)

def cf(method, path, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    return http("https://api.cloudflare.com/client/v4" + path, data=data, method=method,
                headers={"Authorization": "Bearer " + CF_TOKEN, "Content-Type": "application/json"})

# create TXT
code, body, _ = cf("POST", f"/zones/{ZONE_ID}/dns_records",
                   {"type": "TXT", "name": rec_name, "content": txt_value, "ttl": 120})
j = json.loads(body)
assert j.get("success"), ("cf create TXT", body)
rec_id = j["result"]["id"]
print("[cf] TXT created", rec_id)

try:
    # wait for propagation via 1.1.1.1 DoH
    print("[dns] waiting for propagation...")
    ok = False
    for i in range(40):
        c, b, _ = http(f"https://cloudflare-dns.com/dns-query?name={rec_name}&type=TXT",
                       headers={"Accept": "application/dns-json"})
        try:
            ans = json.loads(b).get("Answer", []) or []
            vals = [a.get("data", "").strip('"') for a in ans]
            if txt_value in vals:
                ok = True; print(f"[dns] propagated after ~{i*5}s"); break
        except Exception:
            pass
        time.sleep(5)
    if not ok:
        print("[dns] not confirmed via DoH, proceeding anyway")

    # tell ACME to validate
    code, body, _ = acme(chal["url"], {}, kid=KID)
    assert code in (200, 202), ("respond chal", code, body)

    # poll authz
    for _ in range(40):
        code, body, _ = acme(authz_url, "", kid=KID)
        st = json.loads(body)["status"]
        if st == "valid": print("[acme] authz valid"); break
        if st == "invalid": sys.exit("authz invalid: " + body.decode())
        time.sleep(4)
    else:
        sys.exit("authz timeout")

    # ---- finalize: CSR ----
    cert_key = ec.generate_private_key(ec.SECP256R1())
    csr = (x509.CertificateSigningRequestBuilder()
           .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, DOMAIN)]))
           .add_extension(x509.SubjectAlternativeName([x509.DNSName(DOMAIN)]), critical=False)
           .sign(cert_key, hashes.SHA256()))
    csr_der = csr.public_bytes(serialization.Encoding.DER)
    code, body, _ = acme(order["finalize"], {"csr": b64(csr_der)}, kid=KID)
    assert code == 200, ("finalize", code, body)

    # poll order
    cert_url = None
    for _ in range(40):
        code, body, _ = acme(order_url, "", kid=KID)
        o = json.loads(body)
        if o["status"] == "valid": cert_url = o["certificate"]; break
        if o["status"] == "invalid": sys.exit("order invalid: " + body.decode())
        time.sleep(4)
    assert cert_url, "order timeout"

    code, body, _ = acme(cert_url, "", kid=KID)
    assert code == 200, ("download", code, body)
    fullchain = body.decode()

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "dashboard.crt"), "w") as f: f.write(fullchain)
    key_pem = cert_key.private_bytes(serialization.Encoding.PEM,
                                     serialization.PrivateFormat.TraditionalOpenSSL,
                                     serialization.NoEncryption()).decode()
    with open(os.path.join(OUT_DIR, "dashboard.key"), "w") as f: f.write(key_pem)
    print("[done] cert + key written to", OUT_DIR)
finally:
    cf("DELETE", f"/zones/{ZONE_ID}/dns_records/{rec_id}")
    print("[cf] TXT cleaned up")

// TODO: Replace this v1 placeholder hash with Poseidon2 once the stdlib/API version is fixed for this repo.
// This is intentionally simple so the primitive composition is explicit and auditable in early integration.

pub fn hash2(a: Field, b: Field) -> Field {
    a + (b * 7) + 13
}

pub fn hash3(a: Field, b: Field, c: Field) -> Field {
    hash2(hash2(a, b), c)
}

pub fn hash4(a: Field, b: Field, c: Field, d: Field) -> Field {
    hash2(hash2(a, b), hash2(c, d))
}

pub fn hash6(a: Field, b: Field, c: Field, d: Field, e: Field, f: Field) -> Field {
    hash2(hash4(a, b, c, d), hash2(e, f))
}

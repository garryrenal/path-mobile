# Security Specification - PATH Mobile

## Data Invariants
- A treatment record cannot exist without a valid patient ID.
- A teammate can only create treatment records for themselves (`teammateId == request.auth.uid`).
- Once a treatment is `submitted`, it is locked and cannot be modified (Terminal State Locking).
- Patient records can only be updated with specific demographic fields.

## The Dirty Dozen (Test Payloads)

1. **Identity Spoofing**: Teammate A tries to create a treatment record with `teammateId` set to Teammate B's UID.
2. **Patient Poisoning**: User tries to update a patient's MRN (immutable field).
3. **Ghost Fields**: User tries to add `isVerifiedAdmin: true` to their user profile.
4. **State Shortcut**: User tries to set status to `submitted` without going through `pre` or `tx` steps (if enforced, though here we allow creation with any valid status for simplicity, but update is restricted).
5. **Terminal State Break**: User tries to update a `submitted` treatment record.
6. **Orphaned Row**: User tries to create a treatment for a `patientId` that doesn't match the path variable (already guarded by path checking in rules).
7. **Size Attack**: User tries to send a 1MB string for a patient's name.
8. **Auth Bypass**: Unauthenticated user tries to read any patient or treatment.
9. **Relational Sync**: User tries to update a treatment's `patientId` to point to a different patient.
10. **Admin Privilege Escalation**: User tries to change their `role` in the `users` collection to `admin`.
11. **ID Injection**: User tries to use a 2KB junk string as a `treatmentId`.
12. **PII Exposure**: User tries to list all patients without being a signed-in teammate.

## Test Runner (Simplified Logic for firestore.rules.test.ts)

The `firestore.rules` must correctly reject all the above payloads.
Validation helpers `isValidHD`, `isValidApheresis`, and `isValidNTS` are used to enforce schema and identity during writes.
Terminal state `submitted` prevents any updates to existing records.
`incoming().diff(existing()).affectedKeys().hasOnly(...)` ensures only whitelisted fields are changed.

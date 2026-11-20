# Authenticated single-package cart

All cart routes require an active `STUDENT` or `PARENT` account. Students buy for
themselves; parents select an active student currently linked to their account.
The cart contains one package for one student, with quantity fixed at one.

- `GET /cart`: creates/returns the caller's cart. Empty carts have `revision: 0`,
  `item: null`, and `quote: null`. The response includes safe `students`,
  `paymentReadiness`, `merchant`, `legalVersions`, `canPurchase`, `canCheckout`,
  `quoteChanged`, `reason`, and an optional related `orderId`.
- `PUT /cart/item`: `{ revision, packageId, studentId? }`. A parent must select a
  student. The server resolves the price, period, eligibility and quote; no client
  quantity or amount is accepted. Successful changes increment `revision`.
- `DELETE /cart`: `{ revision }`. Clears the selection and increments `revision`.
- `POST /cart/checkout`: `{ revision, identityNumber, phone, city, address,
  termsAccepted: true, privacyAccepted: true, salesAgreementAccepted: true }`.
  The sales acknowledgement covers the pre-information and distance-sales texts;
  the privacy acknowledgement records that the notice was read, not optional
  marketing consent. Returns the existing hosted-checkout response.

Unknown body fields are rejected. Stale revisions, concurrent mutations during
checkout, changed prices/periods/class mappings/student selection/legal versions,
and existing unresolved hosted sessions return `409`. A changed quote must be
explicitly accepted with another `PUT /cart/item`; reading the cart never silently
accepts a new price. The payment service compares the quote again before opening
the hosted page, after the cart's checkout lease has been acquired.

Packages default to `gradePolicy: fixed`, retaining their same-level class set.
With `student-level`, administrators explicitly configure at most one active
class per level from 1 through 8. Checkout resolves only the class matching the
student's single authoritative level; missing or ambiguous mappings cannot be
paid. The quote includes the policy, configured classes and resolved target.
Orders snapshot only the resolved classes, so later package edits cannot broaden
an existing purchase. No catalog class mapping is created automatically.

Saving a cart works without merchant keys. `canPurchase` describes account/package
eligibility; `canCheckout` also requires provider readiness and an unchanged quote.
No provider operation occurs on cart reads or edits. The cart stores no billing
address, identity number or hosted token; checkout leases and fingerprints are
private. The order snapshots the accepted legal versions and timestamps, price,
period, package/class selection and merchant identity. Only a verified payment
clears the exact cart revision and order that initiated checkout. A late callback
cannot clear a newer cart selection.

Legacy `POST /payment/initialize` remains available, and requires the same three
acknowledgements for every new initialization. It accepts an optional `quoteHash`
from `/payment/checkout-context/:packageId`; the new cart always uses the final
server quote check. Existing
provider callback verification, reconciliation, cancellation protection and
refund-request semantics are unchanged. No real refund is sent by this module.

# iyzico Checkout Form notifications

`PAYMENT_CALLBACK_URL` still points to the browser return route,
`POST /payment/provider-callback`. The browser return and authenticated order
reconciliation remain available independently of webhook configuration.

For payment recovery when the browser return is interrupted, configure the
merchant panel's HTTPS notification URL as `POST /payment/provider-webhook`.
The merchant must have `X-IYZ-SIGNATURE-V3` enabled. Use the same environment and
merchant secret as Checkout Form, and verify delivery in the test environment
before using live keys. See the [iyzico HPP V3 documentation](https://docs.iyzico.com/ek-servisler/webhook).

The webhook checks the HPP V3 signature before looking up the exact order,
token and environment. Only terminal Checkout Form notifications trigger the
existing signed CF result query. The payment ID and status must also match the
notification; the regular order, amount, currency and fraud checks still apply.
The notification alone never marks an order paid or grants access.

Accepted or already processed notifications return an empty `204`. Invalid
signatures return `403`, and a temporarily unavailable or unconfirmed result
returns `503` so iyzico can retry. A per-order lease prevents concurrent webhook
replays from starting a second query. Order responses omit notification
fingerprints, leases and provider tokens.

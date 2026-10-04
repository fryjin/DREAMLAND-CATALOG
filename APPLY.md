# F3-D2 Contact Validation Boundary Repair

## Apply

1. Checkout baseline:

git checkout a251888

2. Apply files from this patch package.

3. Run validation:

npm run r4:conversion:contact-review-boundary
npm run check
npm run build

## Acceptance

Verify:

- Contact page:
  - empty WhatsApp / phone / WeChat blocks Continue
  - invalid value shows directly on Contact field
  - user can identify the blocking field

- Review page:
  - does not become first discovery point for missing contact method
  - final submission guard remains active
  - blocker message identifies missing field and next action

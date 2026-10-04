# Implementation Notes

The audit found the current flow already calls contact.validate() inside continueToReview().
The defect is boundary consistency: Contact UI validation presentation and Review blocking presentation are not aligned.

Required implementation:
- expose contact validation result before route transition
- map phone_or_wechat errors to Contact field error container
- keep Review submit validation as final guard
- provide explicit blocker summary when validation prevents progression

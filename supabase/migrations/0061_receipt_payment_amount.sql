-- Receipts show THIS payment ({{payment_amount}}), plus what's paid so far
-- and what's left. Only rewrites templates still on their original text.
update email_automations set
  subject = 'Payment in: {{payment_amount}} · {{listing}}',
  body = E'A payment was completed:\n\n- {{listing}}, {{check_in}} → {{check_out}}\n- Guest: {{guest_name}}\n- This payment: {{payment_amount}}\n- Paid so far: {{amount_paid}} of {{total}} · Balance left: {{balance_left}}\n- Invoice: {{invoice_link}}'
where key = 'admin_payment_receipt'
  and subject = 'Payment in: {{amount_paid}} · {{listing}}';

update email_automations set
  body = E'Hola {{guest_name}},\n\nWe''ve received your payment of {{payment_amount}} for:\n\n- {{listing}}, {{check_in}} → {{check_out}}\n\nPaid so far: {{amount_paid}} of {{total}} · Balance left: {{balance_left}}\n\nYour invoice: {{invoice_link}}\n\nThank you — everything is on track for your stay!'
where key = 'guest_payment_receipt'
  and body like E'Hola {{guest_name}},\n\nWe''ve received your payment of {{amount_paid}} for:%';

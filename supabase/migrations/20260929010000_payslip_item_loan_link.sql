-- Lets finalizing a payroll period reduce the right loan's remaining balance.
alter table payslip_items add column loan_id uuid references loans (id);

## Table `mes_operators`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `pin_code` | `varchar` |  Unique |
| `name` | `varchar` |  |
| `role` | `varchar` |  |
| `avatar` | `text` |  Nullable |
| `color` | `varchar` |  Nullable |
| `is_active` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `full_name` | `varchar` |  Nullable |
| `phone_number` | `varchar` |  Nullable |
| `dob` | `date` |  Nullable |
| `address` | `varchar` |  Nullable |
| `email` | `varchar` |  Nullable |

## Table `mes_inventory`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `material_name` | `varchar` |  Unique |
| `stock_level` | `numeric` |  |
| `unit` | `varchar` |  |
| `last_updated` | `timestamptz` |  |
| `reorder_threshold` | `numeric` |  Nullable |
| `max_capacity` | `numeric` |  Nullable |

## Table `mes_production_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `operator_id` | `int8` |  Nullable |
| `production_week` | `varchar` |  |
| `production_date` | `date` |  |
| `divider_type` | `int2` |  Nullable |
| `placement_style` | `varchar` |  Nullable |
| `size_cm` | `int2` |  Nullable |
| `qty_produced` | `int4` |  |
| `qty_waste` | `int4` |  |
| `created_at` | `timestamptz` |  |
| `is_overtime` | `bool` |  Nullable |
| `logged_by_admin` | `bool` |  Nullable |
| `work_category` | `varchar` |  |
| `hours_worked` | `numeric` |  Nullable |
| `notes` | `text` |  Nullable |

## Table `mes_financial_ledger`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `operator_id` | `int8` |  Nullable |
| `target_name` | `varchar` |  |
| `transaction_type` | `varchar` |  |
| `amount` | `numeric` |  |
| `transaction_date` | `date` |  |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `mes_downtime_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `operator_id` | `int8` |  Nullable |
| `issue_category` | `varchar` |  |
| `start_time` | `timestamptz` |  |
| `end_time` | `timestamptz` |  Nullable |
| `duration_minutes` | `int4` |  Nullable |
| `resolution_notes` | `text` |  Nullable |
| `resolved_by` | `varchar` |  Nullable |
| `created_at` | `timestamptz` |  |
| `production_week` | `varchar` |  Nullable |

## Table `mes_attendance`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `operator_id` | `int8` |  Nullable |
| `production_week` | `varchar` |  |
| `shift_date` | `date` |  |
| `clock_in` | `timestamptz` |  |
| `clock_out` | `timestamptz` |  Nullable |
| `status` | `varchar` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `mes_loans`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `operator_id` | `int8` |  Nullable |
| `production_week` | `varchar` |  |
| `principal` | `numeric` |  |
| `interest_rate` | `numeric` |  |
| `status` | `varchar` |  |
| `issued_at` | `timestamptz` |  |
| `installment_weeks` | `int4` |  Nullable |
| `remaining_balance` | `numeric` |  Nullable |
| `paid_weeks` | `text` |  Nullable |

## Table `mes_dispatch_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary |
| `created_at` | `timestamptz` |  |
| `production_week` | `text` |  |
| `dispatch_date` | `date` |  |
| `divider_type` | `text` |  |
| `client_name` | `text` |  |
| `quantity` | `int4` |  |
| `dispatched_by` | `text` |  Nullable |
| `notes` | `text` |  Nullable |

## Table `mes_bonuses`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `operator_id` | `int8` |  Nullable |
| `amount` | `numeric` |  Nullable |
| `reason` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `production_week` | `text` |  |

## Table `mes_customers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `company_name` | `varchar` |  |
| `contact_person` | `varchar` |  Nullable |
| `phone_number` | `varchar` |  Nullable |
| `email` | `varchar` |  Nullable |
| `address` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `mes_qc_defects`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `operator_id` | `int8` |  Nullable |
| `machine_id` | `int8` |  Nullable |
| `divider_type` | `varchar` |  Nullable |
| `category` | `varchar` |  |
| `quantity` | `int4` |  |
| `production_week` | `varchar` |  |
| `logged_at` | `timestamptz` |  |

## RLS Policies

### `mes_dispatch_logs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow all on dispatch_logs` | ALL | public | PERMISSIVE | `true` | `true` |

### `mes_financial_ledger`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow all access for anon` | ALL | public | PERMISSIVE | `true` | — |

### `mes_attendance`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow all access for anon` | ALL | public | PERMISSIVE | `true` | — |

### `mes_inventory`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow all access for anon` | ALL | public | PERMISSIVE | `true` | — |

### `mes_downtime_logs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow all access for anon` | ALL | public | PERMISSIVE | `true` | — |

### `mes_loans`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow all access for anon` | ALL | public | PERMISSIVE | `true` | — |

### `mes_production_logs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow all access for anon` | ALL | public | PERMISSIVE | `true` | — |

### `mes_operators`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow all access for anon` | ALL | public | PERMISSIVE | `true` | — |

### `mes_customers`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow all access for anon` | ALL | public | PERMISSIVE | `true` | — |

### `mes_qc_defects`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow all access for anon` | ALL | public | PERMISSIVE | `true` | — |


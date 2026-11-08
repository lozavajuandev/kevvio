CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE CHECK (singleton),
  name text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  kind text NOT NULL CHECK (kind IN ('Apartamento','Casa','Local','Oficina','Bodega','Lote','Otro')),
  address text NOT NULL,
  city text NOT NULL,
  area numeric(12,2) NOT NULL DEFAULT 0 CHECK (area >= 0),
  bedrooms integer NOT NULL DEFAULT 0 CHECK (bedrooms >= 0),
  bathrooms integer NOT NULL DEFAULT 0 CHECK (bathrooms >= 0),
  purchase_value numeric(14,0) NOT NULL DEFAULT 0 CHECK (purchase_value >= 0),
  notes text NOT NULL DEFAULT '',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  document text NOT NULL UNIQUE CHECK (length(trim(document)) > 0),
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  start_date date NOT NULL,
  end_date date NOT NULL CHECK (end_date >= start_date),
  rent numeric(14,0) NOT NULL CHECK (rent > 0),
  administration numeric(14,0) NOT NULL DEFAULT 0 CHECK (administration >= 0),
  due_day integer NOT NULL CHECK (due_day BETWEEN 1 AND 28),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended')),
  notes text NOT NULL DEFAULT '',
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  EXCLUDE USING gist (property_id WITH =, daterange(start_date, end_date, '[]') WITH &&) WHERE (status = 'active')
);
CREATE TABLE charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id uuid NOT NULL REFERENCES leases(id),
  period date NOT NULL CHECK (extract(day from period) = 1),
  due_date date NOT NULL,
  amount numeric(14,0) NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lease_id, period)
);
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id uuid NOT NULL REFERENCES charges(id),
  amount numeric(14,0) NOT NULL CHECK (amount > 0),
  paid_on date NOT NULL,
  method text NOT NULL CHECK (method IN ('Transferencia','Efectivo','Consignación','Otro')),
  reference text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  idempotency_key uuid NOT NULL UNIQUE,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id),
  lease_id uuid REFERENCES leases(id),
  title text NOT NULL,
  category text NOT NULL CHECK (category IN ('Contrato','Escritura','Certificado','Recibo','Inventario','Póliza','Otro')),
  filename text NOT NULL,
  storage_key text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  expires_on date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX charges_due_idx ON charges(due_date);
CREATE INDEX payments_charge_idx ON payments(charge_id);
CREATE INDEX documents_property_idx ON documents(property_id);
CREATE INDEX leases_tenant_idx ON leases(tenant_id);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);

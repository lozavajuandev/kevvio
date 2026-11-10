ALTER TABLE tenants ALTER COLUMN document DROP NOT NULL;
ALTER TABLE properties ADD COLUMN creation_key uuid UNIQUE;

CREATE TABLE crm_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES tenants(id),
  property_id uuid REFERENCES properties(id),
  interest text NOT NULL CHECK (interest IN ('Arriendo','Compra')),
  stage text NOT NULL DEFAULT 'Nuevo' CHECK (stage IN ('Nuevo','Contactado','Visita','Propuesta','Cerrado','Descartado')),
  budget numeric(14,0) NOT NULL DEFAULT 0 CHECK (budget >= 0),
  next_contact_on date,
  next_action text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX crm_opportunities_person_idx ON crm_opportunities(person_id);
CREATE INDEX crm_opportunities_followup_idx ON crm_opportunities(next_contact_on) WHERE stage NOT IN ('Cerrado','Descartado');
CREATE TABLE crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES tenants(id),
  opportunity_id uuid REFERENCES crm_opportunities(id),
  kind text NOT NULL CHECK (kind IN ('Nota','Llamada','WhatsApp','Correo','Visita','Etapa')),
  body text NOT NULL CHECK (length(trim(body)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX crm_activities_person_idx ON crm_activities(person_id,created_at DESC);

CREATE TABLE property_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  floor text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, id)
);
CREATE UNIQUE INDEX property_spaces_name_idx ON property_spaces(property_id, lower(name));

CREATE TABLE inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id),
  space_id uuid,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 200),
  category text NOT NULL DEFAULT 'General' CHECK (length(trim(category)) BETWEEN 1 AND 100),
  quantity numeric(12,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit text NOT NULL DEFAULT 'unidad' CHECK (length(trim(unit)) BETWEEN 1 AND 30),
  condition text NOT NULL DEFAULT 'Por revisar' CHECK (condition IN ('Nuevo','Bueno','Regular','Malo','No funciona','Por revisar')),
  brand text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  serial_number text NOT NULL DEFAULT '',
  material text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '',
  dimensions text NOT NULL DEFAULT '',
  unit_value numeric(14,0) NOT NULL DEFAULT 0 CHECK (unit_value >= 0),
  ownership text NOT NULL DEFAULT 'Propietario' CHECK (ownership IN ('Propietario','Arrendatario','Otro')),
  inspected_on date,
  notes text NOT NULL DEFAULT '',
  attributes jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(attributes) = 'array'),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, id),
  FOREIGN KEY (property_id, space_id) REFERENCES property_spaces(property_id, id)
);
CREATE INDEX inventory_items_property_idx ON inventory_items(property_id,space_id);
CREATE TABLE inventory_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES inventory_items(id),
  action text NOT NULL CHECK (action IN ('Creado','Actualizado','Archivado','Restaurado')),
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX inventory_history_item_idx ON inventory_history(item_id,created_at DESC);

CREATE TABLE property_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id),
  inventory_item_id uuid,
  caption text NOT NULL DEFAULT '',
  original_filename text NOT NULL,
  storage_key text NOT NULL UNIQUE,
  width integer NOT NULL CHECK (width > 0),
  height integer NOT NULL CHECK (height > 0),
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  is_cover boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT is_cover OR (inventory_item_id IS NULL AND archived_at IS NULL)),
  FOREIGN KEY (property_id, inventory_item_id) REFERENCES inventory_items(property_id, id)
);
CREATE UNIQUE INDEX property_photos_cover_idx ON property_photos(property_id) WHERE is_cover;
CREATE INDEX property_photos_property_idx ON property_photos(property_id,inventory_item_id);

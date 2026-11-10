CREATE TABLE property_listings (
  property_id uuid PRIMARY KEY REFERENCES properties(id),
  token text NOT NULL UNIQUE CHECK (length(token)=43),
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  published jsonb,
  enabled boolean NOT NULL DEFAULT false,
  expires_on date,
  published_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT enabled OR published IS NOT NULL)
);

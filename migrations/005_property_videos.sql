CREATE TABLE property_video_projects (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 property_id uuid NOT NULL REFERENCES properties(id),
 created_by uuid NOT NULL REFERENCES users(id),
 creation_key uuid NOT NULL UNIQUE,
 model_key text NOT NULL,
 aspect_ratio text NOT NULL CHECK(aspect_ratio IN ('16:9','9:16')),
 motion text NOT NULL,
 estimated_usd numeric(10,4) NOT NULL CHECK(estimated_usd>=0),
 output_key uuid,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX property_video_projects_property ON property_video_projects(property_id,created_at DESC);
CREATE TABLE property_video_clips (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 project_id uuid NOT NULL REFERENCES property_video_projects(id),
 photo_id uuid NOT NULL REFERENCES property_photos(id),
 position integer NOT NULL,
 status text NOT NULL DEFAULT 'preparing' CHECK(status IN ('preparing','queued','processing','ready','failed','unknown')),
 provider_task_id text,
 storage_key uuid,
 error text NOT NULL DEFAULT '',
 credits_consumed numeric(12,3),
 checked_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(project_id,position)
);

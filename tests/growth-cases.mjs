import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";
const run = promisify(execFile);
export async function runGrowthCases({
  t,
  request,
  create,
  start,
  stop,
  origin,
  cookie,
  url,
  imageBytes,
  today,
}) {
  let property, photos, lead, second, op;
  const wizard = (
    key = randomUUID(),
    images = [imageBytes, imageBytes],
    extra = {},
  ) => {
    const form = new FormData();
    form.set("creation_key", key);
    form.set(
      "data",
      JSON.stringify({
        name: "Wizard nuevo inmueble",
        kind: "Casa",
        city: "Bogotá",
        address: "DIRECCION PRIVADA WIZARD",
        bedrooms: 3,
        listing: {
          title: "Título del borrador",
          description: "Descripción manual",
          monthly_rent: 1800000,
        },
        ...extra,
      }),
    );
    images.forEach((b, i) =>
      form.append(
        "files",
        new Blob([b], { type: "image/png" }),
        `foto-${i}.png`,
      ),
    );
    return form;
  };
  await t.test(
    "Landing y rutas: propuesta de tres planes, app y compatibilidad de enlaces",
    async () => {
      const home = await fetch(origin);
      assert.equal(home.status, 200);
      const html = await home.text();
      for (const text of [
        "agente inmobiliario independiente",
        "Esencial",
        "Profesional",
        "Studio",
        "todavía no se venden suscripciones",
      ])
        assert.ok(html.includes(text));
      assert.equal((await fetch(origin + "/app")).status, 200);
      const legacy = await fetch(origin + "/?vista=tenants", {
        redirect: "manual",
      });
      assert.equal(legacy.status, 307);
      assert.equal(legacy.headers.get("location"), "/app?vista=tenants");
    },
  );
  await t.test(
    "Wizard: fotos, portada y anuncio privado se guardan una vez incluso con reintentos concurrentes",
    async () => {
      const key = randomUUID(),
        rs = await Promise.all([
          request("properties/create", "POST", wizard(key)),
          request("properties/create", "POST", wizard(key)),
        ]);
      rs.forEach((r) => assert.equal(r.status, 200, JSON.stringify(r.data)));
      assert.equal(rs[0].data.id, rs[1].data.id);
      property = rs[0].data;
      const inventory = (await request("inventory/" + property.id)).data;
      photos = inventory.photos;
      assert.equal(photos.length, 2);
      assert.equal(photos.filter((p) => p.is_cover).length, 1);
      const listing = (await request("listings/" + property.id)).data;
      assert.equal(listing.enabled, false);
      assert.equal(listing.draft.title, "Título del borrador");
      assert.equal(listing.draft.photo_ids.length, 2);
      assert.equal((await fetch(origin + listing.path)).status, 404);
      assert.equal(
        (await request("properties/create", "POST", wizard(), false)).status,
        401,
      );
      const before = (await request("snapshot")).data.properties.length;
      assert.equal(
        (
          await request(
            "properties/create",
            "POST",
            wizard(randomUUID(), [Buffer.from("not an image")]),
          )
        ).status,
        400,
      );
      assert.equal((await request("snapshot")).data.properties.length, before);
      assert.equal(
        (
          await request(
            "properties/create",
            "POST",
            wizard(randomUUID(), [], { name: "" }),
          )
        ).status,
        400,
      );
      const without = await create(
        "properties/create",
        wizard(randomUUID(), [], { name: "Sin fotos" }),
      );
      assert.equal(
        (await request("inventory/" + without.id)).data.photos.length,
        0,
      );
    },
  );
  await t.test(
    "CRM: contactos sin identificación, duplicados reales y acceso protegido",
    async () => {
      lead = await create("crm/people", {
        name: "Interesada compra",
        phone: "3001234567",
        email: "lead@example.test",
      });
      second = await create("crm/people", { name: "Interesado arriendo" });
      assert.equal(lead.document, null);
      assert.equal(second.document, null);
      const edited = await request("crm/people/" + lead.id, "PATCH", {
        ...lead,
        document: "CRM-001",
      });
      assert.equal(edited.status, 200);
      assert.equal(
        (
          await request("crm/people", "POST", {
            name: "Duplicado",
            document: "CRM-001",
          })
        ).status,
        409,
      );
      assert.equal((await request("crm", "GET", undefined, false)).status, 401);
      assert.equal(
        (await request("crm/people/" + lead.id, "GET", undefined, false))
          .status,
        401,
      );
      assert.ok(
        (await request("snapshot")).data.tenants.some((p) => p.id === lead.id),
      );
    },
  );
  await t.test(
    "CRM: oportunidades, cierres, seguimientos e historial conservan vínculos",
    async () => {
      op = await create("crm/opportunities", {
        person_id: lead.id,
        property_id: property.id,
        interest: "Compra",
        budget: 450000000,
        next_contact_on: today,
        next_action: "Coordinar visita",
      });
      assert.equal(op.stage, "Nuevo");
      const s = (await request("snapshot")).data,
        counts = [s.leases.length, s.payments.length];
      for (const stage of ["Contactado", "Visita", "Cerrado"]) {
        const r = await request("crm/opportunities/" + op.id, "PATCH", {
          ...op,
          stage,
        });
        assert.equal(r.status, 200);
        op = r.data;
      }
      assert.ok(op.closed_at);
      const person = (await request("crm/people/" + lead.id)).data;
      assert.equal(
        person.activities.filter((a) => a.kind === "Etapa").length,
        4,
      );
      const after = (await request("snapshot")).data;
      assert.deepEqual([after.leases.length, after.payments.length], counts);
      assert.equal(
        (
          await request("crm/opportunities/" + op.id, "PATCH", {
            ...op,
            person_id: second.id,
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await request("crm/activities", "POST", {
            person_id: second.id,
            opportunity_id: op.id,
            kind: "Nota",
            body: "No debe entrar",
          })
        ).status,
        400,
      );
      await create("crm/activities", {
        person_id: lead.id,
        opportunity_id: op.id,
        kind: "Llamada",
        body: "Confirmó interés",
      });
      assert.equal(
        (await request("crm/people/" + lead.id)).data.activities.length,
        5,
      );
      assert.equal(
        (
          await request("crm/opportunities", "POST", {
            person_id: lead.id,
            interest: "Compra",
            next_contact_on: "2026-02-30",
          })
        ).status,
        400,
      );
      const archived = await create(
        "properties/create",
        wizard(randomUUID(), [], { name: "Archivado CRM" }),
      );
      await request("properties/" + archived.id, "DELETE");
      assert.equal(
        (
          await request("crm/opportunities", "POST", {
            person_id: lead.id,
            property_id: archived.id,
            interest: "Arriendo",
          })
        ).status,
        400,
      );
      const lease = await create("leases", {
        property_id: property.id,
        tenant_id: second.id,
        start_date: today,
        end_date: "2030-12-31",
        rent: 1800000,
        due_day: 5,
      });
      assert.equal(lease.tenant_id, second.id);
      await request("crm/people/" + second.id, "PATCH", {
        ...second,
        name: "Cliente actualizado",
      });
      assert.ok(
        (await request("snapshot")).data.leases.some(
          (l) => l.id === lease.id && l.tenant_name === "Cliente actualizado",
        ),
      );
    },
  );
  await t.test(
    "Servicios IA: falta de credenciales y autenticación no exponen claves ni generan",
    async () => {
      assert.deepEqual((await request("ai/status")).data, { enabled: false });
      assert.equal(
        (await request("ai/description", "POST", new FormData())).status,
        503,
      );
      assert.equal(
        (await request("ai/status", "GET", undefined, false)).status,
        401,
      );
      assert.equal((await request("videos/catalog")).data.enabled, false);
      assert.equal(
        (await request("videos/" + property.id, "POST", {})).status,
        503,
      );
      assert.equal(
        (await request("videos/catalog", "GET", undefined, false)).status,
        401,
      );
    },
  );
  const temporary = await mkdtemp(join(tmpdir(), "raiz-video-test-")),
    fixture = join(temporary, "fixture.mp4");
  await run(process.env.FFMPEG_PATH || "ffmpeg", [
    "-nostdin",
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "color=c=blue:s=160x90:d=0.4",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    fixture,
  ]);
  const video = await readFile(fixture);
  const calls = [],
    tasks = new Map();
  let descriptionMode = "success",
    taskMode = "success",
    mockOrigin;
  const mock = createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString(),
      body = raw ? JSON.parse(raw) : null;
    calls.push({ path: req.url, body, auth: req.headers.authorization });
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/v1/responses") {
      if (descriptionMode === "error") {
        res.statusCode = 500;
        res.end(
          JSON.stringify({ error: { message: "private-error-not-for-user" } }),
        );
        return;
      }
      res.end(
        JSON.stringify({
          id: "resp_test",
          object: "response",
          created_at: 1,
          status: "completed",
          output: [
            {
              id: "msg_test",
              type: "message",
              status: "completed",
              role: "assistant",
              content: [
                {
                  type: "output_text",
                  annotations: [],
                  text: JSON.stringify({
                    title: "Cocina abierta",
                    description: "Espacio con cocina abierta.",
                    highlights: ["Cocina abierta"],
                    review_notes: ["Confirmar servicios incluidos."],
                  }),
                },
              ],
            },
          ],
        }),
      );
      return;
    }
    if (req.url === "/api/file-base64-upload") {
      res.end(
        JSON.stringify({
          code: 200,
          success: true,
          data: {
            downloadUrl: "https://tempfile.redpandaai.co/test-photo.jpg",
          },
        }),
      );
      return;
    }
    if (req.url === "/api/v1/jobs/createTask") {
      if (taskMode === "reject") {
        res.end(JSON.stringify({ code: 402, msg: "private-provider-detail" }));
        return;
      }
      if (taskMode === "disconnect") {
        req.socket.destroy();
        return;
      }
      const id = randomUUID();
      tasks.set(id, taskMode);
      res.end(JSON.stringify({ code: 200, data: { taskId: id } }));
      return;
    }
    if (req.url.startsWith("/api/v1/jobs/recordInfo")) {
      const id = new URL(req.url, mockOrigin).searchParams.get("taskId"),
        mode = tasks.get(id);
      res.end(
        JSON.stringify({
          code: 200,
          data: {
            taskId: id,
            state: mode === "fail" ? "fail" : "success",
            resultJson: JSON.stringify({
              resultUrls: [
                mode === "unsafe"
                  ? "http://169.254.169.254/latest/meta-data/"
                  : mockOrigin + "/fixture.mp4",
              ],
            }),
            creditsConsumed: 16,
          },
        }),
      );
      return;
    }
    if (req.url === "/fixture.mp4") {
      res.setHeader("Content-Type", "video/mp4");
      res.end(video);
      return;
    }
    res.statusCode = 404;
    res.end("{}");
  });
  await new Promise((r) => mock.listen(0, "127.0.0.1", r));
  mockOrigin = "http://127.0.0.1:" + mock.address().port;
  const overrides = {
    OPENAI_API_KEY: "test-openai-key",
    OPENAI_BASE_URL: mockOrigin + "/v1",
    KIE_API_KEY: "test-kie-key",
    VIDEO_TEST_MODE: "1",
    KIE_TEST_BASE_URL: mockOrigin,
    RAIZ_PLAN: "studio",
    VIDEO_DAILY_BUDGET_USD: "5",
  };
  const videoRequest = (extra = {}) => ({
    creation_key: randomUUID(),
    photo_ids: photos.map((p) => p.id),
    model_key: "seedance-fast",
    motion: "push",
    aspect_ratio: "9:16",
    accepted_estimate: 0.16,
    ...extra,
  });
  let completeProject;
  try {
    await stop();
    await start(overrides);
    await t.test(
      "Descripción IA: fotos y hechos estructurados, borrador editable y errores seguros",
      async () => {
        assert.equal((await request("ai/status")).data.enabled, true);
        const form = new FormData();
        form.set(
          "facts",
          JSON.stringify({
            city: "Bogotá",
            features: "Cocina abierta",
            address: "NO ENVIAR DIRECCION",
            tone: "Profesional",
          }),
        );
        form.append(
          "files",
          new Blob([imageBytes], { type: "image/png" }),
          "foto.png",
        );
        const r = await create("ai/description", form);
        assert.equal(r.title, "Cocina abierta");
        const sent = calls.find((c) => c.path === "/v1/responses").body;
        assert.equal(sent.store, false);
        assert.equal(sent.text.format.type, "json_schema");
        assert.ok(sent.input[0].content.some((c) => c.type === "input_image"));
        assert.ok(!JSON.stringify(sent).includes("NO ENVIAR DIRECCION"));
        descriptionMode = "error";
        const failure = await request("ai/description", "POST", form);
        assert.equal(failure.status, 502);
        assert.ok(!JSON.stringify(failure.data).includes("private-error"));
        descriptionMode = "success";
        assert.equal(
          (await request("ai/description", "POST", new FormData())).status,
          400,
        );
      },
    );
    await t.test(
      "Video: modelos permitidos, fotos propias, costo aceptado y envío idempotente",
      async () => {
        const before = calls.filter(
          (c) => c.path === "/api/v1/jobs/createTask",
        ).length;
        assert.equal(
          (
            await request(
              "videos/" + property.id,
              "POST",
              videoRequest({ accepted_estimate: 0 }),
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await request(
              "videos/" + property.id,
              "POST",
              videoRequest({ model_key: "arbitrary-model" }),
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await request(
              "videos/" + property.id,
              "POST",
              videoRequest({ photo_ids: [randomUUID()] }),
            )
          ).status,
          400,
        );
        assert.equal(
          calls.filter((c) => c.path === "/api/v1/jobs/createTask").length,
          before,
        );
        const values = videoRequest(),
          rs = await Promise.all([
            request("videos/" + property.id, "POST", values),
            request("videos/" + property.id, "POST", values),
          ]);
        rs.forEach((r) => assert.equal(r.status, 200, JSON.stringify(r.data)));
        assert.equal(rs[0].data.id, rs[1].data.id);
        completeProject = rs[0].data.id;
        assert.equal(
          calls.filter((c) => c.path === "/api/v1/jobs/createTask").length -
            before,
          2,
        );
        const sends = calls.filter((c) => c.path === "/api/v1/jobs/createTask");
        assert.equal(
          sends[0].body.model,
          "bytedance/v1-pro-fast-image-to-video",
        );
        assert.equal(sends[0].body.input.duration, "5");
        assert.equal(sends[0].body.input.resolution, "720p");
        assert.match(
          sends[0].body.input.prompt,
          /Preserve the original architecture/,
        );
        assert.equal(
          (await request("videos/" + property.id, "POST", values)).data.id,
          completeProject,
        );
        assert.equal(
          calls.filter((c) => c.path === "/api/v1/jobs/createTask").length -
            before,
          2,
        );
      },
    );
    await t.test(
      "Video: resultado privado, montaje MP4, rangos y persistencia",
      async () => {
        const sync = await create("videos/" + completeProject + "/sync", {}),
          p = sync.projects.find((p) => p.id === completeProject);
        assert.ok(p.clips.every((c) => c.status === "ready"));
        assert.ok(p.clips.every((c) => Number(c.credits_consumed) === 16));
        assert.equal(
          (
            await fetch(
              origin +
                "/api/videos/" +
                completeProject +
                "/file?clip=" +
                p.clips[0].id,
            )
          ).status,
          401,
        );
        const assembled = await create(
          "videos/" + completeProject + "/assemble",
          {},
        );
        assert.equal(
          assembled.projects.find((p) => p.id === completeProject).has_file,
          true,
        );
        const file = await fetch(
          origin + "/api/videos/" + completeProject + "/file",
          { headers: { cookie, range: "bytes=0-31" } },
        );
        assert.equal(file.status, 206);
        assert.equal((await file.arrayBuffer()).byteLength, 32);
        assert.match(file.headers.get("content-range"), /^bytes 0-31\//);
        assert.equal(
          (
            await fetch(origin + "/api/videos/" + completeProject + "/file", {
              headers: { cookie, range: "bytes=999999999-" },
            })
          ).status,
          416,
        );
        await stop();
        await start(overrides);
        assert.ok(
          (await request("videos/" + property.id)).data.projects.find(
            (p) => p.id === completeProject,
          ).has_file,
        );
        assert.equal(
          (
            await fetch(
              origin + "/api/videos/" + completeProject + "/file?download=1",
              { headers: { cookie } },
            )
          ).status,
          200,
        );
      },
    );
    await t.test(
      "Video: errores del proveedor y envíos inciertos no provocan reintentos cobrables",
      async () => {
        taskMode = "reject";
        let p = await create(
          "videos/" + property.id,
          videoRequest({ photo_ids: [photos[0].id] }),
        );
        assert.equal(
          p.projects.find((x) => x.id === p.id).clips[0].status,
          "failed",
        );
        assert.ok(!JSON.stringify(p).includes("private-provider-detail"));
        taskMode = "disconnect";
        const values = videoRequest({ photo_ids: [photos[0].id] });
        p = await create("videos/" + property.id, values);
        assert.equal(
          p.projects.find((x) => x.id === p.id).clips[0].status,
          "unknown",
        );
        const count = calls.filter(
          (c) => c.path === "/api/v1/jobs/createTask",
        ).length;
        await create("videos/" + property.id, values);
        assert.equal(
          calls.filter((c) => c.path === "/api/v1/jobs/createTask").length,
          count,
        );
        taskMode = "unsafe";
        p = await create(
          "videos/" + property.id,
          videoRequest({ photo_ids: [photos[0].id] }),
        );
        const sync = await create("videos/" + p.id + "/sync", {});
        assert.ok(!sync.projects.find((x) => x.id === p.id).clips[0].has_file);
      },
    );
    await t.test(
      "Video: Studio y presupuesto diario se comprueban en el servidor",
      async () => {
        const count = calls.filter(
          (c) => c.path === "/api/v1/jobs/createTask",
        ).length;
        await stop();
        await start({ ...overrides, RAIZ_PLAN: "esencial" });
        assert.equal(
          (await request("videos/" + property.id, "POST", videoRequest()))
            .status,
          403,
        );
        await stop();
        await start({ ...overrides, VIDEO_DAILY_BUDGET_USD: "0.01" });
        assert.equal(
          (await request("videos/" + property.id, "POST", videoRequest()))
            .status,
          429,
        );
        assert.equal(
          calls.filter((c) => c.path === "/api/v1/jobs/createTask").length,
          count,
        );
      },
    );
  } finally {
    await stop();
    await new Promise((r) => mock.close(r));
  }
}

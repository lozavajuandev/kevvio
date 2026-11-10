import { runGrowthCases } from "./growth-cases.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { migrate } from "../scripts/migrate.mjs";
import { resolve } from "node:path";
import sharp from "sharp";

test(
  "Flujo completo con PostgreSQL aislado, integridad y persistencia",
  { timeout: 180000 },
  async (t) => {
    const dbName = "raiz_test_" + randomUUID().replaceAll("-", "");
    const root = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await root.connect();
    const url = new URL(process.env.DATABASE_URL);
    url.pathname = "/" + dbName;
    let server,
      cookie = "",
      logs = "";
    const origin = "http://127.0.0.1:3046";
    async function start(overrides = {}) {
      server = spawn(
        process.execPath,
        [
          "node_modules/next/dist/bin/next",
          "start",
          "--hostname",
          "127.0.0.1",
          "--port",
          "3046",
        ],
        {
          env: {
            ...process.env,
            OPENAI_API_KEY: "",
            KIE_API_KEY: "",
            VIDEO_TEST_MODE: "",
            ...overrides,
            DATABASE_URL: url.toString(),
            UPLOAD_DIR: resolve(".data/test-uploads", dbName),
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      server.stdout.on("data", (v) => (logs += v));
      server.stderr.on("data", (v) => (logs += v));
      for (let i = 0; i < 100; i++) {
        if (server.exitCode !== null) throw new Error(logs);
        try {
          const r = await fetch(origin + "/api/health");
          if (r.ok) return;
        } catch {}
        await delay(200);
      }
      throw new Error("El servidor de prueba no inició: " + logs);
    }
    async function stop() {
      if (!server || server.exitCode !== null) return;
      const stopped = new Promise((r) => server.once("exit", r));
      server.kill("SIGTERM");
      await stopped;
    }
    async function request(path, method = "GET", body, auth = true) {
      const headers = { origin };
      if (auth && cookie) headers.cookie = cookie;
      if (body && !(body instanceof FormData))
        headers["Content-Type"] = "application/json";
      const r = await fetch(origin + "/api/" + path, {
        method,
        headers,
        body: body
          ? body instanceof FormData
            ? body
            : JSON.stringify(body)
          : undefined,
      });
      const text = await r.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
      return { status: r.status, data, cookie: r.headers.get("set-cookie") };
    }
    async function create(path, body) {
      const r = await request(path, "POST", body);
      assert.equal(r.status, 200, JSON.stringify(r.data));
      return r.data;
    }
    try {
      await root.query(`CREATE DATABASE "${dbName}"`);
      await migrate(url.toString());
      await migrate(url.toString());
      await start();
      await t.test(
        "Acceso protegido, origen y configuración única",
        async () => {
          assert.equal(
            (await request("snapshot", "GET", undefined, false)).status,
            401,
          );
          assert.equal((await request("session")).data.setupRequired, true);
          assert.equal(
            (
              await fetch(origin + "/api/setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: "Prueba",
                  password: "test-only-password",
                }),
              })
            ).status,
            403,
          );
          const r = await request("setup", "POST", {
            name: "Prueba aislada",
            password: "test-only-password",
          });
          assert.equal(r.status, 200);
          cookie = r.cookie.split(";")[0];
          assert.match(r.cookie, /HttpOnly/);
          assert.match(r.cookie, /SameSite=strict/i);
          assert.equal(
            (
              await request("setup", "POST", {
                name: "Otro",
                password: "test-only-password",
              })
            ).status,
            409,
          );
          assert.equal(
            (await request("login", "POST", { password: "incorrecta" })).status,
            401,
          );
        },
      );
      const today = new Intl.DateTimeFormat("sv-SE", {
          timeZone: "America/Bogota",
        }).format(new Date()),
        month = today.slice(0, 7),
        startDate = month + "-01",
        end = Number(today.slice(0, 4)) + 1 + today.slice(4);
      let property, tenant, lease, charge, firstPayment;
      await t.test("Crear y editar inmueble y arrendatario", async () => {
        property = await create("properties", {
          name: "Apartamento de prueba",
          kind: "Apartamento",
          address: "Calle de prueba 123",
          city: "Bogotá",
          area: 72,
          bedrooms: 2,
          bathrooms: 2,
          purchase_value: 300000000,
        });
        tenant = await create("tenants", {
          name: "Persona de prueba",
          document: "TEST-001",
          email: "prueba@example.test",
          phone: "3000000000",
        });
        assert.equal(
          (
            await request("tenants", "POST", {
              name: "Duplicado",
              document: "TEST-001",
            })
          ).status,
          409,
        );
        const updated = await request("properties/" + property.id, "PATCH", {
          ...property,
          name: "Apartamento Cedritos",
        });
        assert.equal(updated.status, 200);
        assert.equal(updated.data.name, "Apartamento Cedritos");
      });
      await t.test(
        "Contrato, generación idempotente y rechazo de superposición",
        async () => {
          const v = {
            property_id: property.id,
            tenant_id: tenant.id,
            start_date: startDate,
            end_date: end,
            rent: 90000,
            administration: 10000,
            due_day: 5,
          };
          lease = await create("leases", v);
          assert.equal((await request("leases", "POST", v)).status, 409);
          const r = await create("charges/generate", { month });
          assert.equal(r.created, 0);
          const s = (await request("snapshot")).data;
          assert.equal(s.charges.length, 1);
          charge = s.charges[0];
          assert.equal(Number(charge.amount), 100000);
          assert.equal(Number(charge.balance), 100000);
          assert.equal(
            (await request("properties/" + property.id, "DELETE")).status,
            409,
          );
        },
      );
      await t.test(
        "Abonos parciales, reintentos y pagos concurrentes sin sobrepago",
        async () => {
          const payment = {
            charge_id: charge.id,
            amount: 40000,
            paid_on: today,
            method: "Transferencia",
            reference: "TEST-PAY",
            notes: "",
            idempotency_key: randomUUID(),
          };
          firstPayment = await create("payments", payment);
          const retry = await create("payments", payment);
          assert.equal(retry.id, firstPayment.id);
          assert.equal(
            (await request("payments", "POST", { ...payment, amount: 41000 }))
              .status,
            409,
          );
          const results = await Promise.all([
            request("payments", "POST", {
              ...payment,
              amount: 50000,
              idempotency_key: randomUUID(),
            }),
            request("payments", "POST", {
              ...payment,
              amount: 50000,
              idempotency_key: randomUUID(),
            }),
          ]);
          assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
          let s = (await request("snapshot")).data;
          assert.equal(Number(s.charges[0].balance), 10000);
          assert.equal(s.payments.length, 2);
          assert.equal(
            (
              await request("payments/" + firstPayment.id, "PATCH", {
                reason: "Registro equivocado de prueba",
              })
            ).status,
            200,
          );
          s = (await request("snapshot")).data;
          assert.equal(Number(s.charges[0].balance), 50000);
          assert.equal(s.payments.length, 2);
          assert.ok(s.payments.find((p) => p.id === firstPayment.id).voided_at);
          assert.equal(
            (
              await request("payments", "POST", {
                ...payment,
                amount: -1,
                idempotency_key: randomUUID(),
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await request("payments", "POST", {
                ...payment,
                paid_on: "2200-01-01",
                idempotency_key: randomUUID(),
              })
            ).status,
            400,
          );
        },
      );
      await t.test(
        "Documentos persistentes, validación y descarga protegida",
        async () => {
          const form = () => {
            const f = new FormData();
            f.set("property_id", property.id);
            f.set("lease_id", lease.id);
            f.set("title", "Contrato de prueba");
            f.set("category", "Contrato");
            return f;
          };
          const invalid = form();
          invalid.set(
            "file",
            new Blob(["<script>alert(1)</script>"], {
              type: "application/pdf",
            }),
            "fake.pdf",
          );
          assert.equal(
            (await request("documents", "POST", invalid)).status,
            400,
          );
          const bytes = "%PDF-1.4\nArchivo de prueba aislado\n%%EOF";
          const valid = form();
          valid.set(
            "file",
            new Blob([bytes], { type: "application/pdf" }),
            "contrato.pdf",
          );
          const document = await create("documents", valid);
          const downloaded = await fetch(
            origin + "/api/documents/" + document.id,
            { headers: { cookie } },
          );
          assert.equal(await downloaded.text(), bytes);
          assert.match(
            downloaded.headers.get("content-disposition"),
            /attachment/,
          );
          assert.equal(
            (await request("documents/" + document.id, "GET", undefined, false))
              .status,
            401,
          );
        },
      );
      await t.test(
        "Exportación, finalización y archivo preservan el historial",
        async () => {
          const csv = await request("export");
          assert.equal(csv.status, 200);
          assert.match(csv.data, /Apartamento Cedritos/);
          assert.match(csv.data, /50000/);
          assert.equal(
            (await request("leases/" + lease.id, "PATCH", { end_date: today }))
              .status,
            200,
          );
          assert.equal(
            (await request("properties/" + property.id, "DELETE")).status,
            200,
          );
          const s = (await request("snapshot")).data;
          assert.ok(s.properties[0].archived_at);
          assert.equal(s.leases[0].status, "ended");
          assert.equal(s.documents.length, 1);
          assert.equal(Number(s.charges[0].balance), 50000);
        },
      );
      await t.test(
        "Reinicio de la aplicación conserva sesión, datos y archivos",
        async () => {
          await stop();
          await start();
          const s = (await request("snapshot")).data;
          assert.equal(s.properties.length, 1);
          assert.equal(s.payments.length, 2);
          assert.equal(s.documents.length, 1);
          assert.equal(Number(s.charges[0].balance), 50000);
          assert.equal((await request("logout", "POST", {})).status, 200);
          assert.equal((await request("snapshot")).status, 401);
        },
      );
      await t.test(
        "Finalizar completa cobros faltantes y es idempotente",
        async () => {
          const login = await request("login", "POST", {
            password: "test-only-password",
          });
          cookie = login.cookie.split(";")[0];
          const extra = await create("properties", {
            name: "Inmueble cierre",
            kind: "Casa",
            address: "Prueba",
            city: "Bogotá",
          });
          const closing = await create("leases", {
            property_id: extra.id,
            tenant_id: tenant.id,
            start_date: startDate,
            end_date: end,
            rent: 120000,
            due_day: 5,
          });
          const fixture = new pg.Client({ connectionString: url.toString() });
          await fixture.connect();
          try {
            // Simula un mes aún no generado, sin alterar saldos de otros contratos.
            await fixture.query(
              "DELETE FROM charges WHERE lease_id=$1 AND period=$2",
              [closing.id, startDate],
            );
          } finally {
            await fixture.end();
          }
          const finish = await request("leases/" + closing.id, "PATCH", {
            end_date: today,
          });
          assert.equal(finish.status, 200);
          let charges = (await request("snapshot")).data.charges.filter(
            (c) => c.lease_id === closing.id,
          );
          assert.equal(charges.length, 1);
          assert.equal(Number(charges[0].balance), 120000);
          assert.equal(
            (
              await request("leases/" + closing.id, "PATCH", {
                end_date: today,
              })
            ).status,
            200,
          );
          charges = (await request("snapshot")).data.charges.filter(
            (c) => c.lease_id === closing.id,
          );
          assert.equal(charges.length, 1);
          assert.equal(Number(charges[0].balance), 120000);
        },
      );
      let inventoryProperty, otherProperty, space, otherSpace, inventoryItem;
      await t.test(
        "Inventario: espacios y elementos completamente personalizables",
        async () => {
          inventoryProperty = await create("properties", {
            name: "Inmueble inventario",
            kind: "Casa",
            address: "Dirección de prueba",
            city: "Bogotá",
          });
          otherProperty = await create("properties", {
            name: "Otro inmueble",
            kind: "Apartamento",
            address: "Prueba",
            city: "Bogotá",
          });
          space = await create("spaces", {
            property_id: inventoryProperty.id,
            name: "Baño principal",
            floor: "Piso 2",
            notes: "Revisión de entrega",
          });
          otherSpace = await create("spaces", {
            property_id: otherProperty.id,
            name: "Cocina",
          });
          assert.equal(
            (
              await request("spaces", "POST", {
                property_id: inventoryProperty.id,
                name: "BAÑO PRINCIPAL",
              })
            ).status,
            409,
          );
          inventoryItem = await create("inventory-items", {
            property_id: inventoryProperty.id,
            space_id: space.id,
            name: "Toma doble",
            category: "Instalación especial",
            quantity: 2,
            unit: "unidad",
            condition: "Bueno",
            brand: "Prueba",
            model: "Doble",
            serial_number: "INV-1",
            material: "Policarbonato",
            color: "Blanco",
            dimensions: "8 × 12 cm",
            unit_value: 15000,
            ownership: "Propietario",
            inspected_on: today,
            notes: "Sin grietas",
            attributes: [
              { name: "Voltaje", value: "110 V" },
              { name: "Puesta a tierra", value: "Sí" },
            ],
          });
          const s = (await request("inventory/" + inventoryProperty.id)).data;
          assert.equal(s.spaces.length, 1);
          assert.equal(s.items.length, 1);
          assert.equal(s.items[0].attributes[0].value, "110 V");
          assert.equal(s.items[0].space_name, "Baño principal");
          assert.equal(
            (
              await request(
                "inventory/" + inventoryProperty.id,
                "GET",
                undefined,
                false,
              )
            ).status,
            401,
          );
          assert.equal(
            (
              await request("inventory-items", "POST", {
                property_id: inventoryProperty.id,
                space_id: otherSpace.id,
                name: "Cruce inválido",
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await request("inventory-items", "POST", {
                property_id: inventoryProperty.id,
                name: "Cantidad inválida",
                quantity: -1,
              })
            ).status,
            400,
          );
          assert.equal(
            (await request("spaces/" + space.id, "DELETE")).status,
            409,
          );
        },
      );
      await t.test(
        "Inventario: carga múltiple atómica, cantidades y unidades",
        async () => {
          const before = (await request("inventory/" + inventoryProperty.id))
            .data.items.length;
          assert.equal(
            (
              await request("inventory-items/batch", "POST", {
                items: [
                  {
                    property_id: inventoryProperty.id,
                    space_id: space.id,
                    name: "No debe persistir",
                  },
                  {
                    property_id: inventoryProperty.id,
                    space_id: otherSpace.id,
                    name: "Espacio ajeno",
                  },
                ],
              })
            ).status,
            400,
          );
          assert.equal(
            (await request("inventory/" + inventoryProperty.id)).data.items
              .length,
            before,
          );
          const r = await create("inventory-items/batch", {
            items: [
              {
                property_id: inventoryProperty.id,
                space_id: space.id,
                name: "Lavabo",
                category: "Sanitario",
                quantity: 1,
              },
              {
                property_id: inventoryProperty.id,
                space_id: space.id,
                name: "Inodoro",
                quantity: 1,
              },
              {
                property_id: inventoryProperty.id,
                name: "Enchape",
                quantity: 12.5,
                unit: "m²",
              },
            ],
          });
          assert.equal(r.items.length, 3);
          assert.equal(Number(r.items[2].quantity), 12.5);
          assert.equal(r.items[0].condition, "Por revisar");
        },
      );
      await t.test(
        "Inventario: edición, archivo, restauración e historial",
        async () => {
          const edit = await request(
            "inventory-items/" + inventoryItem.id,
            "PATCH",
            { ...inventoryItem, condition: "Regular", notes: "Una tapa rota" },
          );
          assert.equal(edit.status, 200);
          assert.equal(
            (
              await request("inventory-items/" + inventoryItem.id, "PATCH", {
                archived: true,
              })
            ).status,
            200,
          );
          assert.equal(
            (
              await request("inventory-items/" + inventoryItem.id, "PATCH", {
                ...inventoryItem,
                name: "Edición archivada",
              })
            ).status,
            409,
          );
          assert.equal(
            (
              await request("inventory-items/" + inventoryItem.id, "PATCH", {
                archived: false,
              })
            ).status,
            200,
          );
          const h = (
            await request("inventory-items/" + inventoryItem.id + "/history")
          ).data;
          assert.equal(h.length, 4);
          assert.equal(h[0].action, "Restaurado");
          assert.ok(h.some((x) => x.snapshot.condition === "Bueno"));
          assert.ok(h.some((x) => x.snapshot.notes === "Una tapa rota"));
          assert.equal(
            (
              await request("inventory-items/" + inventoryItem.id, "PATCH", {
                ...inventoryItem,
                property_id: otherProperty.id,
              })
            ).status,
            400,
          );
        },
      );
      let generalPhotos, elementPhoto;
      const imageBytes = await sharp({
        create: { width: 80, height: 40, channels: 3, background: "#235f4d" },
      })
        .png()
        .toBuffer();
      function photoForm(propertyId, itemId = null, files = [imageBytes]) {
        const f = new FormData();
        f.set("property_id", propertyId);
        if (itemId) f.set("inventory_item_id", itemId);
        f.set("caption", "Evidencia de prueba");
        files.forEach((bytes, i) =>
          f.append(
            "files",
            new Blob([bytes], { type: "image/png" }),
            "foto-" + i + ".png",
          ),
        );
        return f;
      }
      await t.test(
        "Fotos: múltiples imágenes, portada, miniatura y acceso privado",
        async () => {
          generalPhotos = (
            await create(
              "photos",
              photoForm(inventoryProperty.id, null, [imageBytes, imageBytes]),
            )
          ).photos;
          assert.equal(generalPhotos.length, 2);
          const photos = (await request("inventory/" + inventoryProperty.id))
            .data.photos;
          assert.equal(photos.filter((p) => p.is_cover).length, 1);
          const photo = photos.find((p) => p.is_cover);
          assert.equal(
            (await request("snapshot")).data.properties.find(
              (p) => p.id === inventoryProperty.id,
            ).cover_photo_id,
            photo.id,
          );
          const response = await fetch(
            origin + "/api/photos/" + photo.id + "/file",
            { headers: { cookie } },
          );
          assert.equal(response.status, 200);
          assert.equal(response.headers.get("content-type"), "image/webp");
          const metadata = await sharp(
            Buffer.from(await response.arrayBuffer()),
          ).metadata();
          assert.equal(metadata.width, 80);
          assert.equal(metadata.height, 40);
          assert.equal(metadata.exif, undefined);
          assert.equal(
            (
              await fetch(origin + "/api/photos/" + photo.id + "/thumbnail", {
                headers: { cookie },
              })
            ).status,
            200,
          );
          assert.equal(
            (
              await request(
                "photos/" + photo.id + "/file",
                "GET",
                undefined,
                false,
              )
            ).status,
            401,
          );
          const download = await fetch(
            origin + "/api/photos/" + photo.id + "/file?download=1",
            { headers: { cookie } },
          );
          assert.match(
            download.headers.get("content-disposition"),
            /^attachment/,
          );
          elementPhoto = (
            await create(
              "photos",
              photoForm(inventoryProperty.id, inventoryItem.id),
            )
          ).photos[0];
          assert.equal(elementPhoto.inventory_item_id, inventoryItem.id);
          assert.equal(
            (
              await request("photos/" + elementPhoto.id, "PATCH", {
                is_cover: true,
              })
            ).status,
            400,
          );
        },
      );
      await t.test(
        "Fotos: validación real del archivo y de pertenencia",
        async () => {
          const count = (await request("inventory/" + inventoryProperty.id))
            .data.photos.length;
          assert.equal(
            (
              await request(
                "photos",
                "POST",
                photoForm(inventoryProperty.id, null, [
                  imageBytes,
                  Buffer.from('<svg onload="alert(1)"></svg>'),
                ]),
              )
            ).status,
            400,
          );
          assert.equal(
            (await request("inventory/" + inventoryProperty.id)).data.photos
              .length,
            count,
          );
          assert.equal(
            (
              await request(
                "photos",
                "POST",
                photoForm(otherProperty.id, inventoryItem.id),
              )
            ).status,
            400,
          );
          assert.equal(
            (
              await request(
                "photos",
                "POST",
                photoForm(inventoryProperty.id, null, [
                  Buffer.alloc(10 * 1024 * 1024 + 1),
                ]),
              )
            ).status,
            400,
          );
        },
      );
      await t.test(
        "Fotos: archivo reversible y una sola portada tras concurrencia",
        async () => {
          const old = (
            await request("inventory/" + inventoryProperty.id)
          ).data.photos.find((p) => p.is_cover);
          assert.equal(
            (await request("photos/" + old.id, "PATCH", { archived: true }))
              .status,
            200,
          );
          let photos = (await request("inventory/" + inventoryProperty.id)).data
            .photos;
          assert.equal(photos.filter((p) => p.is_cover).length, 1);
          assert.notEqual(photos.find((p) => p.is_cover).id, old.id);
          assert.equal(
            (
              await request("photos/" + old.id, "PATCH", {
                archived: false,
                caption: "Fachada restaurada",
              })
            ).status,
            200,
          );
          const results = await Promise.all(
            generalPhotos.map((p) =>
              request("photos/" + p.id, "PATCH", { is_cover: true }),
            ),
          );
          assert.ok(results.every((r) => r.status === 200));
          photos = (await request("inventory/" + inventoryProperty.id)).data
            .photos;
          assert.equal(photos.filter((p) => p.is_cover).length, 1);
          assert.equal(
            photos.find((p) => p.id === old.id).caption,
            "Fachada restaurada",
          );
        },
      );
      await t.test(
        "Inventario: exportación segura y persistencia al reiniciar",
        async () => {
          await create("inventory-items", {
            property_id: inventoryProperty.id,
            name: "=SUM(1,2)",
            notes: "Nota; con separador",
          });
          const csv = await request(
            "inventory/" + inventoryProperty.id + "/export",
          );
          assert.equal(csv.status, 200);
          assert.match(csv.data, /Voltaje/);
          assert.match(csv.data, /"'=SUM/);
          assert.match(csv.data, /Nota; con separador/);
          await stop();
          await start();
          const d = (await request("inventory/" + inventoryProperty.id)).data;
          assert.equal(d.spaces.length, 1);
          assert.equal(d.items.length, 5);
          assert.equal(d.photos.length, 3);
          assert.equal(
            (
              await fetch(origin + "/api/photos/" + elementPhoto.id + "/file", {
                headers: { cookie },
              })
            ).status,
            200,
          );
          assert.equal(
            (await request("properties/" + inventoryProperty.id, "DELETE"))
              .status,
            200,
          );
          assert.equal(
            (
              await request("inventory-items", "POST", {
                property_id: inventoryProperty.id,
                name: "No permitido",
              })
            ).status,
            409,
          );
          assert.equal(
            (await request("photos", "POST", photoForm(inventoryProperty.id)))
              .status,
            409,
          );
          assert.equal(
            (await request("inventory/" + inventoryProperty.id)).status,
            200,
          );
        },
      );

      let listingProperty, listingPhotos, privatePhoto, listingState;
      let listingDraft;
      await t.test(
        "Anuncios: borrador privado y validación antes de publicar",
        async () => {
          listingProperty = await create("properties", {
            name: "Inmueble para anuncio",
            kind: "Apartamento",
            city: "Bogotá",
            address: "Dirección exacta PRIVADA",
            area: 72,
            bedrooms: 2,
            bathrooms: 2,
            purchase_value: 999999,
            notes: "NOTA INTERNA SECRETA",
          });
          listingPhotos = (
            await create(
              "photos",
              photoForm(listingProperty.id, null, [imageBytes, imageBytes]),
            )
          ).photos;
          const item = await create("inventory-items", {
            property_id: listingProperty.id,
            name: "Elemento privado",
          });
          privatePhoto = (
            await create("photos", photoForm(listingProperty.id, item.id))
          ).photos[0];
          listingDraft = {
            title: "Apartamento luminoso",
            description: "Descripción pública <script>alert(1)</script>",
            monthly_rent: 2400000,
            administration: 300000,
            neighborhood: "Cedritos",
            contact_name: "Gestor de prueba",
            contact_phone: "+573001234567",
            contact_email: "gestor@example.com",
            amenities: ["Balcón", "Ascensor"],
            photo_ids: [listingPhotos[0].id],
            show_address: false,
            available_from: "2030-01-01",
            expires_on: null,
          };
          assert.equal(
            (
              await request(
                "listings/" + listingProperty.id,
                "GET",
                undefined,
                false,
              )
            ).status,
            401,
          );
          assert.equal(
            (
              await request(
                "listings/" + listingProperty.id + "/publish",
                "POST",
                listingDraft,
                false,
              )
            ).status,
            401,
          );
          const initial = await request("listings/" + listingProperty.id);
          assert.equal(initial.data.url, "");
          for (const invalid of [
            { monthly_rent: 0 },
            { photo_ids: [] },
            { contact_phone: "", contact_email: "" },
            { photo_ids: [privatePhoto.id] },
            { photo_ids: [generalPhotos[0].id] },
            { expires_on: "2000-01-01" },
          ]) {
            assert.equal(
              (
                await request(
                  "listings/" + listingProperty.id + "/publish",
                  "POST",
                  { ...listingDraft, ...invalid },
                )
              ).status,
              400,
            );
          }
          listingState = await create(
            "listings/" + listingProperty.id + "/draft",
            listingDraft,
          );
          assert.equal(listingState.enabled, false);
          assert.equal(listingState.local_only, true);
          assert.match(listingState.path, /^\/p\/[A-Za-z0-9_-]{43}$/);
          assert.equal(
            (
              await request(
                "public/" + listingState.path.split("/").at(-1),
                "GET",
                undefined,
                false,
              )
            ).status,
            404,
          );
        },
      );
      await t.test(
        "Anuncios: página pública y fotos seleccionadas sin exponer gestión privada",
        async () => {
          listingState = await create(
            "listings/" + listingProperty.id + "/publish",
            listingDraft,
          );
          assert.equal(listingState.has_unpublished_changes, false);
          const key = listingState.path.split("/").at(-1);
          const pub = await request("public/" + key, "GET", undefined, false);
          assert.equal(pub.status, 200);
          assert.equal(pub.data.address, null);
          assert.equal(pub.data.title, listingDraft.title);
          assert.deepEqual(
            pub.data.photos.map((p) => p.id),
            [listingPhotos[0].id],
          );
          for (const secret of [
            "purchase_value",
            "notes",
            "property_id",
            "storage_key",
            "inventory_item_id",
            "original_filename",
            "NOTA INTERNA SECRETA",
            "Dirección exacta PRIVADA",
          ])
            assert.ok(!JSON.stringify(pub.data).includes(secret), secret);
          const allowed = await fetch(
            origin +
              "/api/public/" +
              key +
              "/photos/" +
              listingPhotos[0].id +
              "/file",
          );
          assert.equal(allowed.status, 200);
          assert.equal(allowed.headers.get("content-type"), "image/webp");
          assert.match(allowed.headers.get("cache-control"), /no-store/);
          assert.equal(
            (
              await fetch(
                origin +
                  "/api/public/" +
                  key +
                  "/photos/" +
                  listingPhotos[0].id +
                  "/thumbnail",
              )
            ).status,
            200,
          );
          for (const id of [
            listingPhotos[1].id,
            privatePhoto.id,
            generalPhotos[0].id,
            randomUUID(),
            "bad",
          ]) {
            assert.equal(
              (
                await fetch(
                  origin + "/api/public/" + key + "/photos/" + id + "/file",
                )
              ).status,
              404,
            );
          }
          assert.equal(
            (
              await fetch(
                origin + "/api/photos/" + listingPhotos[0].id + "/file",
              )
            ).status,
            401,
          );
          const page = await fetch(origin + listingState.path);
          assert.equal(page.status, 200);
          assert.match(page.headers.get("cache-control"), /no-store/);
          const html = await page.text();
          assert.match(html, /Apartamento luminoso/);
          assert.match(html, /noindex/);
          assert.ok(!html.includes("<script>alert(1)</script>"));
          assert.ok(!html.includes("NOTA INTERNA SECRETA"));
          assert.ok(
            (await request("snapshot")).data.properties.find(
              (p) => p.id === listingProperty.id,
            ).listing_enabled,
          );
        },
      );
      await t.test(
        "Anuncios: cambios en borrador no alteran la versión publicada",
        async () => {
          const key = listingState.path.split("/").at(-1);
          listingDraft = {
            ...listingDraft,
            title: "Título actualizado",
            show_address: true,
            photo_ids: [listingPhotos[1].id, listingPhotos[0].id],
            expires_on: "2200-01-01",
          };
          const draft = await create(
            "listings/" + listingProperty.id + "/draft",
            listingDraft,
          );
          assert.equal(draft.has_unpublished_changes, true);
          assert.equal(draft.url, listingState.url);
          const before = (
            await request("public/" + key, "GET", undefined, false)
          ).data;
          assert.equal(before.title, "Apartamento luminoso");
          assert.equal(before.address, null);
          assert.equal(before.photos.length, 1);
          listingState = await create(
            "listings/" + listingProperty.id + "/publish",
            listingDraft,
          );
          assert.equal(listingState.has_unpublished_changes, false);
          const after = (
            await request("public/" + key, "GET", undefined, false)
          ).data;
          assert.equal(after.title, listingDraft.title);
          assert.equal(after.address, listingProperty.address);
          assert.deepEqual(
            after.photos.map((p) => p.id),
            listingDraft.photo_ids,
          );
        },
      );
      await t.test(
        "Anuncios: reemplazar y desactivar revoca página, datos y fotos",
        async () => {
          const oldKey = listingState.path.split("/").at(-1),
            oldPath = listingState.path;
          listingState = await create(
            "listings/" + listingProperty.id + "/rotate",
            {},
          );
          assert.notEqual(listingState.path, oldPath);
          assert.equal(
            (await request("public/" + oldKey, "GET", undefined, false)).status,
            404,
          );
          assert.equal((await fetch(origin + oldPath)).status, 404);
          assert.equal(
            (
              await fetch(
                origin +
                  "/api/public/" +
                  oldKey +
                  "/photos/" +
                  listingPhotos[0].id +
                  "/file",
              )
            ).status,
            404,
          );
          const key = listingState.path.split("/").at(-1);
          assert.equal(
            (await request("public/" + key, "GET", undefined, false)).status,
            200,
          );
          await create("listings/" + listingProperty.id + "/disable", {});
          assert.equal(
            (await request("public/" + key, "GET", undefined, false)).status,
            404,
          );
          assert.equal((await fetch(origin + listingState.path)).status, 404);
          assert.equal(
            (
              await fetch(
                origin +
                  "/api/public/" +
                  key +
                  "/photos/" +
                  listingPhotos[0].id +
                  "/file",
              )
            ).status,
            404,
          );
          listingState = await create(
            "listings/" + listingProperty.id + "/publish",
            listingDraft,
          );
          assert.equal(
            (await request("public/" + key, "GET", undefined, false)).status,
            200,
          );
        },
      );
      await t.test(
        "Anuncios: archivar una foto retira su acceso público inmediatamente",
        async () => {
          const key = listingState.path.split("/").at(-1);
          assert.equal(
            (
              await request("photos/" + listingPhotos[0].id, "PATCH", {
                archived: true,
              })
            ).status,
            200,
          );
          const pub = (await request("public/" + key, "GET", undefined, false))
            .data;
          assert.deepEqual(
            pub.photos.map((p) => p.id),
            [listingPhotos[1].id],
          );
          assert.equal(
            (
              await fetch(
                origin +
                  "/api/public/" +
                  key +
                  "/photos/" +
                  listingPhotos[0].id +
                  "/file",
              )
            ).status,
            404,
          );
          assert.equal(
            (
              await request(
                "listings/" + listingProperty.id + "/publish",
                "POST",
                listingDraft,
              )
            ).status,
            400,
          );
          listingDraft = { ...listingDraft, photo_ids: [listingPhotos[1].id] };
          listingState = await create(
            "listings/" + listingProperty.id + "/publish",
            listingDraft,
          );
        },
      );
      await t.test(
        "Anuncios: vencimiento y persistencia tras reiniciar",
        async () => {
          const key = listingState.path.split("/").at(-1),
            testDb = new pg.Client({ connectionString: url.toString() });
          await testDb.connect();
          try {
            await testDb.query(
              "UPDATE property_listings SET expires_on='2000-01-01' WHERE property_id=$1",
              [listingProperty.id],
            );
          } finally {
            await testDb.end();
          }
          assert.equal(
            (await request("public/" + key, "GET", undefined, false)).status,
            404,
          );
          assert.equal((await fetch(origin + listingState.path)).status, 404);
          assert.equal(
            (await request("snapshot")).data.properties.find(
              (p) => p.id === listingProperty.id,
            ).listing_enabled,
            false,
          );
          listingState = await create(
            "listings/" + listingProperty.id + "/publish",
            listingDraft,
          );
          await stop();
          await start();
          assert.equal(
            (await request("public/" + key, "GET", undefined, false)).status,
            200,
          );
          assert.equal(
            (await request("listings/" + listingProperty.id)).data.path,
            listingState.path,
          );
        },
      );
      await t.test(
        "Anuncios: archivar el inmueble revoca todo el anuncio",
        async () => {
          const key = listingState.path.split("/").at(-1);
          assert.equal(
            (await request("properties/" + listingProperty.id, "DELETE"))
              .status,
            200,
          );
          assert.equal(
            (await request("public/" + key, "GET", undefined, false)).status,
            404,
          );
          assert.equal((await fetch(origin + listingState.path)).status, 404);
          assert.equal(
            (
              await fetch(
                origin +
                  "/api/public/" +
                  key +
                  "/photos/" +
                  listingPhotos[1].id +
                  "/file",
              )
            ).status,
            404,
          );
          assert.equal(
            (
              await request(
                "listings/" + listingProperty.id + "/publish",
                "POST",
                listingDraft,
              )
            ).status,
            409,
          );
          assert.equal(
            (await create("listings/" + listingProperty.id + "/disable", {}))
              .enabled,
            false,
          );
        },
      );
      await runGrowthCases({
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
      });
    } finally {
      await stop();
      await root.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
      await root.end();
    }
  },
);

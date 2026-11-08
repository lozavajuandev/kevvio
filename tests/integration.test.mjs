import { test } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { migrate } from "../scripts/migrate.mjs";
import { resolve } from "node:path";

test(
  "Flujo completo con PostgreSQL aislado, integridad y persistencia",
  { timeout: 120000 },
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
    async function start() {
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
    } finally {
      await stop();
      await root.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
      await root.end();
    }
  },
);

import type { PoolClient } from "pg";
import { AppError, today } from "./domain";
export async function generateCharges(
  client: PoolClient,
  month: string,
  leaseId: string | null = null,
) {
  const { rows } = await client.query(
    `INSERT INTO charges(lease_id,period,due_date,amount)
    SELECT l.id, m::date, GREATEST(l.start_date, m::date + (l.due_day - 1)), l.rent+l.administration
    FROM leases l CROSS JOIN LATERAL generate_series(date_trunc('month',l.start_date), LEAST(date_trunc('month',l.end_date),$1::date),interval '1 month') m
    WHERE l.status='active' AND ($2::uuid IS NULL OR l.id=$2)
    ON CONFLICT(lease_id,period) DO NOTHING RETURNING id`,
    [month + "-01", leaseId],
  );
  return rows.length;
}
export async function registerPayment(
  client: PoolClient,
  v: {
    charge_id: string;
    amount: number;
    paid_on: string;
    method: string;
    reference: string;
    notes: string;
    idempotency_key: string;
  },
) {
  if (v.paid_on > today())
    throw new AppError(400, "La fecha del pago no puede estar en el futuro.");
  const charge = await client.query(
    "SELECT id,amount FROM charges WHERE id=$1 FOR UPDATE",
    [v.charge_id],
  );
  if (!charge.rows.length) throw new AppError(404, "El cobro no existe.");
  const previous = await client.query(
    "SELECT * FROM payments WHERE idempotency_key=$1",
    [v.idempotency_key],
  );
  if (previous.rows.length) {
    const p = previous.rows[0];
    if (
      p.charge_id !== v.charge_id ||
      Number(p.amount) !== v.amount ||
      p.paid_on !== v.paid_on ||
      p.method !== v.method ||
      p.reference !== v.reference ||
      p.notes !== v.notes
    )
      throw new AppError(409, "La referencia de operación ya fue utilizada.");
    return p;
  }
  const paid = await client.query(
    "SELECT COALESCE(sum(amount),0) AS total FROM payments WHERE charge_id=$1 AND voided_at IS NULL",
    [v.charge_id],
  );
  const balance = Number(charge.rows[0].amount) - Number(paid.rows[0].total);
  if (v.amount > balance)
    throw new AppError(
      409,
      `El abono supera el saldo pendiente de $${balance.toLocaleString("es-CO")}.`,
    );
  const { rows } = await client.query(
    "INSERT INTO payments(charge_id,amount,paid_on,method,reference,notes,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",
    [
      v.charge_id,
      v.amount,
      v.paid_on,
      v.method,
      v.reference,
      v.notes,
      v.idempotency_key,
    ],
  );
  return rows[0];
}

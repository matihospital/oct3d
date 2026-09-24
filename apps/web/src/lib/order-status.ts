import type { DeliveryStatus, PaymentStatus } from "@oct3d/db";

export function paymentStatusFromPaid(
  totalPrice: number,
  amountPaid: number,
): PaymentStatus {
  if (amountPaid <= 0.009) return "unpaid";
  if (amountPaid + 0.5 >= totalPrice) return "paid";
  return "partial";
}

export function paymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case "paid":
      return "Cobrado";
    case "partial":
      return "Pago parcial";
    default:
      return "Sin cobrar";
  }
}

export function deliveryStatusLabel(status: DeliveryStatus): string {
  return status === "delivered" ? "Entregado" : "Pendiente entrega";
}

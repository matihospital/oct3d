const APPEARANCE: Record<string, string> = {
  default: "ops-lozenge-default",
  success: "ops-lozenge-success",
  moved: "ops-lozenge-moved",
  removed: "ops-lozenge-removed",
  inprogress: "ops-lozenge-inprogress",
  new: "ops-lozenge-new",
};

export function Lozenge({
  children,
  appearance = "default",
}: {
  children: React.ReactNode;
  appearance?: keyof typeof APPEARANCE;
}) {
  return <span className={`ops-lozenge ${APPEARANCE[appearance]}`}>{children}</span>;
}

export function quoteStatusLozenge(status: string) {
  switch (status) {
    case "accepted":
      return <Lozenge appearance="success">accepted</Lozenge>;
    case "sent":
      return <Lozenge appearance="inprogress">sent</Lozenge>;
    case "rejected":
      return <Lozenge appearance="removed">rejected</Lozenge>;
    default:
      return <Lozenge appearance="default">draft</Lozenge>;
  }
}

export function orderStatusLozenge(status: string) {
  switch (status) {
    case "done":
      return <Lozenge appearance="success">Hecho</Lozenge>;
    case "cancelled":
      return <Lozenge appearance="removed">Cancelado</Lozenge>;
    default:
      return <Lozenge appearance="moved">Pendiente</Lozenge>;
  }
}

export function paymentStatusLozenge(status: string) {
  switch (status) {
    case "paid":
      return <Lozenge appearance="success">Cobrado</Lozenge>;
    case "partial":
      return <Lozenge appearance="inprogress">Pago parcial</Lozenge>;
    default:
      return <Lozenge appearance="removed">Sin cobrar</Lozenge>;
  }
}

export function deliveryStatusLozenge(status: string) {
  return status === "delivered" ? (
    <Lozenge appearance="success">Entregado</Lozenge>
  ) : (
    <Lozenge appearance="moved">Sin entregar</Lozenge>
  );
}

export function quoteStatusLozengeEs(status: string) {
  switch (status) {
    case "accepted":
      return <Lozenge appearance="success">Aceptado</Lozenge>;
    case "sent":
      return <Lozenge appearance="inprogress">Enviado</Lozenge>;
    case "rejected":
      return <Lozenge appearance="removed">Rechazado</Lozenge>;
    default:
      return <Lozenge appearance="default">Borrador</Lozenge>;
  }
}

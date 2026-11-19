import { describe, expect, it } from "vitest";
import { filterAdminOrders, orderValueTotals, parseOrderListFilter } from "@/features/admin/orders";

describe("totais e filtro de pedidos", () => {
  const rows = [
    { status: "approved", amountCents: 17500 },
    { status: "approved", amountCents: 3500 },
    { status: "pending", amountCents: 17500 },
    { status: "cancelled", amountCents: 35000 },
    { status: "rejected", amountCents: 9900 },
  ];

  it("lê o estado da URL", () => {
    expect(parseOrderListFilter("concluidas")).toBe("approved");
    expect(parseOrderListFilter("pendentes")).toBe("pending");
    expect(parseOrderListFilter("canceladas")).toBe("cancelled");
    expect(parseOrderListFilter("todas")).toBe("all");
  });

  it("soma vendidas, pendentes, canceladas e o total desses três", () => {
    expect(orderValueTotals(rows)).toEqual({
      soldCents: 21000,
      pendingCents: 17500,
      cancelledCents: 35000,
      totalCents: 73500,
    });
  });

  it("filtra a listagem por status", () => {
    expect(filterAdminOrders(rows, "approved")).toHaveLength(2);
    expect(filterAdminOrders(rows, "pending")).toHaveLength(1);
    expect(filterAdminOrders(rows, "cancelled")).toHaveLength(1);
    expect(filterAdminOrders(rows, "all")).toHaveLength(5);
  });
});

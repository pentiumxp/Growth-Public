export const releaseInventoryReadbackRow = Object.freeze(["inventory", "Inventory"]);

export function releaseInventoryReadbackData(data = {}) {
  const value = data.inventory || {};
  return value.releaseInventory || value.inventory || value;
}

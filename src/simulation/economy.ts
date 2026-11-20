export const products = [
  { id: 'water', name: 'Agua mineral', detail: 'Recupera 15 de salud', price: 8 },
  { id: 'snack', name: 'Bocadillo tropical', detail: 'Recupera 30 de salud', price: 12 },
  { id: 'ammo', name: 'Munición para pistola', detail: 'Caja de 12 cartuchos', price: 30 },
] as const;
export type Item = typeof products[number]['id'];
export type Inventory = Record<Item, number>;
export interface TradeSnapshot { name: string; selection: number; cash: number; stock: Readonly<Inventory> }
export class Economy {
  money = 120;
  readonly inventory: Inventory = { water: 0, snack: 0, ammo: 0 };
  private registers = new Map<string, { cash: number; stock: Inventory }>();
  constructor(private readonly stores: readonly { id: string; loot: number }[]) { this.reset(); }
  stock(storeId: string): Readonly<Inventory> | undefined { return this.registers.get(storeId)?.stock; }
  buy(storeId: string, id: string): string | null {
    const product = products.find((item) => item.id === id);
    const register = this.registers.get(storeId);
    if (!product || !register) return 'Producto o tienda desconocidos';
    if (register.stock[product.id] <= 0) return 'Producto agotado';
    if (this.money < product.price) return 'Saldo insuficiente';
    this.money -= product.price; register.cash += product.price;
    register.stock[product.id]--; this.inventory[product.id]++;
    return null;
  }
  use(id: Item) { if (this.inventory[id] <= 0) return false; this.inventory[id]--; return true; }
  rob(storeId: string, requested = Infinity) {
    const register = this.registers.get(storeId); if (!register) return 0;
    const amount = Math.min(register.cash, Math.max(0, requested));
    register.cash -= amount; this.money += amount; return amount;
  }
  reset() {
    this.money = 120; Object.assign(this.inventory, { water: 0, snack: 0, ammo: 0 }); this.registers.clear();
    for (const store of this.stores) this.registers.set(store.id, { cash: store.loot, stock: { water: 12, snack: 8, ammo: 5 } });
  }
}

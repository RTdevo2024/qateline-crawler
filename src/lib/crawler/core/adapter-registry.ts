import type { BaseAdapter } from './base-adapter';

class AdapterRegistry {
  private readonly adapters: BaseAdapter[] = [];

  register(adapter: BaseAdapter): void {
    this.adapters.push(adapter);
  }

  findByUrl(url: string): BaseAdapter | null {
    return this.adapters.find((a) => a.canHandle(url)) ?? null;
  }

  findByKey(key: string): BaseAdapter | null {
    return this.adapters.find((a) => a.name === key) ?? null;
  }

  listAll(): BaseAdapter[] {
    return [...this.adapters];
  }
}

export { AdapterRegistry };
export const adapterRegistry = new AdapterRegistry();

import { adapterRegistry } from '../core/adapter-registry';
import { YadakMarketAdapter } from './yadakmarket';

adapterRegistry.register(new YadakMarketAdapter());

export { adapterRegistry };

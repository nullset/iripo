import type { Iripo } from '../src/index';

declare global {
  interface Window {
    iripo: Iripo;
    iripoReady: boolean;
  }
}

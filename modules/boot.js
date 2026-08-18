import { installLegacyBridge } from './legacy-bridge.js?v=admin-media-preserve-v3';

if (typeof window !== 'undefined') {
  installLegacyBridge(window);
  window.__apPerformanceReady = import('../performance_optimization_patch.js?v=performance-v4-media-preserve')
    .then(() => {
      window.dispatchEvent(new CustomEvent('apservice:performance-ready'));
      return true;
    })
    .catch(error => {
      console.warn('ไม่สามารถติดตั้ง performance patch ได้', error);
      return false;
    });
}

import * as config from './core/config.js';
import * as storage from './core/storage.js?v=performance-v5-media-preserve';
import * as appState from './state/app-state.js';
import * as supabase from './api/supabase-client.js?v=admin-performance-v1';
import * as storeOps from './services/store-ops.js';
import * as marketplace from './services/marketplace.js';
import * as supportChat from './services/support-chat.js';
import * as customerDelivery from './services/customer-delivery.js';
import * as categoryUX from './services/category-ux.js';
import * as money from './utils/money.js';
import * as media from './utils/media.js?v=img-hardcap-v1';
import * as location from './utils/location.js';
import * as ui from './utils/ui.js';
import * as dom from './components/dom.js';
import * as home from './pages/home.js';
import * as orders from './pages/orders.js';
import * as adminStores from './pages/admin/stores.js';
import * as adminRiders from './pages/admin/riders.js';
import * as adminOrders from './pages/admin/orders.js';
import * as adminFinance from './pages/admin/finance.js';
import * as adminContent from './pages/admin/content.js';

export const LEGACY_PUBLIC_FUNCTIONS = Object.freeze([
  'addCart', 'addCatalogCategory', 'addMapping', 'addPromotion', 'adjustCart', 'approveErrorReview',
  'approveRiderApplication', 'assignOrderRider', 'callAdmin', 'captureCustomerLocation', 'captureErrandLocation',
  'captureFoodDeliveryCurrent', 'captureStoreLocation', 'checkout', 'closeActionConfirmation', 'closeCustomerReview',
  'closeErrorReport', 'closeMapPicker', 'closeMenuOptions', 'closeModal', 'closeRideBooking', 'closeSupportChat',
  'createSettlementBatch', 'deleteCatalogCategory', 'deleteMenuItem', 'deleteRider', 'deleteStore',
  'downloadRiderApplicationDocument', 'editCampaign', 'editListing', 'editMenuItem', 'focusCreditCustomer',
  'focusMapOnCurrentLocation', 'generateStoreDetailPassword', 'hideListing', 'loadRideRiders', 'logout',
  'marketplaceMenuChange', 'moderateStore', 'newListing', 'openAdminModal', 'openCustomerReview',
  'openErrorReport', 'openListing', 'openMapPicker', 'openMenuModal', 'openPrivacyPolicy', 'openPromotion',
  'openRideBooking', 'openRidePickupMap', 'openRiderModal', 'openSettlementPayment', 'openStore',
  'openStoreDetail', 'openStoreLocationPicker', 'openStoreModal', 'openSupportAdminConversation', 'openSupportChat',
  'pickStoreDetailLocation', 'previewListingFile', 'previewListingUrl', 'queueErrorReview',
  'refreshCustomerDirectory', 'refreshErrorMonitor', 'refreshRiderApplicationStatus', 'refreshRiderApplications',
  'refreshRiderCompliance', 'refreshRiderIncome', 'refreshSettlementAdmin', 'rejectRiderApplication',
  'removeAdmin', 'removeMapping', 'removePromotion', 'renderPromotionEditor', 'renderStoreDetail',
  'requestMarketplacePurchase', 'requireLoginThen', 'resetCampaignForm', 'resetMenuForm', 'resolveErrorReport',
  'reviewWithdrawalRequest', 'runErrorRetentionCleanup', 'saveCategorySort', 'saveMapPicker', 'savePlatformConfig',
  'saveProfile', 'saveSettlementRecipient', 'saveStorageTarget', 'saveStoreDetailPassword', 'saveStoreDetailSection',
  'selectRideRider', 'setAPCategory', 'setErrandLocationMode', 'setFoodDeliveryMode', 'setPromotionTarget',
  'setStoreDetailTab', 'showStoreModerationHistory', 'showView', 'socialLogin', 'startMarketplaceChat',
  'submitErrand', 'submitRideBooking', 'syncLocalOrdersToCloud', 'testConnection', 'testWebhookConfig',
  'toggleCampaign', 'toggleCampaignStorePicker', 'toggleInventory', 'toggleStore', 'updateInventory',
  'updateOrderStatus', 'updatePromotion', 'useRidePickupGps', 'useStoreDetailCurrentLocation', 'viewErrorEvidence',
  'withdrawLocationNotice',
]);

export function collectMissingLegacyActions(root = globalThis) {
  return LEGACY_PUBLIC_FUNCTIONS.filter((name) => typeof root?.[name] !== 'function');
}

export function publishLegacyAction(name, implementation, root = globalThis) {
  if (!LEGACY_PUBLIC_FUNCTIONS.includes(name)) throw new Error(`ไม่อนุญาตให้ publish action นอก contract: ${name}`);
  if (typeof implementation !== 'function') throw new Error(`legacy action ต้องเป็นฟังก์ชัน: ${name}`);
  root[name] = implementation;
  return implementation;
}

export function installLegacyBridge(root = globalThis) {
  const legacyPages = root.APServiceModulePages || {};
  Object.assign(legacyPages, {
    renderHome: (...args) => home.renderHome(root, ...args),
    renderStores: (...args) => home.renderStores(root, ...args),
    renderPromotions: (...args) => home.renderPromotions(root, ...args),
    renderOrders: (...args) => orders.renderOrders(root, ...args),
    renderAdminStores: (...args) => adminStores.renderAdminStores(root, ...args),
    renderAdminRiders: (...args) => adminRiders.renderAdminRiders(root, ...args),
    renderOperationsOrders: (...args) => adminOrders.renderOperationsOrders(root, ...args),
    renderFinance: (...args) => adminFinance.renderFinance(root, ...args),
    renderWithdrawals: (...args) => adminFinance.renderWithdrawals(root, ...args),
    renderContent: (...args) => adminContent.renderContent(root, ...args),
  });
  root.APServiceModulePages = legacyPages;
  const legacyComponents = root.APServiceModuleComponents || {};
  Object.assign(legacyComponents, {
    query: (selector) => dom.query(selector, root.document),
    queryAll: (selector) => dom.queryAll(selector, root.document),
  });
  root.APServiceModuleComponents = legacyComponents;
  const legacyServices = root.APServiceModuleServices || {};
  Object.assign(legacyServices, { storeState: storeOps.calculateStoreState });
  root.APServiceModuleServices = legacyServices;
  const legacyLocation = root.APServiceModuleLocation || {};
  Object.assign(legacyLocation, {
    mapUrl: location.mapUrl,
    locationLabel: location.formatLocationLabel,
  });
  root.APServiceModuleLocation = legacyLocation;
  const legacyUi = root.APServiceModuleUI || {};
  Object.assign(legacyUi, {
    toast: (text, tone) => ui.renderToast(text, tone, root),
    formDraft: ui.createFormDraftUX(root),
  });
  root.APServiceModuleUI = legacyUi;
  const legacyApi = root.APServiceModuleApi || {};
  Object.assign(legacyApi, { request: (path, options) => supabase.performSupabaseRequest(path, options, root) });
  root.APServiceModuleApi = legacyApi;
  const legacyCore = root.APServiceModuleCore || {};
  Object.assign(legacyCore, {
    saveAppState: (state) => storage.persistAppState(state, root.localStorage),
    isAdminState: (state) => storage.isAdminState(state),
  });
  root.APServiceModuleCore = legacyCore;
  const legacyUtilities = root.APServiceModuleUtilities || {};
  Object.assign(legacyUtilities, {
    money: money.money,
    escapeHtml: money.escapeHtml,
    nowLabel: money.nowLabel,
    todayKey: money.todayKey,
    bytesLabel: money.bytesLabel,
    compressImageForUpload: media.compressImageForUpload,
  });
  root.APServiceModuleUtilities = legacyUtilities;
  const modules = Object.freeze({
    config, storage, state: appState, api: supabase,
    services: Object.freeze({ storeOps, marketplace, supportChat, customerDelivery, categoryUX }),
    utils: Object.freeze({ money, media, location, ui }),
    components: Object.freeze({ dom }),
    pages: Object.freeze({ home, orders, admin: Object.freeze({ stores: adminStores, riders: adminRiders, orders: adminOrders, finance: adminFinance, content: adminContent }) }),
  });
  root.APServiceModules = modules;
  root.APServiceLegacyBridge = Object.freeze({ publishLegacyAction, collectMissingLegacyActions });
  return modules;
}

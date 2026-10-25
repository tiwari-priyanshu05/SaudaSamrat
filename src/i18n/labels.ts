// =============================================================================
// SaudaSamrat — i18n Labels
// All UI text in one place. Supports 'hi' (Hindi) and 'en' (English).
// =============================================================================

export type Lang = 'hi' | 'en';

const labels = {
  // App name & meta
  appName: { hi: 'सौदासम्राट', en: 'SaudaSamrat' },
  tagline: { hi: 'आपकी दुकान का हिसाब', en: "Your Shop's Ledger" },

  // Navigation
  navHome: { hi: 'होम', en: 'Home' },
  navStock: { hi: 'स्टॉक', en: 'Stock' },
  navSale: { hi: 'बिक्री', en: 'Sale' },
  navReorder: { hi: 'मंगाएं', en: 'Reorder' },
  navHistory: { hi: 'इतिहास', en: 'History' },
  navMore: { hi: 'अधिक', en: 'More' },

  // Home screen
  greeting: { hi: 'नमस्ते', en: 'Namaste' },
  homeTitle: { hi: 'आज का हिसाब', en: "Today's Summary" },
  totalProducts: { hi: 'कुल सामान', en: 'Total Items' },
  lowStockProducts: { hi: 'कम स्टॉक', en: 'Low Stock' },
  todaySales: { hi: 'आज बिके', en: "Today's Sales" },
  quickSaleBtn: { hi: 'नई बिक्री', en: 'Quick Sale' },
  addStockBtn: { hi: 'सामान जोड़ें', en: 'Add Item' },
  recentActivity: { hi: 'हाल की गतिविधि', en: 'Recent Activity' },
  noActivity: { hi: 'अभी तक कोई बिक्री नहीं', en: 'No sales yet' },
  emptyShopTitle: { hi: 'आपकी दुकान खाली है', en: 'Your shop is empty' },
  emptyShopMsg: {
    hi: 'पहले सामान जोड़ें, फिर बिक्री दर्ज करें।',
    en: 'Add your first item to get started.',
  },
  lowStockAlertHeader: { hi: 'कम स्टॉक अलर्ट', en: 'Low Stock Alerts' },
  viewAll: { hi: 'सभी देखें', en: 'View All' },
  viewReorder: { hi: 'मंगाने की लिस्ट देखें', en: 'View Reorder List' },
  needToOrder: { hi: 'मंगाना होगा', en: 'Need' },

  // Stock screen
  stockTitle: { hi: 'मेरा स्टॉक', en: 'My Stock' },
  searchPlaceholder: { hi: 'सामान खोजें...', en: 'Search items...' },
  addProduct: { hi: 'सामान जोड़ें', en: 'Add Item' },
  editProduct: { hi: 'बदलें', en: 'Edit' },
  archiveProduct: { hi: 'हटाएं', en: 'Archive' },
  adjustStock: { hi: 'स्टॉक ठीक करें', en: 'Adjust Stock' },
  noProducts: { hi: 'कोई सामान नहीं मिला', en: 'No items found' },
  noProductsSearchDesc: {
    hi: 'दूसरे नाम या श्रेणी से खोजें या फ़िल्टर हटाएं।',
    en: 'Try searching with a different name or clear the filters.',
  },
  allCategories: { hi: 'सभी सामान', en: 'All Items' },
  lowStockFilter: { hi: 'कम स्टॉक', en: 'Low Stock' },
  inStock: { hi: 'उपलब्ध', en: 'In Stock' },
  outOfStock: { hi: 'खत्म हो गया', en: 'Out of Stock' },
  minStockLabel: { hi: 'न्यूनतम', en: 'Min' },

  // Product form
  productName: { hi: 'सामान का नाम', en: 'Item Name' },
  category: { hi: 'किस्म (Category)', en: 'Category' },
  quantity: { hi: 'मात्रा', en: 'Quantity' },
  unit: { hi: 'इकाई', en: 'Unit' },
  lowStockThreshold: { hi: 'कम स्टॉक सीमा', en: 'Low Stock Limit' },
  save: { hi: 'सहेजें', en: 'Save' },
  cancel: { hi: 'रद्द करें', en: 'Cancel' },
  required: { hi: 'जरूरी है', en: 'Required' },

  // Units
  unitPiece: { hi: 'पीस', en: 'Piece' },
  unitPacket: { hi: 'पैकेट', en: 'Packet' },
  unitBottle: { hi: 'बोतल', en: 'Bottle' },
  unitKg: { hi: 'किलो', en: 'kg' },
  unitG: { hi: 'ग्राम', en: 'g' },
  unitLitre: { hi: 'लीटर', en: 'Litre' },
  unitMl: { hi: 'मिली', en: 'ml' },
  unitDozen: { hi: 'दर्जन', en: 'Dozen' },

  // Default Categories
  catGrocery: { hi: 'किराना व राशन', en: 'Grocery' },
  catDairy: { hi: 'डेयरी व दूध', en: 'Dairy' },
  catSnacks: { hi: 'नाश्ता व स्नैक्स', en: 'Snacks' },
  catBeverages: { hi: 'पेय व शरबत', en: 'Beverages' },
  catPersonalCare: { hi: 'पर्सनल केयर', en: 'Personal Care' },
  catHousehold: { hi: 'घरेलू सामान', en: 'Household' },
  catStationery: { hi: 'स्टेशनरी व पुस्तकें', en: 'Stationery' },
  catMedicines: { hi: 'दवाइयाँ व स्वास्थ्य', en: 'Medicines' },
  catOther: { hi: 'अन्य सामान', en: 'Other' },

  // Category Configuration
  categoriesTitle: { hi: 'दुकान की श्रेणियाँ', en: 'Shop Categories' },
  categoriesDesc: {
    hi: 'अपनी दुकान के अनुसार श्रेणियाँ प्रबंधित करें (किराना, स्टेशनरी, मेडिकल आदि)',
    en: 'Manage categories suited for your retail store (Kirana, Stationery, Medical, etc.)',
  },
  customCategory: { hi: 'नई श्रेणी', en: 'Custom Category' },
  addCategory: { hi: 'श्रेणी जोड़ें', en: 'Add Category' },
  addNewCategoryOption: { hi: '+ नई श्रेणी जोड़ें...', en: '+ Add new category...' },
  addCategoryPlaceholder: {
    hi: 'श्रेणी का नाम लिखें (जैसे: स्टेशनरी, पूजा सामान)',
    en: 'Enter category name (e.g. Stationery, Puja Items)',
  },
  categoryExists: { hi: 'यह श्रेणी पहले से मौजूद है', en: 'This category already exists' },
  categoryAdded: { hi: 'श्रेणी जुड़ गई! ✓', en: 'Category added! ✓' },
  categoryRemoved: { hi: 'श्रेणी हटा दी गई', en: 'Category removed' },
  settingsShopProfile: { hi: 'दुकानदार प्रोफ़ाइल', en: 'Shop Profile' },
  restockAction: { hi: 'स्टॉक बढ़ाएं', en: 'Restock' },
  recordSaleAction: { hi: 'बिक्री करें', en: 'Record Sale' },
  clearFilters: { hi: 'फ़िल्टर हटाएं', en: 'Clear Filters' },

  // Quick Sale
  saleTitle: { hi: 'नई बिक्री', en: 'Quick Sale' },
  selectProduct: { hi: 'सामान चुनें', en: 'Select Item' },
  saleQty: { hi: 'कितना बेचा?', en: 'Quantity Sold' },
  confirmSale: { hi: 'बिक्री पक्की करें', en: 'Confirm Sale' },
  saleSuccess: { hi: 'बिक्री दर्ज हो गई! ✓', en: 'Sale recorded! ✓' },
  insufficientStock: { hi: 'इतना स्टॉक नहीं है', en: 'Not enough stock' },
  available: { hi: 'उपलब्ध', en: 'Available' },
  remaining: { hi: 'बचेगा', en: 'Will remain' },
  quickPresets: { hi: 'जल्दी मात्रा चुनें', en: 'Quick Presets' },
  nextSale: { hi: 'अगली बिक्री', en: 'Next Sale' },
  goHome: { hi: 'होम पर जाएं', en: 'Go to Home' },
  backBtn: { hi: 'पीछे', en: 'Back' },
  nextBtn: { hi: 'आगे →', en: 'Next →' },

  // Reorder
  reorderTitle: { hi: 'दोबारा मंगाएं', en: 'Reorder' },
  lowStockTitle: { hi: 'कम स्टॉक', en: 'Low Stock' },
  slowMovingTitle: { hi: 'काफी दिन से नहीं बिका', en: 'Not Sold Recently' },
  noLowStock: { hi: 'सब स्टॉक ठीक है! 🎉', en: 'All stock is good! 🎉' },
  noLowStockDesc: {
    hi: 'सभी सामानों का स्टॉक अभी पर्याप्त है।',
    en: 'All inventory levels are currently in good standing.',
  },
  noSlowMoving: { hi: 'कोई बेकार स्टॉक नहीं', en: 'No slow-moving stock' },
  currentStock: { hi: 'अभी है', en: 'In stock' },
  minStock: { hi: 'कम से कम चाहिए', en: 'Minimum needed' },
  neverSold: { hi: 'कभी नहीं बिका', en: 'Never sold' },
  lastSold: { hi: 'आखिरी बार बिका', en: 'Last sold' },
  whyListed: { hi: 'कारण', en: 'Why listed' },
  deficitAmount: { hi: 'कमी', en: 'Deficit' },
  calcLimitMinusStock: { hi: 'न्यूनतम सीमा − अभी का स्टॉक', en: 'Limit − Current Stock' },
  noSales30Days: { hi: 'पिछले 30 दिनों में कोई बिक्री नहीं', en: 'Items with 0 sales in the last 30 days' },
  slowBadge: { hi: 'धीमी बिक्री', en: 'Slow' },
  noSalesInDays: { hi: 'दिनों में कोई बिक्री नहीं', en: 'days with no sales' },

  // History
  historyTitle: { hi: 'बिक्री इतिहास', en: 'Sales History' },
  totalSalesCount: { hi: 'कुल बिक्री संख्या', en: 'Total Sales Count' },
  noHistory: { hi: 'कोई बिक्री नहीं', en: 'No sales recorded' },
  noHistoryDesc: {
    hi: 'दुकान में हुई बिक्री का हिसाब यहाँ तारीख के अनुसार दिखेगा।',
    en: 'Completed sales transactions will appear here chronologically.',
  },
  sold: { hi: 'बेचा', en: 'Sold' },
  today: { hi: 'आज', en: 'Today' },
  yesterday: { hi: 'कल', en: 'Yesterday' },

  // More / Settings
  moreTitle: { hi: 'दुकान सेटिंग्स व जानकारी', en: 'Shop Settings & Info' },
  shopName: { hi: 'दुकान का नाम', en: 'Shop Name' },
  ownerName: { hi: 'दुकानदार का नाम', en: 'Shop Owner Name' },
  ownerRole: { hi: 'दुकानदार', en: 'Shop Owner' },
  yourShop: { hi: 'आपकी दुकान', en: 'Your Shop' },
  setupProfile: { hi: 'प्रोफ़ाइल सेट करें', en: 'Set Up Profile' },
  setupProfileDesc: {
    hi: 'होम स्क्रीन को निजीकृत करने के लिए अपना नाम और दुकान जोड़ें',
    en: 'Add your name and shop name to personalize your dashboard',
  },
  editProfile: { hi: 'प्रोफ़ाइल बदलें', en: 'Edit Profile' },
  profileTitle: { hi: 'दुकानदार प्रोफ़ाइल', en: 'Shop Owner Profile' },
  ownerNamePlaceholder: { hi: 'जैसे: राहुल शर्मा', en: 'e.g. Rahul Sharma' },
  shopNamePlaceholder: { hi: 'जैसे: शर्मा किराना स्टोर', en: 'e.g. Sharma Kirana Store' },
  profileStorageNotice: {
    hi: 'यह जानकारी केवल इसी डिवाइस के ब्राउज़र में सुरक्षित रहती है।',
    en: 'Stored securely on this device only.',
  },
  defaultShopName: { hi: 'मेरी किराना दुकान', en: 'My Kirana Store' },
  editShopName: { hi: 'नाम बदलें', en: 'Change Name' },
  language: { hi: 'भाषा चुनें', en: 'Language' },
  langHindi: { hi: 'हिंदी', en: 'Hindi' },
  langEnglish: { hi: 'English', en: 'English' },
  offlineStatus: { hi: 'ऑफलाइन सुविधा', en: 'Offline Status' },
  offlineReady: { hi: 'लोकल डिवाइस स्टोरेज (ऑफलाइन)', en: 'Local Device Storage (Offline)' },
  offlineDesc: {
    hi: 'इंटरनेट की जरूरत नहीं। आपका सारा डेटा इसी फोन के लोकल ब्राउज़र डेटाबेस में रहता है। ब्राउज़र साइट डेटा साफ़ करने पर रिकॉर्ड हट सकते हैं।',
    en: 'No internet required. All records are stored locally in this device’s browser storage. Note: clearing browser site data will erase records.',
  },
  databaseSummary: { hi: 'डेटा का हिसाब', en: 'Data Overview' },
  totalAuditsCount: { hi: 'स्टॉक सुधार रिकॉर्ड', en: 'Stock Adjustments Logged' },
  kiranaTips: { hi: 'दुकानदारों के लिए खास बातें', en: 'Tips for Kirana Owners' },
  tipOffline: {
    hi: 'इंटरनेट बंद होने पर भी आपकी दुकान का हिसाब चलता रहेगा। सारा डेटा इसी फोन में रहता है (ब्राउज़र साइट डेटा साफ़ न करें)।',
    en: 'Even without internet, store operations continue smoothly. Data is stored locally on this phone (avoid clearing browser site data).',
  },
  tipReorder: {
    hi: 'कम स्टॉक सीमा सेट करें ताकि सामान खत्म होने से पहले WhatsApp पर सप्लायर को आर्डर भेज सकें।',
    en: 'Set low stock limits so you can send WhatsApp orders to your supplier before items run out.',
  },
  saveChanges: { hi: 'सहेजें', en: 'Save' },

  // Errors & feedback
  errorRequired: { hi: 'यह खाना भरना जरूरी है', en: 'This field is required' },
  errorOwnerNameRequired: { hi: 'दुकानदार का नाम भरना जरूरी है', en: 'Shop owner name is required' },
  errorShopNameRequired: { hi: 'दुकान का नाम भरना जरूरी है', en: 'Shop name is required' },
  errorNameTooLong: { hi: 'नाम बहुत लंबा है (अधिकतम 50 अक्षर)', en: 'Owner name cannot exceed 50 characters' },
  errorShopNameTooLong: { hi: 'दुकान का नाम बहुत लंबा है (अधिकतम 60 अक्षर)', en: 'Shop name cannot exceed 60 characters' },
  profileUpdatedSuccess: { hi: 'प्रोफ़ाइल सुरक्षित हो गई! ✓', en: 'Profile saved! ✓' },
  errorNegative: { hi: 'शून्य से ज्यादा होनी चाहिए', en: 'Must be greater than zero' },
  errorExceedsStock: { hi: 'स्टॉक से ज्यादा नहीं हो सकता', en: 'Cannot exceed available stock' },
  errorGeneric: { hi: 'कुछ गड़बड़ हुई, दोबारा कोशिश करें', en: 'Something went wrong, please try again' },
  confirmArchive: {
    hi: 'क्या आप वाकई इस सामान को हटाना चाहते हैं? पुरानी बिक्री सुरक्षित रहेगी।',
    en: 'Archive this item? Past sales will be preserved.',
  },
  confirm: { hi: 'हाँ', en: 'Confirm' },
  productAddedSuccess: { hi: 'सामान जुड़ गया! ✓', en: 'Item added! ✓' },
  productUpdatedSuccess: { hi: 'सामान बदल गया! ✓', en: 'Item updated! ✓' },
  productArchivedSuccess: { hi: 'सामान हटा दिया गया! ✓', en: 'Item archived! ✓' },
  stockAdjustSuccess: { hi: 'स्टॉक ठीक हो गया! ✓', en: 'Stock adjusted! ✓' },

  // Stock adjustment
  adjustmentDelta: { hi: 'बदलाव की मात्रा', en: 'Adjustment amount' },
  adjustmentReason: { hi: 'कारण', en: 'Reason' },
  reasonManual: { hi: 'सुधार', en: 'Manual correction' },
  reasonRestock: { hi: 'नया स्टॉक', en: 'Restock' },
  reasonDamage: { hi: 'खराब/टूटा', en: 'Damage / Loss' },
  reasonReturn: { hi: 'वापसी', en: 'Return' },
  directionAdd: { hi: '+ जोड़ें', en: '+ Add' },
  directionRemove: { hi: '− घटाएं', en: '− Remove' },
  noteOptional: { hi: 'टिप्पणी (वैकल्पिक)', en: 'Note (optional)' },
  notePlaceholder: { hi: 'इस बदलाव के बारे में कोई टिप्पणी', en: 'Any note about this adjustment' },

  // Misc
  loading: { hi: 'लोड हो रहा है...', en: 'Loading...' },
  days: { hi: 'दिन', en: 'days' },
  ago: { hi: 'पहले', en: 'ago' },
  items: { hi: 'चीजें', en: 'items' },
  shareWhatsApp: { hi: 'WhatsApp पर भेजें', en: 'Share on WhatsApp' },

  // Backup & Restore
  backupRestoreTitle: { hi: 'डेटा बैकअप व रीस्टोर', en: 'Data Backup & Restore' },
  backupRestoreDesc: {
    hi: 'अपनी दुकान का सारा डेटा सुरक्षित डाउनलोड करें या बैकअप फ़ाइल से वापस लाएं।',
    en: 'Securely export shop data or restore from a backup file without internet.',
  },
  exportBackupBtn: { hi: 'बैकअप डाउनलोड करें', en: 'Download Backup' },
  restoreBackupBtn: { hi: 'बैकअप रीस्टोर करें', en: 'Restore from File' },
  exportSuccess: { hi: 'बैकअप डाउनलोड हो गया! ✓', en: 'Backup file exported! ✓' },
  restorePreviewTitle: { hi: 'बैकअप का विवरण', en: 'Backup Details (Preview)' },
  restoreModeTitle: { hi: 'रीस्टोर का तरीका चुनें', en: 'Choose Restore Mode' },
  restoreModeMerge: { hi: 'सुरक्षित जोड़ें (Merge)', en: 'Merge with Existing' },
  restoreModeMergeDesc: {
    hi: 'वर्तमान सामान रहेगा और बैकअप का डेटा जुड़ जाएगा। कोई डेटा डिलीट नहीं होगा।',
    en: 'Keeps existing records and merges items from backup safely without deleting.',
  },
  restoreModeReplace: { hi: 'पूरा बदलें (Replace)', en: 'Replace Everything' },
  restoreModeReplaceDesc: {
    hi: 'चेतावनी: वर्तमान सारा डेटा हटाकर बैकअप फ़ाइल का डेटा डाला जाएगा।',
    en: 'Warning: Wipes current shop data and replaces it entirely with the backup.',
  },
  confirmRestore: { hi: 'रीस्टोर पक्का करें', en: 'Confirm Restore' },
  restoreSuccess: { hi: 'डेटा सफलतापूर्वक रीस्टोर हो गया! ✓', en: 'Data restored successfully! ✓' },
  restoreFailed: { hi: 'रीस्टोर नहीं हो सका', en: 'Restore failed' },
  invalidBackupFile: { hi: 'अमान्य बैकअप फ़ाइल', en: 'Invalid backup file' },
  backupContains: { hi: 'बैकअप में उपलब्ध रिकॉर्ड्स', en: 'Records in this backup' },
  backupTimestamp: { hi: 'बैकअप का समय', en: 'Backup Created' },
  backupShopName: { hi: 'दुकान का नाम', en: 'Shop' },

  // Stock Movement History & Undo
  movementAll: { hi: 'सभी बदलाव', en: 'All Activity' },
  movementSales: { hi: 'बिक्री', en: 'Sales' },
  movementAdjustments: { hi: 'स्टॉक सुधार व आवक', en: 'Stock Adjustments' },
  undoAction: { hi: 'वापस लें', en: 'Undo' },
  confirmUndoTitle: { hi: 'क्या यह बदलाव वापस लेना है?', en: 'Undo this transaction?' },
  confirmUndoDesc: {
    hi: 'यह बदलाव वापस करने से दुकान का स्टॉक स्वतः ठीक हो जाएगा और इसका हिसाब दर्ज रहेगा।',
    en: 'Reversing this operation will safely adjust the inventory balance and record an audit reversal.',
  },
  undoSuccess: { hi: 'बदलाव वापस ले लिया गया! ✓', en: 'Transaction reversed successfully! ✓' },
  undoFailed: { hi: 'बदलाव वापस नहीं हो सका', en: 'Could not undo transaction' },
  alreadyReversed: { hi: 'वापस लिया गया', en: 'Reversed' },
  cannotUndo: { hi: 'वापस नहीं हो सकता', en: 'Cannot undo' },
  reversal: { hi: 'वापसी (Reversal)', en: 'Reversal' },
  restocked: { hi: 'नया माल आया', en: 'Restocked' },
  adjusted: { hi: 'स्टॉक बदला', en: 'Adjusted' },
  stockMovementTimeline: { hi: 'स्टॉक इतिहास', en: 'Stock Movement Timeline' },

  // Bulk Stock Receiving
  bulkReceiveTitle: { hi: 'थोक माल आवक', en: 'Bulk Stock Receiving' },
  bulkReceiveDesc: {
    hi: 'एक साथ कई सामानों का नया आया हुआ स्टॉक दर्ज करें।',
    en: 'Receive multiple inventory items in a single atomic batch.',
  },
  bulkReceiveBtn: { hi: 'माल आवक', en: 'Receive Stock' },
  addItemsToReceive: { hi: 'आया हुआ सामान चुनें', en: 'Select Received Items' },
  receivedQty: { hi: 'आई हुई मात्रा', en: 'Received Quantity' },
  newStockPreview: { hi: 'नया स्टॉक होगा', en: 'New Stock' },
  receivingSummary: { hi: 'आवक का विवरण', en: 'Receiving Summary' },
  confirmReceive: { hi: 'माल दर्ज करें', en: 'Confirm Receiving' },
  receiveSuccess: { hi: 'माल सफलतापूर्वक जुड़ गया! ✓', en: 'Stock received successfully! ✓' },
  noItemsSelected: { hi: 'कम से कम एक सामान चुनें', en: 'Please select at least one item' },

  // Smart Reorder & Supplier Order (Phases 4 & 5)
  smartReorderTitle: { hi: 'स्मार्ट रीऑर्डर सुझाव', en: 'Smart Reorder' },
  observationWindow: { hi: 'बिक्री का समय', en: 'Sales Window' },
  targetCoverage: { hi: 'लक्ष्य स्टॉक', en: 'Target Days Cover' },
  estimatedCoverRemaining: { hi: 'बचा हुआ स्टॉक चलेगा', en: 'Est. Cover Left' },
  suggestedOrder: { hi: 'सुझाव अनुसार मंगाएं', en: 'Suggested Order' },
  dismissRecommendation: { hi: 'छिपाएं', en: 'Dismiss' },
  createSupplierOrder: { hi: 'आर्डर लिस्ट बनाएं', en: 'Create Order List' },
  supplierNameOptional: { hi: 'सप्लायर / डीलर का नाम (वैकल्पिक)', en: 'Supplier / Dealer Name (optional)' },
  supplierNamePlaceholder: { hi: 'जैसे: अग्रवाल होलसेल किराना', en: 'e.g. Agarwal Wholesale Kirana' },
  reviewAndShare: { hi: 'आर्डर रिव्यू व शेयर', en: 'Review & Share Order' },
  copyOrderText: { hi: 'आर्डर कॉपी करें', en: 'Copy Order Text' },
  orderCopied: { hi: 'आर्डर कॉपी हो गया! ✓', en: 'Order copied to clipboard! ✓' },
  whatsappDisclaimer: {
    hi: 'ध्यान दें: WhatsApp खुलना आर्डर पहुंचने की गारंटी नहीं है। कृपया सप्लायर से पुष्टि करें।',
    en: 'Note: Opening WhatsApp does not confirm delivery. Please verify receipt with your supplier.',
  },
  sufficientHistoryFlag: { hi: 'नया सामान — बिक्री का हिसाब बन रहा है', en: 'New item — sales history building' },

  // Daily Summary & Trends (Phase 6)
  dailySummaryHeading: { hi: 'दैनिक गतिविधि विवरण', en: 'Daily Business Overview' },
  salesTransactions: { hi: 'बिक्री ट्रांजैक्शन', en: 'Sales Transactions' },
  unitsSoldLabel: { hi: 'मात्रा अनुसार कुल बिक्री', en: 'Total Sold by Unit' },
  topSellingItems: { hi: 'आज के प्रमुख बिके सामान', en: 'Top Sold Items Today' },
  stockReceivedToday: { hi: 'नया माल आया', en: 'Restocked Today' },
  adjustmentsToday: { hi: 'स्टॉक सुधार', en: 'Corrections' },
  yesterdayComparison: { hi: 'कल की तुलना में', en: 'vs. Yesterday' },

  // Barcode Lookup & Scanning (Phase 7)
  barcodeLabel: { hi: 'बारकोड (वैकल्पिक)', en: 'Barcode (optional)' },
  barcodePlaceholder: { hi: 'बारकोड नंबर लिखें या स्कैन करें', en: 'Enter or scan barcode' },
  scanBarcode: { hi: 'बारकोड स्कैन', en: 'Scan Barcode' },
  scanBarcodeTitle: { hi: 'बारकोड स्कैनर व खोज', en: 'Barcode Scanner & Search' },
  barcodeFound: { hi: 'सामान मिल गया!', en: 'Product found!' },
  barcodeNotFound: { hi: 'इस बारकोड का कोई सामान नहीं मिला', en: 'No product matches this barcode' },
  cameraUnavailable: {
    hi: 'कैमरा उपलब्ध नहीं है। आप सीधे बारकोड नंबर लिख सकते हैं।',
    en: 'Camera unavailable. You can enter the barcode number manually.',
  },
  duplicateBarcodeError: {
    hi: 'यह बारकोड पहले से दूसरे सामान पर दर्ज है',
    en: 'This barcode is already assigned to another item',
  },

  // Batch & Expiry Tracking (Phase 8)
  batchesTitle: { hi: 'बैच व एक्सपायरी विवरण', en: 'Batches & Expiry' },
  addBatch: { hi: 'नया बैच जोड़ें', en: 'Add Batch' },
  batchNumber: { hi: 'बैच नंबर', en: 'Batch No.' },
  expiryDate: { hi: 'एक्सपायरी तारीख', en: 'Expiry Date' },
  daysRemaining: { hi: 'दिन शेष', en: 'Days Left' },
  statusGood: { hi: 'सुरक्षित (अच्छा)', en: 'Fresh / Good' },
  statusExpiringSoon: { hi: 'जल्द एक्सपायर होगा', en: 'Expiring Soon' },
  statusExpired: { hi: 'एक्सपायर हो चुका!', en: 'Expired!' },
  writeOffBatch: { hi: 'बैच नष्ट / रद्द करें', en: 'Write-off Batch' },
  expiredSaleWarning: {
    hi: 'चेतावनी: इस सामान का एक्सपायर बैच मौजूद है! कृपया एक्सपायर माल न बेचें।',
    en: 'Warning: Expired batch detected for this product! Ensure you do not sell expired stock.',
  },
  confirmExpiredSale: {
    hi: 'मैंने एक्सपायरी चेक कर ली है और आगे बढ़ना चाहता हूँ',
    en: 'I verified the stock and want to proceed',
  },
  noBatches: { hi: 'कोई बैच दर्ज नहीं है', en: 'No batches recorded' },
  batchQuantity: { hi: 'बैच मात्रा', en: 'Batch Quantity' },
  batchAddedSuccess: { hi: 'नया बैच दर्ज हो गया!', en: 'Batch added successfully!' },
  batchWriteOffSuccess: { hi: 'बैच हटा दिया गया और स्टॉक कम कर दिया गया', en: 'Batch written off & stock adjusted' },
  invalidExpiryDate: { hi: 'अमान्य तारीख (YYYY-MM-DD प्रारूप का उपयोग करें)', en: 'Invalid date (Use YYYY-MM-DD format)' },

  // Voice Assisted Entry (Phase 9)
  voiceSale: { hi: 'बोलकर बिक्री दर्ज करें', en: 'Voice Sale Entry' },
  listening: { hi: 'सुन रहे हैं... बोलिए (जैसे: "2 किलो चीनी")', en: 'Listening... speak now (e.g. "2 kg sugar")' },
  voiceUnsupported: {
    hi: 'आपके ब्राउज़र में बोलकर इनपुट समर्थित नहीं है। कृपया मैन्युअल दर्ज करें।',
    en: 'Speech recognition is not supported in this browser. Please enter manually.',
  },
  voiceHelp: {
    hi: 'बोलें: "सामान की मात्रा + नाम" (उदाहरण: "5 पैकेट मैगी", "1 किलो नमक", "दो साबुन")',
    en: 'Say: "Quantity + Item Name" (e.g., "5 packets maggi", "1 kg salt", "2 soaps")',
  },
  voiceReviewConfirm: { hi: 'आवाज से पहचाना गया सामान रिव्यू करें', en: 'Review Voice Detected Sale' },
  startListening: { hi: 'माइक चालू करें', en: 'Start Voice Input' },
  stopListening: { hi: 'माइक बंद करें', en: 'Stop Listening' },
  parsedQuantity: { hi: 'पहचानी गई मात्रा', en: 'Detected Quantity' },
  parsedProduct: { hi: 'पहचाना गया सामान', en: 'Detected Product' },
} as const;

export type LabelKey = keyof typeof labels;
export type Translator = (key: LabelKey) => string;

// Simple hook-like getter — call t('key') to get a label
export function createTranslator(lang: Lang): Translator {
  return function t(key: LabelKey): string {
    return labels[key][lang];
  };
}

export { labels };

# Contributing to SaudaSamrat 👑

Thank you for your interest in contributing to SaudaSamrat. We are building a dependable, offline-first inventory and sales assistant for Indian kirana store owners.

---

## 🛠️ Development Workflow & Available Scripts

Before contributing, ensure you have Node.js $\ge 18.0.0$ and npm $\ge 9.0.0$ installed.

### Available Scripts (from `package.json`)

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run dev` | `vite` | Starts local development server with Hot Module Replacement. |
| `npm run build` | `tsc -b && vite build` | Typechecks via TypeScript and compiles production PWA bundle. |
| `npm run preview` | `vite preview` | Serves the production bundle locally (defaults to port 4173). |
| `npm test` | `vitest run` | Runs the full automated test suite once. |
| `npm run test:watch` | `vitest` | Runs Vitest in interactive file-watching mode during active development. |
| `npm run test:ui` | `vitest --ui` | Launches interactive browser UI for exploring tests. |
| `npm run typecheck` | `tsc --noEmit` | Validates TypeScript types across the entire project without emitting JavaScript. |
| `npm run lint` | `oxlint src` | Performs fast static code analysis with Oxlint. |

---

## 📐 Architecture & Architectural Guidelines

### 1. Database & Service Layer Isolation
- **Rule:** React components must **never** directly invoke Dexie table methods (`db.products.*`, `db.sales.*`, etc.).
- **Requirement:** All business logic, validation, calculations, and data access must live inside `src/services/index.ts`.
- Components should only call exported service functions (`addProduct`, `updateProduct`, `recordSale`, `adjustStock`, `getLowStockProducts`, etc.).

### 2. Atomic Database Transactions & Integrity
- All multi-table updates (e.g. updating product quantity while logging a sale or stock adjustment) must be wrapped in an atomic Dexie transaction:
  ```ts
  await db.transaction('rw', db.products, db.sales, async () => {
    await db.products.put(updatedProduct);
    await db.sales.add(saleRecord);
  });
  ```
- This guarantees that stock balances and audit history never diverge if a failure or exception occurs mid-operation.

### 3. Strict Bilingual Parity (Hindi + English)
- SaudaSamrat is built primarily for Hindi-speaking shopkeepers while retaining full English support.
- **Rule:** Never hardcode user-facing strings in UI components.
- **Requirement:** Add all labels, button titles, metrics, and toast messages to `src/i18n/labels.ts` under both `hi` and `en` keys.
- Call strings using `const { t } = useLang();` and `t('labelKey')`.

### 4. Input Validation & Numeric Precision
- Inventory calculations involve fractional quantities (e.g. `0.25 kg`, `0.5 L`).
- Always apply standard decimal rounding (`+(val).toFixed(6)`) on calculated stock and deficits to prevent floating-point drift (e.g. `0.2999999999999998`).
- Never allow negative stock, overselling, or `NaN` deltas.

---

## 🧪 Pre-Pull Request Checklist

Before submitting any code changes, ensure all verification steps pass locally:
```bash
# 1. Typecheck
npm run typecheck

# 2. Run all tests
npm test

# 3. Lint check
npm run lint

# 4. Production build
npm run build
```

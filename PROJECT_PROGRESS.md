# Garage Workspace — Project Progress

Last updated: 26 October 2026
Project folder: `D:\Garage System`

## Current status

The frontend prototype has an opening splash screen, a CRM dashboard, POS Billing, a New Intake screen, Quotations, Invoices, Vehicles, Customers, Parts Inventory, Mechanics, and Reports workspaces, a frontend Repair Done work-order view, an invoice stage, and payment/balance tracking. These screens can be selected in the sidebar. Work Orders management and Settings remain placeholders. Development is proceeding step by step from user-supplied screenshots.

## Stack and project map

- React 18, Vite 6, TypeScript with TSX and strict checks.
- Tailwind CSS 4 through the Vite plugin; custom component styles and responsive rules in `src/index.css`.
- Lucide React icons. Functional components, React state and effects.
- Frontend only: no backend, database, APIs, authentication, or payment gateway.

```text
public/garage-workspace-logo.png   Original logo asset
src/main.tsx                       React entry point
src/App.tsx                        Shared shell, navigation, CRM dashboard, preview dialogs
src/components/SplashScreen.tsx    Opening loading animation
src/components/NewIntake.tsx       New work-order intake form and live document preview
src/components/Quotations.tsx      Quotation summary, searchable list, details and approval actions
src/components/Invoices.tsx        Invoice summary, searchable list, details and local payment actions
src/components/Vehicles.tsx        Vehicle summary, searchable list, details and service history
src/components/Customers.tsx       Customer summary, searchable list, details and service history
src/components/PartsInventory.tsx  Inventory summary, searchable parts list, details and stock activity
src/components/Mechanics.tsx       Mechanic summary, searchable roster, profile and assignments
src/components/Reports.tsx         Report KPIs, revenue trend, work-order status and team performance
src/components/PosBilling.tsx      POS catalog, cart, payment UI, drafts and receipts
src/lib/billing.ts                 Integer-cent invoice calculations
src/index.css                      Tailwind import, splash and application styles
tests/billing.mjs                  Billing calculation checks using existing TypeScript dependency
index.html                        Page title and theme color
package.json                      Dependencies and npm scripts
tsconfig.json                     TypeScript configuration
vite.config.ts                    React and Tailwind Vite plugins
.gitignore                        Excludes dependencies, build output and local generated files
```

## Completed features

### Splash screen

- Full-screen dark navy background with the existing white/orange Garage Workspace logo.
- Responsive centered logo, smooth fade-in, thin animated orange loading bar.
- Fade-out begins after 2.5 seconds and lasts 700 ms, revealing the application.
- Uses `useState` and `useEffect`; timers are cleaned up and reduced-motion preferences are supported.
- The original blank placeholder has now been replaced by the dashboard as subsequently requested.

### Shared application shell

- Navy sidebar with original logo, Lucide navigation icons and orange active selection.
- Dashboard/POS switching uses React state; no routing package or URL routes.
- Responsive mobile sidebar with menu toggle and dismissible backdrop.
- Header search, Ctrl/Cmd+K search shortcut, notification popover and owner profile preview.
- Footer styled to match the reference, with status, timezone, version, help and support controls.
- Toast feedback and frontend placeholder dialogs for unfinished modules.
- Latest requested change: only the sidebar scrollbar is hidden through CSS. The sidebar itself remains visible and scrollable.

### CRM dashboard

- Summary cards for active jobs, awaiting signatures, ready vehicles, revenue and pending quotations.
- Searchable work orders, status tabs, mechanic avatars, status badges and work-order detail dialogs.
- Sample quotations with approve/reject actions; pending count and quotation total update in memory.
- POS/invoice summary, quick actions, low-stock list and activity timeline.
- Dashboard preview forms for future workflows explicitly state that they do not save records.
- Removed the four circled buttons from the dashboard billing card at the user's request: New Invoice, Quick Bill, Service Sale and Parts Sale. Keep them removed.

### POS Billing

- Dedicated sidebar destination matching the second supplied screenshot's overall layout.
- Customer selector, editable phone/vehicle/plate fields and optional work-order selector.
- Service Sale / Parts Sale / Mixed Bill tabs; category filters and catalog search.
- Nine sample service/part products; click a product to add it or increment its cart quantity.
- Invoice table with quantity controls, editable line discounts, calculated taxes/totals, item removal and Clear All.
- Quantities limited to 1–999; discounts limited to the line gross amount.
- Billing summary with parts/services gross amounts, subtotal, discounts, 5% demo VAT and grand total.
- Cash, Card and Bank payment choices. Cash checks for insufficient received amount and shows change or amount due. Split payment was removed at the user's request.
- Generate Invoice creates a local demo invoice, adds it to recent invoices, clears the cart and opens a receipt dialog. No real payment is processed.
- Recent invoice list, receipt viewing, browser printing and plain-text invoice downloads.
- New walk-in sale, sample work-order bill loading, add-customer dialog, save draft and resume draft.
- POS dialog Escape handling, focus trapping/restoration and background scroll locking.
- Cart/customer state remains mounted when switching between Dashboard and POS during the same session.

### New Intake

- Added a responsive intake screen matching the supplied New Intake reference and the existing Garage Workspace shell.
- Sidebar navigation and the dashboard New Intake quick action open the screen without changing the existing dashboard or POS behavior.
- Work-order number, date, advisor, source, priority, status, completion dates, notes and mechanic fields update the document preview.
- The first step's Next button opens a Customer Details step matching the supplied follow-up reference; Back returns to Work Order Information.
- Customer Details supports editable customer/contact fields, New Customer and Existing Customer modes, sample existing-customer selection, and local sample history cards.
- Customer Details Next opens a Car Details step based on the supplied vehicle reference; Back returns to Customer Details. The vehicle form includes plate, make/model, year/color, chassis/engine numbers, mileage, fuel, transmission, vehicle/body type, registration/insurance expiry, notes, and vehicle history.
- New/existing vehicle modes and existing sample-vehicle selection are frontend-only. Vehicle fields update the document preview and are included in the saved intake draft.
- Car Details Next opens a Customer Complaint step based on the supplied reference; Back returns to Car Details. It includes a 500-character complaint field, searchable common-complaint chips, selectable requested services, and additional notes.
- Complaint text and service selections update the document preview and persist in the local intake draft. Earlier saved draft formats remain loadable.
- Customer Complaint Next opens a Quotation step based on the supplied reference; Back returns to Customer Complaint. It has External Parts, Labour Charges, and Additional Charges tabs with add/remove rows and editable customer notes.
- The quotation summary calculates parts, labour, additional charges, discount, and final QAR total; sample rows total QAR 2,200. Quotation line items, totals inputs, and notes are saved in the intake draft and reflected in the document preview.
- All intake date controls display a consistent DD/MM/YYYY format, support typing and calendar selection, and validate actual dates before updating the saved value. The vehicle expiry date fields receive additional desktop width to match the reference.
- The document preview reflects the selected/entered customer. Intake drafts retain the current step plus work-order and customer form data.
- Removed the Garage Workspace logo from all New Intake document previews (Work Order, Quotation, Invoice, Gate Pass, repair summary, and payment preview) while keeping the application sidebar branding and original favicon unchanged.
- Added Work Order, Quotation, Invoice and Gate Pass preview tabs, save-draft feedback, browser printing and a sample-value reset.
- Intake draft data is stored locally in the browser only; storage errors are reported in the app toast. No intake record is submitted to a backend.
- Quotation entry Next opens a sixth Quotation Review & Approval step. It shows quotation number QT-00018, DD/MM/YYYY quote and validity dates, customer/vehicle details, editable parts/labour/additional-charge rows, a live subtotal/discount/total, and Pending Approval / Approved / Rejected states.
- Review actions let the user return to quotation entry and add or remove line items, approve/reject locally with toast feedback, and preview a customer-facing quotation with separate parts/labour tables, status, quote dates, validity, discount, and total.
- Quotation date, validity date and status are persisted in the manually saved intake draft; earlier draft snapshots through step 5 remain loadable. The sample quotation is dated 14/04/2025 and valid through 21/04/2025.
- Approving a quotation opens the Work Orders sidebar destination on a Repair Done work-order screen. That screen shows work-order/repair information, service and part rows, mechanic notes, and a final total.
- Repair completion is a separate explicit action. Mark Repair Complete sets the work-order status to Completed, records the completion date, and marks the vehicle ready for pickup; status and notes are reflected in the repair-summary document preview.
- After repair completion, Next opens the Invoice step with invoice number/date/due date/payment terms, Parts Used and Labour Charges views, customer invoice notes, and a live parts/labour/additional/discount/total summary.
- The invoice preview includes the Garage Workspace branding, customer and vehicle details, invoice dates, completed line items, totals and invoice notes. Its Payment tab offers a frontend-only payment-method preview; no payment is processed.
- Invoice dates, due date, payment terms, notes and invoice preview state are included in the manually saved intake draft. Earlier draft snapshots through the repair workflow remain loadable.
- Invoice Next opens a Payment / Balance stage styled after the reference, with invoice/customer/vehicle details, categorized repair items, payment entry, payment history, invoice summary, total-paid and outstanding-balance totals, and receipt/new-invoice/settle-balance actions.
- Demo payment records initially total QAR 1,500 against the QAR 2,200 sample invoice, leaving QAR 700 due. Added payments are checked against the current balance; Settle Balance records the remaining amount. Payment records and entry fields persist in the local draft. This is a frontend-only ledger demo and does not process real payments.
- The payment stage preview shows the invoice balance and payment history. New Invoice resets the demo intake for a fresh work order.
- Back from Invoice returns to Repair Done. Quotation Review has no Next button; Back remains available to revise quotation entries.
- Added a dedicated Quotations workspace matching the supplied layout: total/draft/awaiting/approved summary cards, search and status/advisor filters, selectable quotation list, responsive detail pane, itemized totals, and approve/reject actions.
- Fixed the quotation styles so desktop and tablet layouts are no longer trapped inside the 420px media query. Added eight sample records and functional pagination for all 18 quotations, with filter-aware page counts and both row action controls.
- Approving/rejecting a quotation updates its local status and summary counts. The Quotations page has no Create Quotation header button; New Intake remains available through its sidebar navigation. Edit/share/convert actions explicitly report that those workflows are not implemented in this frontend demo.
- Added a dedicated Invoices workspace matching the supplied layout: invoice summary cards, status/advisor filters, search, a paginated list of 24 sample invoices, itemized invoice details, and responsive layout.
- Mark Paid updates the selected sample invoice status and summary counts locally. Print Invoice uses browser printing; Share and Send Reminder provide frontend-only feedback. Create Invoice routes to the existing POS Billing screen.
- Added a dedicated Vehicles workspace based on the supplied reference, with summary metrics, status and vehicle-type filters, search, paginated vehicle list, selected vehicle profile, notes, and five recent service records. Add Vehicle opens a preview form; Create Work Order opens New Intake. The vehicle data remains frontend-only.
- Added a dedicated Customers workspace based on the supplied reference, with summary metrics, customer type/status filters, search, pagination for 156 sample records, selected customer contact details, notes, associated vehicles, and recent service history. Add Customer opens the existing preview form; Create Work Order opens New Intake. Customer data remains frontend-only.
- Added a dedicated Parts Inventory workspace matching the supplied reference, with stock/commission metrics, the revenue-policy notice, category/status/brand filters, search, pagination across 248 sample parts, selected part details and recent stock movements. Stock adjustments validate quantity, update inventory/status/activity locally, and Add Part opens a preview form.
- Added a dedicated Mechanics workspace with the reference's four summary metrics, role/status/shift filters, search, an 18-mechanic sample roster with 10-row pagination, mechanic profile/performance details, notes, and today's assignment table. Add, edit, schedule, and work-order assignment controls provide explicit frontend-preview feedback; no mechanic records are persisted.
- Added a Reports & Analytics workspace with selectable 7-day, 30-day, 90-day, and yearly periods; period-based revenue, work-order, invoice and average-invoice KPIs; a responsive revenue trend chart; work-order status breakdown; mechanic performance table; recent invoices; an explicit sample-data notice; and CSV export. Report figures are local demo data, not live business records.
- The PDF download control reports that downloadable PDF generation is not part of this frontend preview.
- The form and document preview stack on smaller screens; print styles isolate the preview document.

## Storage and persistence

- `garage-pos-invoices`: generated demo invoices stored in browser `localStorage`.
- `garage-pos-draft`: one saved bill containing cart, customer, payment, received amount, split cash and work-order selection. Saving another draft overwrites it; invoice generation removes it.
- `garage-intake-draft`: one local intake form snapshot. Saving updates it; restoring sample values removes it.
- The local intake snapshot also includes quotation review dates and approval state, repair status/completion details, invoice information and local payment history. Approval, repair completion, invoice creation and payment recording are frontend-only with no customer notification, payment processing or backend workflow.
- Resume Draft is manual; a reload starts with the sample cart rather than automatically reopening the saved draft.
- Added customers are session-only, though a saved draft/invoice includes its customer snapshot. Restoring an unknown draft customer adds a selectable option for that customer.
- Unsaved quotation decisions, repair completion and dashboard changes are session-only.
- Browser storage is local to the browser/origin and is not a shared CRM database. Keep the same host and port to access the same saved browser data.

## Branding and implementation decisions

- Preserve `public/garage-workspace-logo.png` without altering the original logo.
- Primary navy is `#16212f`; orange accents, light gray workspace backgrounds and white cards follow the supplied references.
- Reference files supplied by the user:
  - `D:\IMG\Garage Workspace Dashboard.png`
  - `D:\IMG\Garage Workspace POS Billing Dashboard.png`
- Vehicle and part thumbnails use Lucide icons with colored backgrounds; original photographic thumbnails are not available as separate assets.
- The POS screenshot contains inconsistent arithmetic. Actual line items determine the totals instead of reproducing those inconsistencies.
- For the initial four POS items: gross parts = QAR 445.00, services = QAR 200.00, subtotal = QAR 645.00, discount = QAR 25.00, tax = QAR 31.00, total = QAR 651.00. Initial cash received is QAR 700.00, so change is QAR 49.00.
- Tax is rounded per line after discount using integer-cent calculations. The 5% rate is a demo requirement from the image, not verified tax guidance.
- Printing/download replace external messaging workflows. No WhatsApp/email sending integration has been added.
- Preserve the existing dashboard, splash and removed buttons when implementing future modules.
- The user prefers narrowly scoped edits and has asked not to install anything during recent UI work. No packages were installed for the dashboard refinements, POS screen or scrollbar change. Use existing dependencies unless the user authorizes more.

## Verification completed

- `npm run build` passed after the Quotation step: TypeScript and Vite production build succeeded.
- `node tests/billing.mjs` passed: sample totals, quantity changes, discount limits, negative-discount clamping, tax rounding and empty cart.
- `npm run build` passed after connecting quotation approval to the Repair Done work-order screen.
- `node tests/billing.mjs` passed after the repair workflow update.
- `npm run build` passed after adding the Invoices workspace.
- `node tests/billing.mjs` passed after the Invoices workspace update.
- Browser review confirmed 24 total invoices with 14 paid, 6 pending, and 4 overdue; the first page shows 10 invoices; Mark Paid updates status and summary counts; and the metrics/detail layout adapts at a 390px viewport.
- `npm run build` passed after adding the Vehicles workspace.
- `node tests/billing.mjs` passed after the Vehicles workspace update.
- Browser verification confirmed the initial 42-vehicle count and 18/15/9 summary cards, 10-row first page, two-row final page, Toyota filter results, Add Vehicle preview dialog, New Intake navigation, and two-column metrics on mobile.
- `npm run build` passed after adding the Customers workspace.
- `node tests/billing.mjs` passed after the Customers workspace update.
- Browser verification confirmed the 156 customer summary, first and last pagination pages, Fleet filter, customer search, Add Customer preview dialog, New Intake navigation, and responsive two-column metrics.
- `npm run build` passed after adding Parts Inventory.
- `node tests/billing.mjs` passed after the Parts Inventory update.
- Browser verification confirmed the inventory metrics, 10-item first page, low-stock filtering, last-page pagination, local stock adjustment and activity update, Add Part preview dialog, and responsive mobile layout.
- `npm run build` passed after adding Mechanics; TypeScript and Vite production build succeeded.
- `node tests/billing.mjs` passed after the Mechanics update.
- Browser verification confirmed Mechanics navigation, the 18/12/5/7 summary metrics, 10 rows on page one and 8 on page two, role filtering, the mechanic detail panel, and a two-column metrics layout without horizontal page overflow at a 390px viewport.
- `npm run build` passed after adding Reports; TypeScript and Vite production build succeeded.
- `node tests/billing.mjs` passed after the Reports update.
- Browser verification confirmed Reports navigation, the initial 30-day totals, date-range updates to the 7-day chart and KPI values, CSV export feedback, and a responsive two-column KPI layout without document overflow at a 390px viewport.
- Adjusted intermediate laptop layouts so intake and management details use the full available content width rather than a cramped split beside the persistent sidebar; Reports KPIs use two columns at these sizes. Browser checks across 1024, 1150, 1280, and 1366px widths confirmed the main page layouts fit the viewport without page-level horizontal overflow, while wider layouts retain side-by-side panels.
- `npm run build` passed after correcting Quotations CSS scope and implementing 18-row pagination.
- `node tests/billing.mjs` passed after the Quotations update.
- Browser review confirmed the desktop Quotations view renders, page 1 shows 10 rows, page 2 shows 8, Draft filtering shows 6 rows, and the metrics use a two-column layout at a 390px viewport.
- Vite started successfully; the root page and New Intake TSX module returned HTTP 200 after the quotation step change.
- The later sidebar scrollbar change was a CSS-only edit and was not followed by another build.
- Printing and the remaining application workflows have not been browser-verified; there is no automated end-to-end suite.
- Temporary dev servers started for verification were stopped. No hosted deployment was performed.
- On this machine, sandboxed Node/npm execution previously failed with `EPERM` while resolving `C:\Users\Muhammad Ammar`. Authorized execution outside the sandbox succeeded. This was an environment restriction, not a project build error.

## Pending work and known limitations

- Full modules remain unimplemented: Work Orders management and Settings. Dashboard quick-action forms and mechanic add/edit/assignment actions are previews.
- Header date, footer synchronization/status text and many KPI values are static sample data. New POS receipts use the current date formatted in Qatar time. POS KPI cards are not a complete live aggregation; the bill count uses a demo baseline plus the stored invoice count difference.
- Work-order selection is a local field; the shortcut loads a fixed sample bill rather than fetching a linked work order.
- The receipt header always says Walk-in Sale, including the sample work-order bill.
- Generated local invoices are marked Paid; card/bank selections do not verify payment. Nothing updates a real inventory or accounting ledger.
- Initial historical invoice rows have no item details; their receipt dialogs explicitly identify them as samples.
- Catalog search combines the local catalog input and header search. Dashboard header search filters work orders rather than all application modules.
- Clear cart/new sale actions currently have no confirmation dialog.
- No persistent customer catalog, multi-user sync, automatic cart saving, cloud backups or production invoice numbering.
- Some existing source files are compact with long JSX/CSS lines. Avoid unrelated formatting changes during narrowly scoped requests.

## Exact next steps for the next session

1. Open `D:\Garage System` in VS Code and read this file before editing.
2. Start the existing project (dependencies are already installed):

   ```powershell
   cd 'D:\Garage System'
   npm run dev
   ```

3. Open the Local URL printed by Vite, normally `http://localhost:5173/`. Wait for the splash to fade, then select POS Billing from the sidebar.
4. Review the current dashboard and POS against the two reference images at desktop and mobile sizes. Confirm that only the sidebar scrollbar is hidden and that the four removed dashboard buttons remain absent.
5. Verify POS interactions in the browser: filter/search products; add/remove items; adjust quantity/discount; check sample QAR 651.00 total; test insufficient cash; save/resume a draft; generate an invoice; reopen it; download and print it. Reload using the same origin to check saved data. Test print using a demo invoice.
6. Run the existing checks when implementation changes warrant them:

   ```powershell
   node tests/billing.mjs
   npm run build
   ```

7. Continue only with the next screen or correction the user requests. No next business module has been selected; ask which module to implement if the user simply says to continue. Keep all development frontend-only unless explicitly instructed otherwise.
8. Browser visual review of Dashboard, POS Billing and New Intake at desktop/mobile sizes remains outstanding.

Suggested next-session prompt: "Read PROJECT_PROGRESS.md and continue from the current Garage Workspace project. Preserve the existing dashboard and POS. The next task is: [describe the next screen or correction]."

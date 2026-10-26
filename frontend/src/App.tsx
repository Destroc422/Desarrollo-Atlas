import { useEffect, useRef, useState, type FormEvent, type ReactNode, type Ref } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Activity, AlertTriangle, ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight,
  Bell, Boxes, BriefcaseBusiness, CalendarClock, Check, ChevronDown,
  ChevronRight, ClipboardCheck, Command, Download, Ellipsis, FileBarChart2,
  Filter, LayoutDashboard, LifeBuoy, Menu, MoreHorizontal, Package, PackageCheck,
  PackagePlus, Plus, Search, Settings2, ShieldAlert, SlidersHorizontal, Sparkles,
  Truck, UserRound, UsersRound, Wrench, X,
} from "lucide-react";
import {
  currency, getAssets, getMovements, getProducts, saveInventorySnapshot, saveProducts,
  seedAssets, seedMovements, seedProducts,
  type Asset, type Movement, type Product,
} from "./data";
import { readDemoValue, resetDemoValues, writeDemoValue, writeDemoValues } from "./storage";

type ModalKind = "product" | "receipt" | "asset" | null;
type ToastState = { title: string; detail?: string } | null;

const productSchema = z.object({
  name: z.string().trim().min(3, "Escribe al menos 3 caracteres"),
  code: z.string().trim().min(3, "El código es obligatorio"),
  category: z.string().min(1, "Selecciona una categoría"),
  brand: z.string().trim().min(1, "Escribe una marca"),
  tracking: z.enum(["Individual", "Por cantidad"]),
  minimum: z.coerce.number().int().min(0),
  location: z.string().min(1, "Selecciona una ubicación"),
  value: z.coerce.number().min(0),
});
type ProductValues = z.infer<typeof productSchema>;
type ProductFormInput = z.input<typeof productSchema>;

const assetSchema = z.object({
  productId: z.string().min(1, "Selecciona un producto del catálogo"),
  serial: z.string().trim().min(3, "El serial debe tener al menos 3 caracteres"),
  location: z.string().min(1, "Selecciona una ubicación"),
});
type AssetValues = z.infer<typeof assetSchema>;
type AssetFormInput = z.input<typeof assetSchema>;

type ReceiptLineDraft = {
  id: string;
  kind: "catalog" | "new";
  productId: string;
  quantity: number;
  serialText: string;
  name: string;
  code: string;
  category: string;
  brand: string;
  tracking: "Individual" | "Por cantidad";
  minimum: number;
  location: string;
  value: number;
};
type ReceiptLineInput =
  | { kind: "catalog"; productId: string; quantity: number; serials: string[] }
  | { kind: "new"; product: Pick<Product, "name" | "code" | "category" | "brand" | "tracking" | "minimum" | "location" | "value">; quantity: number; serials: string[] };
type ReceiptSubmission = { reference: string; purchaseCode?: string; lines: ReceiptLineInput[] };

const receiptLineSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("catalog"), productId: z.string().min(1, "Selecciona un producto registrado"), quantity: z.number().int().min(1, "La cantidad debe ser al menos 1"), serialText: z.string() }),
  z.object({
    kind: z.literal("new"), productId: z.string(), quantity: z.number().int().min(1, "La cantidad debe ser al menos 1"), serialText: z.string(),
    name: z.string().trim().min(3, "Escribe el nombre del producto"), code: z.string().trim().min(3, "Escribe un código interno"),
    category: z.string().min(1, "Selecciona una categoría"), brand: z.string().trim().min(1, "Escribe una marca"),
    tracking: z.enum(["Individual", "Por cantidad"]), minimum: z.number().int().min(0), location: z.string().min(1), value: z.number().min(0),
  }),
]);
const receiptSchema = z.object({ reference: z.string().trim().min(3, "Escribe una referencia de recepción"), lines: z.array(receiptLineSchema).min(1) });

const createReceiptLine = (kind: ReceiptLineDraft["kind"], productId = ""): ReceiptLineDraft => ({
  id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  kind, productId, quantity: 1, serialText: "", name: "", code: "", category: "Computadores", brand: "",
  tracking: "Individual", minimum: 0, location: "Bodega central", value: 0,
});

type PurchaseLine = { productId: string; productName: string; productCode: string; quantity: number; received: number; unitValue: number };
type PurchaseOrder = { code: string; vendor: string; date: string; due: string; items: string; total: string; status: string; lines?: PurchaseLine[]; schemaVersion?: number };
type PurchaseOrderDraft = { vendor: string; due: string; lines: Array<{ productId: string; quantity: number }> };
type AssignmentRow = { ref: string; asset: string; assetId?: string; recipient: string; group: string; date: string; status: string };
type InspectionRow = { id?: string; asset: string; code: string; type: string; responsible: string; due: string; status: string; result?: string; notes?: string; previousAssetStatus?: Asset["status"]; previousAssignee?: string; incidentResolved?: boolean; resolutionNotes?: string };
type WorkOrder = { ref: string; asset: string; assetId?: string; previousStatus?: Asset["status"]; previousAssignee?: string; issue: string; owner: string; scheduled: string; status: string; cost?: number };
type OrganizationSettings = {
  organization: string; taxId: string; timezone: string; currency: string;
  users: Array<{ name: string; email: string; role: string }>;
  locations: string[];
  notifications: { lowStock: boolean; inspections: boolean; assignments: boolean; weeklyReport: boolean };
};
type OrganizationGroup = { id: string; name: string; lead: string; members: number };
type NotificationRecord = { id: string; title: string; description: string; category: string; time: string; href: string; read: boolean };
type QuickOption = string | { label: string; value: string };
type QuickField = { name: string; label: string; type?: "text" | "email" | "number" | "date" | "datetime-local" | "select" | "textarea"; options?: QuickOption[]; placeholder?: string; min?: number; required?: boolean };

function readPersistentSnapshot<T>(key: string, fallback: T): T {
  return readDemoValue(key, fallback);
}

const purchaseSeed: PurchaseOrder[] = [
  { code: "OC-2026-0248", vendor: "TechData Colombia", date: "24 oct, 2026", due: "30 oct, 2026", items: "4 productos · 42 unidades", total: "$ 79.538.000", status: "Parcialmente recibida", schemaVersion: 2, lines: [{ productId: "p-01", productName: "Teclado inalámbrico MX Keys", productCode: "TEC-0142", quantity: 12, received: 12, unitValue: 429000 }, { productId: "p-02", productName: "Portátil Latitude 5440", productCode: "LAP-0028", quantity: 10, received: 0, unitValue: 5280000 }, { productId: "p-03", productName: "Monitor UltraSharp 27”", productCode: "MON-0087", quantity: 10, received: 0, unitValue: 1860000 }, { productId: "p-04", productName: "Diadema Zone Vibe 100", productCode: "AUD-0031", quantity: 10, received: 0, unitValue: 299000 }] },
  { code: "OC-2026-0247", vendor: "Compumax S.A.S.", date: "23 oct, 2026", due: "28 oct, 2026", items: "3 productos · 28 unidades", total: "$ 64.426.000", status: "Aprobada", schemaVersion: 2, lines: [{ productId: "p-02", productName: "Portátil Latitude 5440", productCode: "LAP-0028", quantity: 10, received: 0, unitValue: 5280000 }, { productId: "p-03", productName: "Monitor UltraSharp 27”", productCode: "MON-0087", quantity: 4, received: 0, unitValue: 1860000 }, { productId: "p-04", productName: "Diadema Zone Vibe 100", productCode: "AUD-0031", quantity: 14, received: 0, unitValue: 299000 }] },
  { code: "OC-2026-0246", vendor: "Ingram Micro", date: "22 oct, 2026", due: "31 oct, 2026", items: "1 producto · 12 unidades", total: "$ 25.680.000", status: "Pendiente de aprobación", schemaVersion: 2, lines: [{ productId: "p-05", productName: "Tablet Galaxy Tab Active4", productCode: "TAB-0019", quantity: 12, received: 0, unitValue: 2140000 }] },
  { code: "OC-2026-0245", vendor: "Intcomex Colombia", date: "21 oct, 2026", due: "26 oct, 2026", items: "1 producto · 18 unidades", total: "$ 576.000", status: "Aprobada", schemaVersion: 2, lines: [{ productId: "p-06", productName: "Cable USB-C 1 m", productCode: "CAB-0910", quantity: 18, received: 0, unitValue: 32000 }] },
];
const assignmentSeed: AssignmentRow[] = [
  { ref: "ASI-2026-0219", asset: "MacBook Pro 14” M3", assetId: "a-01", recipient: "Laura Méndez", group: "Diseño", date: "Hoy, 9:18 a. m.", status: "Activa" },
  { ref: "ASI-2026-0218", asset: "iPhone 15 · 128 GB", assetId: "a-03", recipient: "Camilo Rojas", group: "Comercial", date: "Hoy, 8:42 a. m.", status: "Activa" },
  { ref: "ASI-2026-0217", asset: "Monitor UltraSharp 27”", assetId: "a-04", recipient: "Ana Beltrán", group: "Finanzas", date: "24 oct, 3:14 p. m.", status: "Pendiente de firma" },
  { ref: "ASI-2026-0216", asset: "Dell Latitude 5440", assetId: "a-02", recipient: "Equipo de soporte", group: "Tecnología", date: "24 oct, 11:06 a. m.", status: "Pendiente de entrega" },
];
const inspectionSeed: InspectionRow[] = [
  { asset: "Camioneta Toyota Hilux", code: "VEH-00012", type: "Inspección preoperacional", responsible: "Diego Cárdenas", due: "Hoy, 10:00 a. m.", status: "Pendiente" },
  { asset: "Montacargas Toyota 8FGU", code: "MAQ-00004", type: "Lista de chequeo diaria", responsible: "Sergio Molina", due: "Hoy, 11:30 a. m.", status: "Pendiente" },
  { asset: "Camión Hino 300", code: "VEH-00007", type: "Inspección preoperacional", responsible: "Julián Cruz", due: "Hoy, 8:00 a. m.", status: "Vencida" },
  { asset: "Plataforma elevadora JLG", code: "MAQ-00018", type: "Verificación semanal", responsible: "Sergio Molina", due: "Mañana, 7:00 a. m.", status: "Programada" },
];
const workOrderSeed: WorkOrder[] = [
  { ref: "OT-2026-0084", asset: "iPad Air · 256 GB", assetId: "a-05", issue: "Batería con desgaste elevado", owner: "Sergio Molina", scheduled: "26 oct, 2:00 p. m.", status: "En proceso", cost: 420000 },
  { ref: "OT-2026-0083", asset: "Camioneta Toyota Hilux", issue: "Cambio de aceite · 80.000 km", owner: "Taller Autonal", scheduled: "27 oct, 8:00 a. m.", status: "Programado", cost: 680000 },
  { ref: "OT-2026-0082", asset: "Portátil ThinkPad T14", assetId: "a-06", issue: "Puerto USB-C intermitente", owner: "Mesa de ayuda", scheduled: "24 oct, 10:00 a. m.", status: "Esperando repuesto", cost: 195000 },
  { ref: "OT-2026-0081", asset: "Impresora HP LaserJet M404", issue: "Mantenimiento preventivo", owner: "Mesa de ayuda", scheduled: "23 oct, 3:30 p. m.", status: "Completado", cost: 125000 },
];
const settingsSeed: OrganizationSettings = {
  organization: "Senda Operaciones", taxId: "900.742.186-3", timezone: "America/Bogota", currency: "COP",
  users: [{ name: "Mariana Torres", email: "mariana@senda.co", role: "Administradora" }, { name: "Juan Pardo", email: "juan@senda.co", role: "Operador" }, { name: "Camila Rojas", email: "camila@senda.co", role: "Auditor" }],
  locations: ["Bodega central", "Sede principal", "Sede norte", "Sede sur"],
  notifications: { lowStock: true, inspections: true, assignments: true, weeklyReport: false },
};
const organizationGroupSeed: OrganizationGroup[] = [
  { id: "grp-01", name: "Tecnología", lead: "Juan Pardo", members: 12 },
  { id: "grp-02", name: "Diseño", lead: "Laura Méndez", members: 8 },
  { id: "grp-03", name: "Comercial", lead: "Camilo Rojas", members: 16 },
  { id: "grp-04", name: "Finanzas", lead: "Ana Beltrán", members: 6 },
];
const getLocationOptions = (locations: string[]) => [...new Set([...locations, "Bodega central", "Sede principal", "Sede principal · Piso 2", "Sede principal · Piso 3", "Sede norte", "Sede sur"])];
const notificationSeed: NotificationRecord[] = [
  { id: "ntf-01", title: "Producto por debajo del mínimo", description: "Monitor UltraSharp 27” · 4 unidades disponibles, mínimo 5.", category: "Inventario", time: "Hace 18 min", href: "/products", read: false },
  { id: "ntf-02", title: "Inspección vencida", description: "El Camión Hino 300 requiere una revisión prioritaria.", category: "Inspecciones", time: "Hace 42 min", href: "/inspections", read: false },
  { id: "ntf-03", title: "Devolución pendiente", description: "La asignación ASI-2026-0219 sigue activa.", category: "Asignaciones", time: "Hoy, 8:10 a. m.", href: "/assignments", read: false },
  { id: "ntf-04", title: "Orden lista para recibir", description: "OC-2026-0248 tiene mercancía pendiente de ingreso.", category: "Compras", time: "Ayer, 4:36 p. m.", href: "/purchases", read: true },
];
const legacyNotificationIds = new Set(["ntf-01", "ntf-02", "ntf-03", "ntf-04"]);
const legacyReadByAutomaticId: Record<string, string> = {
  "auto:stock:p-03": "ntf-01",
  "auto:inspection:VEH-00007": "ntf-02",
  "auto:purchase:OC-2026-0248": "ntf-04",
};

function createOperationalNotifications(products: Product[], inspections: InspectionRow[], assignments: AssignmentRow[], purchases: PurchaseOrder[], settings: OrganizationSettings): NotificationRecord[] {
  return [
    ...(settings.notifications.lowStock ? products.filter((product) => product.stock <= product.minimum).map((product) => ({ id: `auto:stock:${product.id}`, title: "Producto por debajo del mínimo", description: `${product.name} · ${product.stock} ${product.tracking === "Individual" ? "activos" : "unidades"} disponibles, mínimo ${product.minimum}.`, category: "Inventario", time: "Requiere atención", href: `/products?search=${encodeURIComponent(product.name)}`, read: false })) : []),
    ...(settings.notifications.inspections ? inspections.filter((row) => row.status === "Vencida" || (row.result === "Incidencia crítica" && !row.incidentResolved)).map((row) => ({ id: `auto:inspection:${row.id ?? row.code}`, title: row.result === "Incidencia crítica" && !row.incidentResolved ? "Incidencia crítica sin resolver" : "Inspección vencida", description: `${row.asset} · ${row.type} · ${row.responsible}.`, category: "Inspecciones", time: "Requiere atención", href: "/inspections", read: false })) : []),
    ...(settings.notifications.assignments ? assignments.filter((row) => row.status === "Pendiente de entrega" || row.status === "Pendiente de firma").map((row) => ({ id: `auto:assignment:${row.ref}`, title: row.status === "Pendiente de entrega" ? "Entrega de activo pendiente" : "Acta pendiente de firma", description: `${row.asset} · ${row.ref} · ${row.recipient}.`, category: "Asignaciones", time: "Requiere atención", href: "/assignments", read: false })) : []),
    ...purchases.filter((order) => order.status !== "Recibida" && (order.status === "Pendiente de aprobación" || (order.lines ?? []).some((line) => line.received < line.quantity))).map((order) => {
      const pendingUnits = (order.lines ?? []).reduce((total, line) => total + Math.max(0, line.quantity - line.received), 0);
      const approvalPending = order.status === "Pendiente de aprobación";
      return { id: `auto:purchase:${order.code}`, title: approvalPending ? "Orden pendiente de aprobación" : "Orden con recepción pendiente", description: `${order.code} · ${order.vendor} · ${approvalPending ? "Requiere aprobación." : `${pendingUnits} unidades por recibir.`}`, category: "Compras", time: "Requiere atención", href: "/purchases", read: false };
    }),
  ];
}

function mergeNotificationReadState(automatic: NotificationRecord[], stored: NotificationRecord[]): NotificationRecord[] {
  const legacyRead = new Map(stored.filter((item) => legacyNotificationIds.has(item.id)).map((item) => [item.id, item.read]));
  const savedAutomatic = new Map(stored.filter((item) => item.id.startsWith("auto:")).map((item) => [item.id, item.read]));
  const generated = automatic.map((item) => ({ ...item, read: savedAutomatic.get(item.id) ?? (legacyReadByAutomaticId[item.id] ? legacyRead.get(legacyReadByAutomaticId[item.id]) : undefined) ?? false }));
  const custom = stored.filter((item) => !legacyNotificationIds.has(item.id) && !item.id.startsWith("auto:"));
  return [...generated, ...custom];
}

function usePersistentValue<T>(key: string, initialValue: T): [T, (nextValue: T | ((current: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => readPersistentSnapshot(key, initialValue));
  const save = (nextValue: T | ((current: T) => T)) => {
    const current = readPersistentSnapshot(key, value);
    const resolved = typeof nextValue === "function" ? (nextValue as (current: T) => T)(current) : nextValue;
    writeDemoValue(key, resolved);
    setValue(resolved);
  };
  useEffect(() => {
    const syncInWindow = (event: Event) => {
      const detail = (event as CustomEvent<{ key: string; value: T }>).detail;
      if (detail?.key === key) setValue(detail.value);
    };
    const syncAcrossTabs = (event: StorageEvent) => {
      if (event.key !== key) return;
      try { setValue(event.newValue ? JSON.parse(event.newValue) as T : initialValue); } catch { setValue(initialValue); }
    };
    window.addEventListener("atlas:persistent-value", syncInWindow);
    window.addEventListener("storage", syncAcrossTabs);
    return () => {
      window.removeEventListener("atlas:persistent-value", syncInWindow);
      window.removeEventListener("storage", syncAcrossTabs);
    };
  }, [initialValue, key]);
  return [value, save];
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const content = [headers, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll("\"", "\"\"")}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const spanishMonths = new Map(["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"].map((month, index) => [month, index]));
function movementDate(value: string): Date | null {
  const today = new Date();
  if (/^(Ahora|Hoy)/i.test(value)) return today;
  if (/^Ayer/i.test(value)) { const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1); return yesterday; }
  const match = value.match(/^(\d{1,2})\s+([a-záé]{3}),\s*(\d{4})/i);
  if (!match) return null;
  const month = spanishMonths.get(match[2].normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
  if (month === undefined) return null;
  return new Date(Number(match[3]), month, Number(match[1]), 12);
}

function movementBuckets(movements: Movement[], period: string) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const incomingTypes = new Set(["Ingreso", "Devolución"]);
  const buckets: Array<{ label: string; start: Date; end: Date; incoming: number; outgoing: number }> = [];
  if (period === "Esta semana") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    for (let day = 0; day < 7; day++) {
      const bucketStart = new Date(start); bucketStart.setDate(start.getDate() + day);
      const bucketEnd = new Date(bucketStart); bucketEnd.setDate(bucketStart.getDate() + 1);
      buckets.push({ label: new Intl.DateTimeFormat("es-CO", { weekday: "short" }).format(bucketStart).replace(".", ""), start: bucketStart, end: bucketEnd, incoming: 0, outgoing: 0 });
    }
  } else if (period === "Este mes") {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day += 7) {
      const endDay = Math.min(day + 6, daysInMonth);
      buckets.push({ label: `${day}–${endDay}`, start: new Date(currentYear, currentMonth, day), end: new Date(currentYear, currentMonth, endDay + 1), incoming: 0, outgoing: 0 });
    }
  } else {
    const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
    for (let offset = 0; offset < 6; offset++) {
      const month = quarterStartMonth + Math.floor(offset / 2);
      const half = offset % 2;
      const startDay = half === 0 ? 1 : 16;
      const endDay = half === 0 ? 16 : new Date(currentYear, month + 1, 1).getDate() + 1;
      const start = new Date(currentYear, month, startDay);
      buckets.push({ label: `${new Intl.DateTimeFormat("es-CO", { month: "short" }).format(start).replace(".", "")} ${half + 1}`, start, end: new Date(currentYear, month, endDay), incoming: 0, outgoing: 0 });
    }
  }
  for (const movement of movements) {
    const date = movementDate(movement.date);
    if (!date) continue;
    const bucket = buckets.find((item) => date >= item.start && date < item.end);
    if (!bucket) continue;
    if (incomingTypes.has(movement.type)) bucket.incoming++;
    else bucket.outgoing++;
  }
  return buckets;
}

function displayDate(value: string) {
  if (!value) return "Pendiente";
  const parsed = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric", ...(value.length > 10 ? { hour: "numeric", minute: "2-digit" } : {}) }).format(parsed);
}

const navigation: Array<{ label: string; to: string; icon: typeof LayoutDashboard; group: string; count?: string; alert?: boolean }> = [
  { label: "Resumen", to: "/", icon: LayoutDashboard, group: "workspace" },
  { label: "Inventario", to: "/inventory", icon: Boxes, group: "workspace", count: "1.284" },
  { label: "Productos", to: "/products", icon: Package, group: "workspace" },
  { label: "Movimientos", to: "/movements", icon: ArrowLeftRight, group: "workspace" },
  { label: "Compras", to: "/purchases", icon: Truck, group: "management", count: "4" },
  { label: "Organización", to: "/organization", icon: UsersRound, group: "management" },
  { label: "Asignaciones", to: "/assignments", icon: BriefcaseBusiness, group: "management" },
  { label: "Inspecciones", to: "/inspections", icon: ClipboardCheck, group: "management", alert: true },
  { label: "Mantenimiento", to: "/maintenance", icon: Wrench, group: "management" },
  { label: "Reportes", to: "/reports", icon: FileBarChart2, group: "system" },
  { label: "Auditoría", to: "/audit", icon: ShieldAlert, group: "system" },
  { label: "Notificaciones", to: "/notifications", icon: Bell, group: "system", count: "4" },
];

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [modal, setModal] = useState<ModalKind>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.matchMedia("(max-width: 760px)").matches);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const assetReturnFocusRef = useRef<HTMLElement | null>(null);
  const openAsset = (asset: Asset, trigger?: HTMLElement) => {
    assetReturnFocusRef.current = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    trigger?.focus();
    setSelectedAsset(asset);
  };
  const closeAsset = () => {
    setSelectedAsset(null);
    requestAnimationFrame(() => assetReturnFocusRef.current?.focus());
  };
  const [receiptPurchaseCode, setReceiptPurchaseCode] = useState<string>();
  const [globalSearch, setGlobalSearch] = useState("");
  const { data: searchProducts = [] } = useQuery({ queryKey: ["products"], queryFn: getProducts });
  const [navSettings] = usePersistentValue("atlas.settings", settingsSeed);
  const [navInspections] = usePersistentValue("atlas.inspections", inspectionSeed);
  const [navAssignments] = usePersistentValue("atlas.assignments", assignmentSeed);
  const [navPurchases] = usePersistentValue("atlas.purchases", purchaseSeed);
  const [storedNotifications] = usePersistentValue("atlas.notifications", notificationSeed);
  const unreadNotificationCount = mergeNotificationReadState(
    createOperationalNotifications(searchProducts, navInspections, navAssignments, navPurchases, navSettings),
    storedNotifications,
  ).filter((item) => !item.read).length;
  const queryClient = useQueryClient();
  useEffect(() => {
    const onStorageError = () => setToast({ title: "No se pudieron guardar los cambios", detail: "El almacenamiento local del navegador está lleno o no disponible. Libera espacio e inténtalo de nuevo." });
    window.addEventListener("atlas:storage-error", onStorageError);
    return () => window.removeEventListener("atlas:storage-error", onStorageError);
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const updateViewport = (event: MediaQueryListEvent) => { setIsMobileViewport(event.matches); if (!event.matches) setMobileNav(false); };
    media.addEventListener("change", updateViewport);
    return () => media.removeEventListener("change", updateViewport);
  }, []);
  const productMutation = useMutation({
    mutationFn: async (product: Product) => {
      const current = await getProducts();
      if (current.some((item) => item.code.toLowerCase() === product.code.toLowerCase())) {
        throw new Error("Ya existe un producto con ese código.");
      }
      await saveProducts([product, ...current]);
      return product;
    },
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setModal(null);
      setToast({ title: "Producto creado", detail: `${product.code} · ${product.name}` });
    },
  });
  const assetMutation = useMutation({
    mutationFn: async (values: AssetValues) => {
      const [products, assets, movements] = await Promise.all([getProducts(), getAssets(), getMovements()]);
      const product = products.find((item) => item.id === values.productId && item.tracking === "Individual");
      if (!product) throw new Error("Selecciona un producto configurado para control individual.");
      if (assets.some((item) => item.serial.toLowerCase() === values.serial.toLowerCase())) {
        throw new Error("Ya existe un activo con ese serial.");
      }
      const nextCode = Math.max(0, ...assets.map((item) => Number(item.code.replace(/\D/g, "")) || 0)) + 1;
      const category = ({ Computadores: "Computador", Monitores: "Monitor", Móviles: "Móvil" } as Record<string, string>)[product.category] ?? product.category;
      const tone = category === "Computador" ? "blue" : category === "Móvil" ? "green" : category === "Monitor" ? "lavender" : "orange";
      const newAsset: Asset = {
        id: `a-${Date.now()}`,
        name: product.name,
        code: `ACT-${String(nextCode).padStart(6, "0")}`,
        serial: values.serial,
        category,
        location: values.location,
        assignedTo: "—",
        status: "Disponible",
        initials: product.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
        tone,
      };
      const movement: Movement = {
        id: `m-${Date.now()}`,
        type: "Ingreso",
        item: newAsset.name,
        code: newAsset.code,
        quantity: "1 activo",
        from: "Registro individual",
        to: newAsset.location,
        actor: "Mariana Torres",
        date: "Ahora",
        reference: `ING-${newAsset.code}`,
      };
      const nextProducts = products.map((item) => item.id === product.id ? { ...item, stock: item.stock + 1, updatedAt: "Ahora" } : item);
      await saveInventorySnapshot(nextProducts, [newAsset, ...assets], [movement, ...movements]);
      return newAsset;
    },
    onSuccess: (asset) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["movements"] });
      setModal(null);
      setToast({ title: "Activo registrado", detail: `${asset.code} · ${asset.name}` });
    },
  });
  const receiveMutation = useMutation({
    mutationFn: async ({ lines, reference, purchaseCode }: ReceiptSubmission) => {
      const [products, assets, movements] = await Promise.all([getProducts(), getAssets(), getMovements()]);
      const normalizedReference = reference.trim().toLocaleLowerCase();
      if (movements.some((movement) => movement.reference.trim().toLocaleLowerCase() === normalizedReference)) {
        throw new Error("Esa referencia de recepción ya fue registrada.");
      }
      const currentOrders = readPersistentSnapshot("atlas.purchases", purchaseSeed);
      const purchaseOrder = purchaseCode ? currentOrders.find((order) => order.code === purchaseCode) : undefined;
      if (purchaseCode && (!purchaseOrder || !["Aprobada", "Parcialmente recibida"].includes(purchaseOrder.status))) {
        throw new Error("La orden no está disponible para recibir. Revisa su estado.");
      }
      if (purchaseCode && !purchaseOrder?.lines?.length) throw new Error("Esta orden no tiene líneas detalladas. Registra la recepción sin asociar la orden.");
      let nextProducts = [...products];
      const nextAssets = [...assets];
      const nextMovements = [...movements];
      const seenSerials = new Set(assets.map((asset) => asset.serial.trim().toLowerCase()));
      const receivedInSubmission = new Map<string, number>();
      let nextAssetCode = Math.max(0, ...assets.map((asset) => Number(asset.code.replace(/\D/g, "")) || 0));
      let unitCount = 0;

      lines.forEach((line, lineIndex) => {
        let product: Product | undefined;
        if (line.kind === "new") {
          if (nextProducts.some((item) => item.code.toLowerCase() === line.product.code.toLowerCase())) {
            throw new Error(`El código ${line.product.code} ya existe en el catálogo.`);
          }
          product = { ...line.product, id: `p-${Date.now()}-${lineIndex}`, stock: 0, updatedAt: "Ahora" };
          nextProducts = [product, ...nextProducts];
        } else {
          product = nextProducts.find((item) => item.id === line.productId);
        }
        if (!product) throw new Error("Uno de los productos seleccionados ya no está disponible.");

        if (purchaseOrder) {
          const orderLine = purchaseOrder.lines?.find((item) => line.kind === "catalog" ? item.productId === product?.id : item.productCode.toLowerCase() === line.product.code.toLowerCase());
          if (!orderLine) throw new Error(product.name + " no pertenece a la orden " + purchaseOrder.code + ".");
          const previouslyReceived = receivedInSubmission.get(orderLine.productId) ?? 0;
          const remaining = orderLine.quantity - orderLine.received - previouslyReceived;
          if (line.quantity > remaining) throw new Error(product.name + ": solo quedan " + remaining + " unidades pendientes en la orden.");
          receivedInSubmission.set(orderLine.productId, previouslyReceived + line.quantity);
        }

        if (product.tracking === "Individual" && line.serials.length !== line.quantity) {
          throw new Error(`${product.name}: registra un serial por cada unidad. Se esperaban ${line.quantity} y hay ${line.serials.length}.`);
        }
        if (product.tracking === "Individual") {
          for (const serial of line.serials) {
            const normalizedSerial = serial.trim().toLowerCase();
            if (!normalizedSerial || seenSerials.has(normalizedSerial)) throw new Error(`El serial “${serial}” ya está registrado o repetido en esta recepción.`);
            seenSerials.add(normalizedSerial);
            nextAssetCode += 1;
            const category = ({ Computadores: "Computador", Monitores: "Monitor", Móviles: "Móvil" } as Record<string, string>)[product.category] ?? product.category;
            const tone = category === "Computador" ? "blue" : category === "Móvil" ? "green" : category === "Monitor" ? "lavender" : "orange";
            nextAssets.unshift({
              id: `a-${Date.now()}-${lineIndex}-${nextAssetCode}`, name: product.name, code: `ACT-${String(nextAssetCode).padStart(6, "0")}`,
              serial: serial.trim(), category, location: product.location, assignedTo: "—", status: "Disponible",
              initials: product.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(), tone,
            });
          }
        }

        nextProducts = nextProducts.map((item) => item.id === product?.id ? { ...item, stock: item.stock + line.quantity, updatedAt: "Ahora" } : item);
        nextMovements.unshift({
          id: `m-${Date.now()}-${lineIndex}`, type: "Ingreso", item: product.name, code: product.code,
          quantity: `+${line.quantity} ${product.tracking === "Individual" ? (line.quantity === 1 ? "activo" : "activos") : (line.quantity === 1 ? "unidad" : "unidades")}`,
          from: "Recepción de compra", to: product.location, actor: "Mariana Torres", date: "Ahora", reference,
        });
        unitCount += line.quantity;
      });

      if (purchaseOrder) {
        const nextLines = purchaseOrder.lines!.map((line) => ({ ...line, received: line.received + (receivedInSubmission.get(line.productId) ?? 0) }));
        const isComplete = nextLines.every((line) => line.received >= line.quantity);
        const nextOrders = currentOrders.map((order) => order.code === purchaseOrder.code ? { ...order, lines: nextLines, status: isComplete ? "Recibida" : "Parcialmente recibida" } : order);
        writeDemoValues({ "atlas.products": nextProducts, "atlas.assets": nextAssets, "atlas.movements": nextMovements, "atlas.purchases": nextOrders });
      } else {
        await saveInventorySnapshot(nextProducts, nextAssets, nextMovements);
      }
      return { lineCount: lines.length, unitCount, purchaseCode };
    },
    onSuccess: ({ lineCount, unitCount, purchaseCode }) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["movements"] });
      if (purchaseCode) queryClient.invalidateQueries({ queryKey: ["purchases"] });
      setModal(null);
      setToast({ title: "Recepción registrada", detail: `${lineCount} ${lineCount === 1 ? "artículo" : "artículos"} · ${unitCount} ${unitCount === 1 ? "unidad" : "unidades"}` });
    },
  });

  const title = navigation.find((item) => item.to === location.pathname)?.label ?? (location.pathname === "/settings" ? "Configuración" : "Resumen");
  const searchNeedle = globalSearch.trim().toLowerCase();
  const matchingPages = searchNeedle ? navigation.filter((item) => item.label.toLowerCase().includes(searchNeedle)).slice(0, 3) : [];
  const matchingProducts = searchNeedle ? searchProducts.filter((item) => `${item.name} ${item.code} ${item.brand}`.toLowerCase().includes(searchNeedle)).slice(0, 4) : [];
  const runGlobalSearch = () => {
    if (matchingProducts[0]) navigate(`/products?search=${encodeURIComponent(matchingProducts[0].name)}`);
    else if (matchingPages[0]) navigate(matchingPages[0].to);
    setGlobalSearch("");
  };
  const submitProduct = (values: ProductValues) => productMutation.mutate({
    id: `p-${Date.now()}`, ...values, stock: 0, updatedAt: "Ahora",
  });
  const submitReceipt = (submission: ReceiptSubmission) => receiveMutation.mutate(submission);
  const notify = (title: string, detail?: string) => setToast({ title, detail });
  const openReceipt = (purchaseCode?: string) => { setReceiptPurchaseCode(purchaseCode); setModal("receipt"); };

  return (
    <div className="app-shell">
      <aside id="primary-sidebar" aria-hidden={isMobileViewport && !mobileNav} inert={isMobileViewport && !mobileNav} className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark"><Boxes size={19} strokeWidth={2.2} /></div>
          <div className="brand-name">atlas<span>ops</span></div>
          <button className="icon-button sidebar-close" aria-label="Cerrar menú de navegación" onClick={() => setMobileNav(false)}><X size={18} /></button>
        </div>
        <button className="workspace-switcher" onClick={() => setToast({ title: "Workspace de demostración", detail: "Este prototipo está configurado para Senda Operaciones." })}>
          <span className="workspace-avatar">S</span>
          <span className="workspace-copy"><strong>Senda Operaciones</strong><small>Plan empresarial</small></span>
          <ChevronDown size={15} className="switcher-chevron" />
        </button>
        <nav className="primary-nav" aria-label="Navegación principal">
          <NavGroup title="ESPACIO DE TRABAJO">
            {navigation.filter((item) => item.group === "workspace").map((item) => <SidebarLink key={item.to} item={item} onClick={() => setMobileNav(false)} />)}
          </NavGroup>
          <NavGroup title="GESTIÓN">
            {navigation.filter((item) => item.group === "management").map((item) => <SidebarLink key={item.to} item={item} onClick={() => setMobileNav(false)} />)}
          </NavGroup>
          <NavGroup title="ANÁLISIS">
            {navigation.filter((item) => item.group === "system").map((item) => <SidebarLink key={item.to} item={item.to === "/notifications" ? { ...item, count: unreadNotificationCount ? String(unreadNotificationCount) : undefined } : item} onClick={() => setMobileNav(false)} />)}
          </NavGroup>
        </nav>
        <div className="sidebar-bottom">
          <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}><Settings2 size={17} /><span>Configuración</span></NavLink>
          <div className="sidebar-help"><span className="help-icon"><LifeBuoy size={17} /></span><span><strong>¿Necesitas ayuda?</strong><small>Estamos para ayudarte</small></span><ArrowRight size={14} /></div>
          <div className="user-profile">
            <div className="user-avatar">MT</div>
            <div className="user-copy"><strong>Mariana Torres</strong><small>Administradora</small></div>
            <MoreHorizontal size={19} />
          </div>
        </div>
      </aside>
      {mobileNav && <button className="mobile-scrim" aria-label="Cerrar navegación con el fondo" onClick={() => setMobileNav(false)} />}

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" aria-label={mobileNav ? "Cerrar menú de navegación" : "Abrir menú de navegación"} aria-expanded={mobileNav} aria-controls="primary-sidebar" onClick={() => setMobileNav((open) => !open)}>{mobileNav ? <X size={20} /> : <Menu size={20} />}</button>
            <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={13} /><strong>{title}</strong></div>
          </div>
          <div className="topbar-actions">
            <div className="global-search-wrap"><label className="global-search"><Search size={16} /><input aria-label="Buscar en Atlas" value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") runGlobalSearch(); if (event.key === "Escape") setGlobalSearch(""); }} placeholder="Buscar en Atlas..." /><kbd><Command size={11} /> K</kbd></label>
              {searchNeedle && <div className="search-suggestions"><span className="suggestion-label">PÁGINAS</span>{matchingPages.map((item) => { const Icon = item.icon; return <button key={item.to} onClick={() => { navigate(item.to); setGlobalSearch(""); }}><Icon size={15} /><span>{item.label}</span><ArrowRight size={13} /></button>; })}{matchingProducts.length > 0 && <><span className="suggestion-label">PRODUCTOS</span>{matchingProducts.map((product) => <button key={product.id} onClick={() => { navigate(`/products?search=${encodeURIComponent(product.name)}`); setGlobalSearch(""); }}><Package size={15} /><span>{product.name}<small>{product.code} · {product.brand}</small></span><ArrowRight size={13} /></button>)}</>}{matchingPages.length === 0 && matchingProducts.length === 0 && <p className="suggestion-empty">No encontramos resultados para “{globalSearch}”.</p>}</div>}
            </div>
            <span className="topbar-divider" />
            <button className="icon-button notification-button" aria-label="Notificaciones" onClick={() => navigate("/notifications")}><Bell size={18} /><i /></button>
            <div className="topbar-user">MT</div>
          </div>
        </header>

        <div className="page-frame">
          <div className="demo-note"><Sparkles size={14} /><span>Prototipo de demostración</span><span className="demo-note-dot">·</span><span>Los cambios se guardan solo en este navegador</span></div>
          <Routes>
            <Route path="/" element={<Dashboard onReceive={() => openReceipt()} onAddProduct={() => setModal("product")} onSelectAsset={openAsset} />} />
            <Route path="/inventory" element={<InventoryPage onSelectAsset={openAsset} onAddAsset={() => setModal("asset")} />} />
            <Route path="/products" element={<ProductsPage onAdd={() => setModal("product")} />} />
            <Route path="/movements" element={<MovementsPage />} />
            <Route path="/purchases" element={<PurchasesPage onReceive={openReceipt} onToast={notify} />} />
            <Route path="/organization" element={<OrganizationPage onToast={notify} />} />
            <Route path="/assignments" element={<AssignmentsPage onToast={notify} />} />
            <Route path="/inspections" element={<InspectionsPage onToast={notify} />} />
            <Route path="/maintenance" element={<MaintenancePage onToast={notify} />} />
            <Route path="/reports" element={<ReportsPage onToast={notify} />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<SettingsPage onToast={notify} onResetDemo={() => {
              resetDemoValues({
                "atlas.products": seedProducts(), "atlas.assets": seedAssets(), "atlas.movements": seedMovements(),
                "atlas.assignments": assignmentSeed, "atlas.inspections": inspectionSeed, "atlas.workOrders": workOrderSeed,
                "atlas.purchases": purchaseSeed, "atlas.groups": organizationGroupSeed, "atlas.notifications": notificationSeed,
                "atlas.settings": settingsSeed,
              });
              queryClient.invalidateQueries();
              notify("Datos de demostración restaurados", "Las vistas volvieron a su estado inicial en este navegador.");
            }} />} />
            <Route path="*" element={<Dashboard onReceive={() => openReceipt()} onAddProduct={() => setModal("product")} onSelectAsset={openAsset} />} />
          </Routes>
          <footer className="page-footer"><span>© 2026 Atlas Ops</span><span className="footer-note"><span className="live-dot" /> Datos locales de demostración</span><a href="mailto:soporte@atlasops.co">Centro de ayuda</a></footer>
        </div>
      </main>

      {modal === "product" && <ProductModal onClose={() => setModal(null)} onSubmit={submitProduct} isPending={productMutation.isPending} error={productMutation.error?.message} />}
      {modal === "receipt" && <ReceiptModal purchaseCode={receiptPurchaseCode} onClose={() => { setModal(null); setReceiptPurchaseCode(undefined); }} onSubmit={submitReceipt} isPending={receiveMutation.isPending} error={receiveMutation.error?.message} />}
      {modal === "asset" && <AssetModal onClose={() => setModal(null)} onSubmit={(values) => assetMutation.mutate(values)} isPending={assetMutation.isPending} error={assetMutation.error?.message} />}
      {selectedAsset && <AssetDrawer asset={selectedAsset} onClose={closeAsset} onToast={notify} />}
      {toast && <div className="toast" role="status"><span className="toast-check"><Check size={16} /></span><span><strong>{toast.title}</strong><small>{toast.detail}</small></span><button className="icon-button" aria-label="Cerrar aviso" onClick={() => setToast(null)}><X size={16} /></button></div>}
    </div>
  );
}

function NavGroup({ title, children }: { title: string; children: ReactNode }) {
  return <div className="nav-group"><div className="nav-group-title">{title}</div>{children}</div>;
}

function SidebarLink({ item, onClick }: { item: (typeof navigation)[number]; onClick: () => void }) {
  const Icon = item.icon;
  return <NavLink to={item.to} onClick={onClick} className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
    <Icon size={17} strokeWidth={1.8} /><span>{item.label}</span>
    {item.count && <small className="nav-count">{item.count}</small>}
    {item.alert && <span className="nav-alert" />}
  </NavLink>;
}

function PageHeading({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow ?? "OPERACIONES · INVENTARIO"}</div><h1>{title}</h1><p>{description}</p></div><div className="heading-actions">{actions}</div></div>;
}

function Button({ children, variant = "secondary", onClick, type = "button", icon: Icon, disabled = false, buttonRef }: { children: ReactNode; variant?: "primary" | "secondary" | "text"; onClick?: () => void; type?: "button" | "submit"; icon?: typeof Plus; disabled?: boolean; buttonRef?: Ref<HTMLButtonElement> }) {
  return <button ref={buttonRef} type={type} disabled={disabled} className={`button button-${variant}`} onClick={onClick}>{Icon && <Icon size={16} strokeWidth={2} />}{children}</button>;
}

function Dashboard({ onReceive, onAddProduct, onSelectAsset }: { onReceive: () => void; onAddProduct: () => void; onSelectAsset: (asset: Asset, trigger?: HTMLElement) => void }) {
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: getProducts });
  const { data: assets = [] } = useQuery({ queryKey: ["assets"], queryFn: getAssets });
  const { data: movements = [] } = useQuery({ queryKey: ["movements"], queryFn: getMovements });
  const [period, setPeriod] = useState("Esta semana");
  const lowStock = products.filter((product) => product.stock <= product.minimum);
  const availableAssets = assets.filter((asset) => asset.status === "Disponible").length;
  const activityBuckets = movementBuckets(movements, period);
  const peakActivity = Math.max(1, ...activityBuckets.flatMap(({ incoming, outgoing }) => [incoming, outgoing]));
  const activityCount = activityBuckets.reduce((sum, bucket) => sum + bucket.incoming + bucket.outgoing, 0);
  return <>
    <PageHeading eyebrow={new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()).toLocaleUpperCase("es-CO")} title="Todo en su lugar." description="Este es el estado de tu inventario hoy." actions={<><Button onClick={onAddProduct} icon={Plus}>Nuevo producto</Button><Button variant="primary" onClick={onReceive} icon={PackagePlus}>Registrar ingreso</Button></>} />
    <section className="stat-grid" aria-label="Indicadores de inventario">
      <MetricCard label="Valor del inventario" value={currency(products.reduce((total, item) => total + item.value * item.stock, 0))} change="calculado" trend="up" note="según existencias y costo unitario" icon={Package} color="mint" />
      <MetricCard label="Activos registrados" value={String(assets.length)} change="en el demo" trend="up" note="en tu inventario local" icon={Boxes} color="blue" />
      <MetricCard label="Disponibles para asignar" value={String(availableAssets)} change="listos" trend="up" note="listos para entrega" icon={PackageCheck} color="violet" />
      <MetricCard label="Alertas de stock" value={String(lowStock.length)} change="bajo mínimo" trend="attention" note="productos con existencias iguales o inferiores al mínimo" icon={AlertTriangle} color="amber" />
    </section>
    <section className="overview-grid">
      <div className="surface-card movement-card">
        <div className="card-heading"><div><h2>Actividad de inventario</h2><p>Movimientos registrados durante el periodo</p></div><button className="select-control" onClick={() => setPeriod((current) => current === "Esta semana" ? "Este mes" : current === "Este mes" ? "Este trimestre" : "Esta semana")}>{period} <ChevronDown size={14} /></button></div>
        <div className="chart-legend"><span><i className="legend-dot legend-primary" />Ingresos y devoluciones</span><span><i className="legend-dot legend-secondary" />Otros movimientos</span><span className="chart-total"><strong>{activityCount}</strong><small>en el periodo</small></span></div>
        {activityCount === 0 ? <div className="empty-state chart-empty"><Activity size={20} /><strong>Sin movimientos en este periodo</strong><span>Cuando registres un ingreso, asignación o traslado, aparecerá aquí.</span></div> : <div className="chart-area" role="img" aria-label={`Movimientos reales del periodo ${period}: ${activityCount} en total`}>
          <div className="chart-y-labels"><span>{peakActivity}</span><span>{Math.ceil(peakActivity * .75)}</span><span>{Math.ceil(peakActivity * .5)}</span><span>{Math.ceil(peakActivity * .25)}</span><span>0</span></div>
          <div className="chart-plot"><div className="chart-gridlines"><i /><i /><i /><i /><i /></div><div className="chart-bars">{activityBuckets.map(({ label, incoming, outgoing }) => <div className="chart-day" key={label}><span className="bar bar-in" title={`${incoming} ingresos o devoluciones`} style={{ height: `${incoming ? Math.max(4, incoming / peakActivity * 100) : 0}%` }} /><span className="bar bar-out" title={`${outgoing} otros movimientos`} style={{ height: `${outgoing ? Math.max(4, outgoing / peakActivity * 100) : 0}%` }} /><small>{label}</small></div>)}</div></div>
        </div>}
      </div>
      <div className="surface-card alert-card">
        <div className="card-heading"><div><h2>Necesitan atención</h2><p>Productos por debajo del mínimo</p></div><span className="count-pill">{lowStock.length}</span></div>
        <div className="alert-list">
          {lowStock.slice(0, 4).map((product, index) => <div className="alert-row" key={product.id}><div className={`alert-product-icon alert-color-${index}`}><Package size={16} /></div><div className="alert-product-copy"><strong>{product.name}</strong><small>{product.code} <span>·</span> {product.category}</small></div><div className="alert-stock"><strong>{product.stock}</strong><small>mín. {product.minimum}</small></div></div>)}
        </div>
        <Link className="card-footer-link" to="/products">Ver alertas de stock <ArrowRight size={15} /></Link>
      </div>
    </section>
    <section className="surface-card table-card dashboard-assets">
      <div className="card-heading"><div><h2>Activos recientes</h2><p>Últimos elementos actualizados en tu organización</p></div><Link className="subtle-link" to="/inventory">Ver todo <ArrowRight size={15} /></Link></div>
      <AssetTable assets={assets.slice(0, 4)} onSelect={onSelectAsset} compact />
    </section>
    <section className="surface-card table-card recent-movements">
      <div className="card-heading"><div><h2>Últimos movimientos</h2><p>Actividad registrada recientemente</p></div><Link className="subtle-link" to="/movements">Ver actividad <ArrowRight size={15} /></Link></div>
      <MovementTable movements={movements.slice(0, 4)} compact />
    </section>
  </>;
}

function MetricCard({ label, value, change, trend, note, icon: Icon, color }: { label: string; value: string; change: string; trend: "up" | "attention"; note: string; icon: typeof Package; color: string }) {
  return <div className="metric-card"><div className={`metric-icon metric-${color}`}><Icon size={18} strokeWidth={1.8} /></div><div className="metric-label">{label}<span aria-label={`Información: ${note}`} title={note} className="help-dot">i</span></div><div className="metric-value-row"><strong>{value}</strong><span className={`metric-change ${trend === "attention" ? "change-attention" : ""}`}>{trend === "up" ? <ArrowUpRight size={13} /> : <AlertTriangle size={12} />}{change}</span></div><div className="metric-note">{note}</div></div>;
}

function InventoryPage({ onSelectAsset, onAddAsset }: { onSelectAsset: (asset: Asset, trigger?: HTMLElement) => void; onAddAsset: () => void }) {
  const { data: assets = [] } = useQuery({ queryKey: ["assets"], queryFn: getAssets });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [showFilters, setShowFilters] = useState(false);
  const [location, setLocation] = useState("Todas las ubicaciones");
  const [category, setCategory] = useState("Todas las categorías");
  const filters = ["Todos", "Disponible", "Asignado", "En mantenimiento", "Bloqueado"];
  const locations = ["Todas las ubicaciones", ...new Set(assets.map((asset) => asset.location))];
  const categories = ["Todas las categorías", ...new Set(assets.map((asset) => asset.category))];
  const activeFilterCount = Number(location !== "Todas las ubicaciones") + Number(category !== "Todas las categorías");
  const availableCount = assets.filter((asset) => asset.status === "Disponible").length;
  const assignedCount = assets.filter((asset) => asset.status === "Asignado").length;
  const reviewCount = assets.filter((asset) => asset.status === "En mantenimiento" || asset.status === "Bloqueado").length;
  const filtered = assets.filter((asset) => (filter === "Todos" || asset.status === filter)
    && (location === "Todas las ubicaciones" || asset.location === location)
    && (category === "Todas las categorías" || asset.category === category)
    && `${asset.name} ${asset.code} ${asset.serial} ${asset.assignedTo}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <PageHeading title="Inventario" description="Consulta y administra los activos físicos de tu organización." actions={<Button variant="primary" onClick={onAddAsset} icon={PackagePlus}>Registrar activo</Button>} />
    <div className="stat-grid stat-grid-small"><MetricCard label="Total de activos" value={String(assets.length)} change="en inventario" trend="up" note="unidades registradas" icon={Boxes} color="mint" /><MetricCard label="Disponibles" value={String(availableCount)} change="listos" trend="up" note="listos para asignar" icon={PackageCheck} color="blue" /><MetricCard label="Asignados" value={String(assignedCount)} change="en uso" trend="up" note="con responsable" icon={UserRound} color="violet" /><MetricCard label="Requieren revisión" value={String(reviewCount)} change="atención" trend="attention" note="inspección o mantenimiento" icon={ShieldAlert} color="amber" /></div>
    <div className="surface-card table-card full-table-card"><div className="card-heading table-toolbar"><div><h2>Activos físicos</h2><p>{filtered.length} elementos en tu inventario</p></div><div className="table-actions"><label className="table-search"><Search size={15} /><input aria-label="Buscar activo por nombre, serial o código" placeholder="Buscar activo, serial..." value={search} onChange={(event) => setSearch(event.target.value)} /></label><button className={`filter-button ${showFilters || activeFilterCount ? "filter-button-active" : ""}`} aria-expanded={showFilters} onClick={() => setShowFilters((open) => !open)}><SlidersHorizontal size={15} />Filtros{activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}</button><button className="icon-button filter-icon" aria-label="Más filtros" onClick={() => setShowFilters((open) => !open)}><Filter size={16} /></button></div></div><div className="filter-tabs">{filters.map((item) => <button key={item} onClick={() => setFilter(item)} className={filter === item ? "filter-tab active" : "filter-tab"}>{item}{item === "Bloqueado" && <span className="tab-count">1</span>}</button>)}</div>
      {showFilters && <div className="inventory-filter-panel"><label>Ubicación<select value={location} onChange={(event) => setLocation(event.target.value)}>{locations.map((item) => <option key={item}>{item}</option>)}</select></label><label>Categoría<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><button onClick={() => { setLocation("Todas las ubicaciones"); setCategory("Todas las categorías"); }}>Limpiar filtros</button></div>}
      <AssetTable assets={filtered} onSelect={onSelectAsset} /><TablePagination count={filtered.length} label="activos" /></div>
  </>;
}

function ProductsPage({ onAdd }: { onAdd: () => void }) {
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: getProducts });
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [category, setCategory] = useState("Todas las categorías");
  const [showIntro, setShowIntro] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const categories = ["Todas las categorías", ...new Set(products.map((item) => item.category))];
  const filtered = products.filter((product) => (category === "Todas las categorías" || product.category === category) && `${product.name} ${product.code} ${product.brand}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <PageHeading title="Productos" description="Gestiona el catálogo que define cómo se controla cada artículo." actions={<Button variant="primary" onClick={onAdd} icon={Plus}>Crear producto</Button>} />
    {showIntro && <div className="catalog-intro"><div className="catalog-intro-icon"><Package size={18} /></div><div><strong>Un catálogo claro, un inventario confiable</strong><p>Define cuáles artículos se controlan por unidad y cuáles por cantidad.</p></div><button className="intro-dismiss" aria-label="Cerrar información" onClick={() => setShowIntro(false)}><X size={15} /></button></div>}
    <div className="stat-grid stat-grid-small"><MetricCard label="Productos activos" value={String(products.length)} change="en catálogo" trend="up" note="productos registrados" icon={Package} color="mint" /><MetricCard label="Control individual" value={String(products.filter((item) => item.tracking === "Individual").length)} change="serial" trend="up" note="identificación por unidad" icon={Boxes} color="blue" /><MetricCard label="Control por cantidad" value={String(products.filter((item) => item.tracking === "Por cantidad").length)} change="stock" trend="up" note="existencias consolidadas" icon={PackageCheck} color="violet" /><MetricCard label="Bajo mínimo" value={String(products.filter((product) => product.stock <= product.minimum).length)} change="requieren acción" trend="attention" note="revisar abastecimiento" icon={AlertTriangle} color="amber" /></div>
    <div className="surface-card table-card full-table-card"><div className="card-heading table-toolbar"><div><h2>Catálogo de productos</h2><p>{filtered.length} resultados</p></div><div className="table-actions"><label className="table-search"><Search size={15} /><input aria-label="Buscar producto por nombre, código o marca" placeholder="Buscar por nombre, código o marca" value={search} onChange={(event) => { setSearch(event.target.value); setSearchParams(event.target.value ? { search: event.target.value } : {}, { replace: true }); }} /></label><select className="filter-select" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select><button className="filter-button" onClick={() => downloadCsv("catalogo-atlas.csv", ["Código", "Producto", "Categoría", "Marca", "Control", "Existencias", "Mínimo", "Ubicación", "Valor unitario"], filtered.map((item) => [item.code, item.name, item.category, item.brand, item.tracking, item.stock, item.minimum, item.location, item.value]))}><Download size={15} />Exportar</button></div></div>
      <div className="table-responsive" role="region" tabIndex={0} aria-label="Tabla desplazable; desliza o usa las flechas para ver todas las columnas"><table className="data-table"><thead><tr><th>Producto</th><th>Categoría</th><th>Control</th><th>Existencias</th><th>Ubicación</th><th>Actualizado</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{filtered.length === 0 ? <tr><td colSpan={7}><div className="empty-state"><Package size={20} /><strong>No encontramos productos</strong><span>Ajusta la búsqueda o limpia el filtro para ver el catálogo.</span></div></td></tr> : filtered.map((product) => <tr key={product.id}><td><div className="product-cell"><div className={`product-thumb ${product.category === "Computadores" ? "thumb-laptop" : product.category === "Monitores" ? "thumb-monitor" : product.category === "Periféricos" ? "thumb-peripheral" : "thumb-generic"}`}><Package size={17} /></div><div><strong>{product.name}</strong><small>{product.code} <span>·</span> {product.brand}</small></div></div></td><td><span className="category-label">{product.category}</span></td><td><span className={`tracking-label ${product.tracking === "Individual" ? "tracking-individual" : "tracking-quantity"}`}>{product.tracking}</span></td><td><StockIndicator stock={product.stock} minimum={product.minimum} /></td><td><span className="location-cell">{product.location}</span></td><td><span className="date-cell">{product.updatedAt}</span></td><td><button className="row-more" aria-label={`Ver ficha de ${product.name}`} onClick={() => setSelectedProduct(product)}><Ellipsis size={18} /></button></td></tr>)}</tbody></table></div><TablePagination count={filtered.length} label="productos" />
    </div>
    {selectedProduct && <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
  </>;
}

function MovementsPage() {
  const { data: movements = [] } = useQuery({ queryKey: ["movements"], queryFn: getMovements });
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [type, setType] = useState("Todos los tipos");
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
  const filtered = movements.filter((movement) => (type === "Todos los tipos" || movement.type === type) && `${movement.item} ${movement.code} ${movement.reference} ${movement.actor}`.toLowerCase().includes(search.toLowerCase()));
  const incoming = movements.filter((movement) => movement.type === "Ingreso" || movement.type === "Devolución").length;
  const outgoing = movements.filter((movement) => movement.type === "Asignación" || movement.type === "Traslado").length;
  return <><PageHeading title="Movimientos" description="Cada ingreso, salida y traslado queda trazado de principio a fin." actions={<Button icon={Download} onClick={() => downloadCsv("movimientos-atlas.csv", ["Referencia", "Movimiento", "Código", "Tipo", "Cantidad", "Origen", "Destino", "Responsable", "Fecha"], filtered.map((item) => [item.reference, item.item, item.code, item.type, item.quantity, item.from, item.to, item.actor, item.date]))}>Exportar historial</Button>} /><div className="stat-grid stat-grid-small"><MetricCard label="Movimientos registrados" value={String(movements.length)} change="en el demo" trend="up" note="historial local" icon={Activity} color="mint" /><MetricCard label="Ingresos" value={String(incoming)} change="recibidos" trend="up" note="ingresos y devoluciones" icon={ArrowDownLeft} color="blue" /><MetricCard label="Salidas" value={String(outgoing)} change="despachados" trend="up" note="asignaciones y traslados" icon={ArrowUpRight} color="violet" /><MetricCard label="Ajustes" value={String(movements.filter((movement) => movement.type === "Ajuste").length)} change="trazables" trend="attention" note="correcciones de stock" icon={CalendarClock} color="amber" /></div><div className="surface-card table-card full-table-card"><div className="card-heading table-toolbar"><div><h2>Registro de actividad</h2><p>{filtered.length} movimientos con trazabilidad por usuario y documento</p></div><div className="table-actions"><label className="table-search"><Search size={15} /><input aria-label="Buscar movimiento por artículo, código o referencia" placeholder="Buscar movimiento..." value={search} onChange={(event) => { setSearch(event.target.value); setSearchParams(event.target.value ? { search: event.target.value } : {}, { replace: true }); }} /></label><select className="filter-select" aria-label="Filtrar por tipo" value={type} onChange={(event) => setType(event.target.value)}>{["Todos los tipos", "Ingreso", "Asignación", "Devolución", "Traslado", "Ajuste"].map((item) => <option key={item}>{item}</option>)}</select></div></div><MovementTable movements={filtered} onSelect={setSelectedMovement} /><TablePagination count={filtered.length} label="movimientos" /></div>{selectedMovement && <MovementDetailModal movement={selectedMovement} onClose={() => setSelectedMovement(null)} />}</>;
}

function PurchasesPage({ onReceive, onToast }: { onReceive: (purchaseCode?: string) => void; onToast: (title: string, detail?: string) => void }) {
  const [orders, setOrders] = usePersistentValue("atlas.purchases", purchaseSeed);
  const { data: catalog = [] } = useQuery({ queryKey: ["products"], queryFn: getProducts });
  useEffect(() => {
    // Old demo orders had free-form status buttons without inventory receipts. Restore their canonical seed state when adding line-level data.
    if (!orders.some((order) => order.schemaVersion !== 2 && purchaseSeed.some((seed) => seed.code === order.code && seed.lines?.length))) return;
    setOrders(orders.map((order) => {
      const seed = purchaseSeed.find((item) => item.code === order.code);
      return order.schemaVersion !== 2 && seed?.lines ? { ...order, items: seed.items, total: seed.total, status: seed.status, lines: seed.lines, schemaVersion: 2 } : order;
    }));
  }, [orders]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Todos los estados");
  const [creating, setCreating] = useState(false);
  const statuses = ["Todos los estados", ...new Set(orders.map((order) => order.status))];
  const filtered = orders.filter((order) => (status === "Todos los estados" || order.status === status) && `${order.code} ${order.vendor} ${order.items}`.toLowerCase().includes(search.toLowerCase()));
  const readyOrder = orders.find((order) => (order.status === "Aprobada" || order.status === "Parcialmente recibida") && order.lines?.length);
  const pendingApproval = orders.filter((order) => order.status === "Pendiente de aprobación").length;
  const openOrders = orders.filter((order) => order.status !== "Recibida").length;
  const saveOrder = (values: PurchaseOrderDraft) => {
    const currentOrders = readPersistentSnapshot("atlas.purchases", orders);
    const sequence = Math.max(0, ...currentOrders.map((order) => Number(order.code.split("-").at(-1)) || 0)) + 1;
    const lines = values.lines.map((draft) => {
      const product = catalog.find((item) => item.id === draft.productId)!;
      return { productId: product.id, productName: product.name, productCode: product.code, quantity: draft.quantity, received: 0, unitValue: product.value };
    });
    const total = lines.reduce((sum, line) => sum + line.quantity * line.unitValue, 0);
    const order: PurchaseOrder = {
      code: `OC-${new Date().getFullYear()}-${String(sequence).padStart(4, "0")}`, vendor: values.vendor.trim(),
      date: "Hoy", due: displayDate(values.due), items: `${lines.length} ${lines.length === 1 ? "producto" : "productos"} · ${lines.reduce((sum, line) => sum + line.quantity, 0)} unidades`, total: currency(total), status: "Pendiente de aprobación", lines, schemaVersion: 2,
    };
    setOrders((current) => [order, ...current]);
    setCreating(false);
    onToast("Orden creada", `${order.code} · ${order.vendor}`);
  };
  const advanceOrder = (order: PurchaseOrder) => {
    if (order.status !== "Pendiente de aprobación") return;
    const nextStatus = "Aprobada";
    setOrders((current) => current.map((item) => item.code === order.code ? { ...item, status: nextStatus } : item));
    onToast("Estado actualizado", `${order.code} · ${nextStatus}`);
  };
  return <>
    <PageHeading eyebrow="ABASTECIMIENTO" title="Compras" description="Sigue cada orden desde la aprobación hasta la recepción física." actions={<Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>Nueva orden</Button>} />
    <div className="stat-grid stat-grid-small"><MetricCard label="Órdenes abiertas" value={String(openOrders)} change="en proceso" trend="up" note="con seguimiento activo" icon={Truck} color="mint" /><MetricCard label="Por recibir" value={String(orders.filter((order) => order.status === "Aprobada" || order.status === "Parcialmente recibida").length)} change="órdenes" trend="up" note="con ingreso pendiente" icon={PackagePlus} color="blue" /><MetricCard label="Aprobaciones pendientes" value={String(pendingApproval)} change="requieren acción" trend="attention" note="por revisar" icon={CalendarClock} color="amber" /><MetricCard label="Órdenes del periodo" value={String(orders.length)} change="registradas" trend="up" note="en este navegador" icon={PackageCheck} color="violet" /></div>
    {readyOrder && <div className="purchase-spotlight"><div className="spotlight-icon"><PackageCheck size={20} /></div><div><span className="spotlight-kicker">SIGUIENTE PASO</span><strong>{readyOrder.code} tiene unidades pendientes</strong><p>{readyOrder.vendor} · {readyOrder.items} · {readyOrder.total}</p></div><Button variant="primary" onClick={() => onReceive(readyOrder.code)}>Registrar recepción <ArrowRight size={15} /></Button></div>}
    {orders.some((order) => ["Aprobada", "Parcialmente recibida"].includes(order.status) && !order.lines?.length) && <div className="purchase-legacy-note">Algunas órdenes guardadas antes del detalle por línea no se pueden vincular a una recepción. Crea una orden nueva o restaura los datos de demo para usar recepción parcial por producto.</div>}
    <div className="surface-card table-card full-table-card"><div className="card-heading table-toolbar"><div><h2>Órdenes de compra</h2><p>{filtered.length} órdenes en el registro</p></div><div className="table-actions"><label className="table-search"><Search size={15} /><input aria-label="Buscar orden de compra por código o proveedor" placeholder="Buscar orden o proveedor" value={search} onChange={(event) => setSearch(event.target.value)} /></label><select className="filter-select" aria-label="Filtrar por estado" value={status} onChange={(event) => setStatus(event.target.value)}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></div></div><div className="table-responsive" role="region" tabIndex={0} aria-label="Tabla desplazable; desliza o usa las flechas para ver todas las columnas"><table className="data-table"><thead><tr><th>Orden</th><th>Proveedor</th><th>Fecha estimada</th><th>Productos</th><th>Total</th><th>Estado</th><th /></tr></thead><tbody>{filtered.map((order) => { const canReceive = order.status !== "Recibida" && order.lines?.length; return <tr key={order.code}><td><strong className="order-code">{order.code}</strong><small className="table-subtext">Creada {order.date}</small></td><td><div className="vendor-cell"><span className="vendor-mark">{order.vendor.slice(0, 1)}</span><strong>{order.vendor}</strong></div></td><td>{order.due}</td><td><span className="date-cell">{order.items}</span></td><td><strong>{order.total}</strong></td><td><StatusBadge label={order.status} /></td><td><button className="row-more" aria-label={order.status === "Pendiente de aprobación" ? `Aprobar ${order.code}` : canReceive ? `Recibir ${order.code}` : `Sin detalle de recepción por línea: ${order.code}`} title={!order.lines?.length ? "Esta orden histórica no tiene líneas detalladas." : undefined} disabled={!canReceive} onClick={() => order.status === "Pendiente de aprobación" ? advanceOrder(order) : onReceive(order.code)}>{order.status === "Pendiente de aprobación" ? <Check size={16} /> : <PackagePlus size={16} />}</button></td></tr>; })}</tbody></table></div><TablePagination count={filtered.length} label="órdenes" /></div>
    {creating && <PurchaseOrderModal products={catalog} onClose={() => setCreating(false)} onSubmit={saveOrder} />}
  </>;
}

function PurchaseOrderModal({ products, onClose, onSubmit }: { products: Product[]; onClose: () => void; onSubmit: (draft: PurchaseOrderDraft) => void }) {
  const [vendor, setVendor] = useState("");
  const [due, setDue] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<Array<{ id: string; productId: string; quantity: number }>>(() => [{ id: "line-" + Date.now(), productId: products[0]?.id ?? "", quantity: 1 }]);
  const [error, setError] = useState("");
  const total = lines.reduce((sum, line) => sum + (products.find((product) => product.id === line.productId)?.value ?? 0) * line.quantity, 0);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selected = lines.map((line) => products.find((product) => product.id === line.productId));
    if (!vendor.trim()) { setError("Escribe el proveedor."); return; }
    if (!due) { setError("Selecciona la fecha estimada."); return; }
    if (!lines.length || selected.some((product) => !product)) { setError("Selecciona un producto para cada línea."); return; }
    if (lines.some((line) => !Number.isInteger(line.quantity) || line.quantity < 1)) { setError("Cada cantidad debe ser un número entero mayor que cero."); return; }
    if (new Set(lines.map((line) => line.productId)).size !== lines.length) { setError("Cada producto debe aparecer una sola vez en la orden. Ajusta su cantidad en la línea existente."); return; }
    setError("");
    onSubmit({ vendor: vendor.trim(), due, lines: lines.map(({ productId, quantity }) => ({ productId, quantity })) });
  };
  return <Modal title="Nueva orden de compra" subtitle="Agrega productos del catálogo y define sus cantidades." onClose={onClose} className="purchase-order-dialog">
    <form className="modal-form" onSubmit={submit}>
      <div className="form-two"><FormField label="Proveedor"><input autoFocus placeholder="Ej. TechData Colombia" value={vendor} onChange={(event) => setVendor(event.target.value)} /></FormField><FormField label="Fecha estimada de entrega"><input type="date" value={due} onChange={(event) => setDue(event.target.value)} /></FormField></div>
      <div className="purchase-line-editor-heading"><div><strong>Productos solicitados</strong><small>La cantidad recibida se controla desde la recepción.</small></div><button type="button" className="filter-button" disabled={!products.length} onClick={() => setLines((current) => [...current, { id: "line-" + Date.now() + "-" + current.length, productId: products.find((product) => !current.some((line) => line.productId === product.id))?.id ?? "", quantity: 1 }])}><Plus size={14} />Agregar línea</button></div>
      {!products.length && <div className="receipt-empty-catalog">Crea al menos un producto en el catálogo antes de armar la orden.</div>}
      <div className="purchase-line-editor">{lines.map((line, index) => {
        const product = products.find((item) => item.id === line.productId);
        return <div className="purchase-line-row" key={line.id}><span className="purchase-line-index">{String(index + 1).padStart(2, "0")}</span><FormField label={"Producto " + (index + 1)}><select value={line.productId} onChange={(event) => setLines((current) => current.map((item) => item.id === line.id ? { ...item, productId: event.target.value } : item))}><option value="">Selecciona del catálogo</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}</select></FormField><FormField label="Cantidad"><input type="number" min="1" step="1" value={line.quantity} onChange={(event) => setLines((current) => current.map((item) => item.id === line.id ? { ...item, quantity: Number(event.target.value) } : item))} /></FormField><span className="purchase-line-value">{product ? currency(product.value * line.quantity) : "—"}</span><button type="button" className="receipt-remove-line" aria-label={"Eliminar línea " + (index + 1)} disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}><X size={15} /></button></div>;
      })}</div>
      <div className="purchase-order-total"><span>Total estimado</span><strong>{currency(total)}</strong></div>
      {error && <div className="form-error" role="alert"><AlertTriangle size={15} />{error}</div>}
      <div className="modal-actions"><Button onClick={onClose}>Cancelar</Button><Button type="submit" variant="primary" icon={Check} disabled={!products.length}>Crear orden</Button></div>
    </form>
  </Modal>;
}

function AssignmentsPage({ onToast }: { onToast: (title: string, detail?: string) => void }) {
  const [rows, setRows] = usePersistentValue("atlas.assignments", assignmentSeed);
  const [groups] = usePersistentValue("atlas.groups", organizationGroupSeed);
  const { data: assets = [] } = useQuery({ queryKey: ["assets"], queryFn: getAssets });
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Todos los estados");
  const [creating, setCreating] = useState(false);
  const availableAssets = assets.filter((asset) => asset.status === "Disponible");
  const filtered = rows.filter((row) => (status === "Todos los estados" || row.status === status) && `${row.ref} ${row.asset} ${row.recipient} ${row.group}`.toLowerCase().includes(search.toLowerCase()));
  const createAssignment = async (values: Record<string, string>) => {
    const currentAssets = await getAssets();
    const asset = currentAssets.find((item) => item.id === values.assetId && item.status === "Disponible");
    if (!asset) { onToast("Activo no disponible", "Actualiza la lista y elige un activo que esté libre."); return; }
    const currentRows = readPersistentSnapshot("atlas.assignments", rows);
    if (currentRows.some((row) => row.assetId === asset.id && row.status !== "Devuelta")) {
      onToast("La custodia ya existe", `${asset.name} ya tiene una asignación abierta.`);
      return;
    }
    const refNumber = Math.max(0, ...currentRows.map((row) => Number(row.ref.split("-").at(-1)) || 0)) + 1;
    const row: AssignmentRow = { ref: `ASI-${new Date().getFullYear()}-${String(refNumber).padStart(4, "0")}`, asset: asset.name, assetId: asset.id, recipient: values.recipient.trim(), group: values.group.trim(), date: "Ahora", status: "Activa" };
    const movement: Movement = { id: `m-${Date.now()}`, type: "Asignación", item: asset.name, code: asset.code, quantity: "1 activo", from: asset.location, to: `${row.recipient} · ${row.group}`, actor: "Mariana Torres", date: "Ahora", reference: row.ref };
    const currentMovements = await getMovements();
    const nextRows = [row, ...currentRows];
    writeDemoValues({
      "atlas.assets": currentAssets.map((item) => item.id === asset.id ? { ...item, status: "Asignado", assignedTo: row.recipient } : item),
      "atlas.movements": [movement, ...currentMovements],
      "atlas.assignments": nextRows,
    });
    setRows(nextRows);
    queryClient.invalidateQueries({ queryKey: ["assets"] });
    queryClient.invalidateQueries({ queryKey: ["movements"] });
    setCreating(false);
    onToast("Activo asignado", `${asset.name} · ${row.recipient}`);
  };
  const updateAssignment = async (row: AssignmentRow) => {
    const persistedRows = readPersistentSnapshot("atlas.assignments", rows);
    const persistedRow = persistedRows.find((item) => item.ref === row.ref);
    if (!persistedRow || persistedRow.status === "Devuelta" || persistedRow.status !== row.status) return;
    row = persistedRow;
    const currentAssets = await getAssets();
    const asset = currentAssets.find((item) => item.id === row.assetId);
    const pendingHandover = row.status === "Pendiente de firma" || row.status === "Pendiente de entrega";
    const nextStatus = pendingHandover ? "Activa" : "Devuelta";
    if (pendingHandover && !asset) {
      onToast("Activo no encontrado", "La asignación sigue pendiente hasta que se encuentre el activo.");
      return;
    }
    if (pendingHandover && asset?.status === "Asignado" && asset.assignedTo === row.recipient) {
      setRows((current) => current.map((item) => item.ref === row.ref ? { ...item, status: "Activa" } : item));
      onToast("Entrega confirmada", `${row.ref} · ${row.recipient}`);
      return;
    }
    if (pendingHandover && asset?.status !== "Disponible") {
      onToast("Activo no disponible", `${asset?.name ?? row.asset} ya no está libre para entregar.`);
      return;
    }
    if (pendingHandover && asset) {
      const movement: Movement = { id: `m-${Date.now()}`, type: "Asignación", item: asset.name, code: asset.code, quantity: "1 activo", from: asset.location, to: `${row.recipient} · ${row.group}`, actor: "Mariana Torres", date: "Ahora", reference: row.ref };
      const currentMovements = await getMovements();
      const nextRows = persistedRows.map((item) => item.ref === row.ref ? { ...item, status: "Activa" } : item);
      writeDemoValues({
        "atlas.assets": currentAssets.map((item) => item.id === asset.id ? { ...item, status: "Asignado", assignedTo: row.recipient } : item),
        "atlas.movements": [movement, ...currentMovements],
        "atlas.assignments": nextRows,
      });
      setRows(nextRows);
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["movements"] });
      onToast("Entrega confirmada", `${row.ref} · ${row.recipient}`);
      return;
    } else if (row.status === "Activa") {
      if (!asset || asset.status !== "Asignado" || asset.assignedTo !== row.recipient) {
        onToast("No se puede registrar la devolución", "La custodia del activo no coincide con esta asignación.");
        return;
      }
      const movement: Movement = { id: `m-${Date.now()}`, type: "Devolución", item: asset.name, code: asset.code, quantity: "1 activo", from: row.recipient, to: asset.location, actor: "Mariana Torres", date: "Ahora", reference: `DEV-${row.ref}` };
      const currentMovements = await getMovements();
      const nextRows = persistedRows.map((item) => item.ref === row.ref ? { ...item, status: "Devuelta" } : item);
      writeDemoValues({
        "atlas.assets": currentAssets.map((item) => item.id === asset.id ? { ...item, status: "Disponible", assignedTo: "—" } : item),
        "atlas.movements": [movement, ...currentMovements],
        "atlas.assignments": nextRows,
      });
      setRows(nextRows);
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["movements"] });
      onToast("Asignación actualizada", `${row.ref} · Devuelta`);
      return;
    } else {
      return;
    }
    setRows((current) => current.map((item) => item.ref === row.ref ? { ...item, status: nextStatus } : item));
    onToast("Asignación actualizada", `${row.ref} · ${nextStatus}`);
  };
  return <>
    <PageHeading eyebrow="CUSTODIA Y RESPONSABILIDAD" title="Asignaciones" description="Mantén claro quién tiene cada activo y cuándo debe devolverlo." actions={<Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>Nueva asignación</Button>} />
    <div className="stat-grid stat-grid-small"><MetricCard label="Asignaciones activas" value={String(rows.filter((row) => row.status === "Activa").length)} change="con responsable" trend="up" note="custodia vigente" icon={BriefcaseBusiness} color="mint" /><MetricCard label="Pendientes de entrega" value={String(rows.filter((row) => row.status === "Pendiente de entrega").length)} change="por confirmar" trend="up" note="actas por entregar" icon={PackageCheck} color="blue" /><MetricCard label="Devoluciones pendientes" value={String(rows.filter((row) => row.status === "Activa").length)} change="seguimiento" trend="attention" note="en custodia" icon={ArrowDownLeft} color="amber" /><MetricCard label="Actas sin firmar" value={String(rows.filter((row) => row.status === "Pendiente de firma").length)} change="por confirmar" trend="attention" note="esperando confirmación" icon={ClipboardCheck} color="violet" /></div>
    <div className="surface-card table-card full-table-card"><div className="card-heading table-toolbar"><div><h2>Actividad reciente</h2><p>{filtered.length} asignaciones, entregas y devoluciones</p></div><div className="table-actions"><label className="table-search"><Search size={15} /><input aria-label="Buscar asignación por persona, activo o referencia" placeholder="Buscar persona o activo" value={search} onChange={(event) => setSearch(event.target.value)} /></label><select className="filter-select" aria-label="Filtrar asignaciones" value={status} onChange={(event) => setStatus(event.target.value)}>{["Todos los estados", ...new Set(rows.map((row) => row.status))].map((item) => <option key={item}>{item}</option>)}</select></div></div><div className="table-responsive" role="region" tabIndex={0} aria-label="Tabla desplazable; desliza o usa las flechas para ver todas las columnas"><table className="data-table"><thead><tr><th>Referencia</th><th>Activo</th><th>Responsable</th><th>Grupo</th><th>Fecha</th><th>Estado</th><th /></tr></thead><tbody>{filtered.map((row) => <tr key={row.ref}><td><strong className="order-code">{row.ref}</strong></td><td><strong>{row.asset}</strong></td><td><div className="person-cell"><span className="person-avatar">{row.recipient.split(" ").map((part) => part[0]).slice(0,2).join("")}</span>{row.recipient}</div></td><td>{row.group}</td><td>{row.date}</td><td><StatusBadge label={row.status} /></td><td><button className="row-more" aria-label={row.status === "Pendiente de firma" || row.status === "Pendiente de entrega" ? `Confirmar ${row.ref}` : `Registrar devolución de ${row.ref}`} disabled={row.status === "Devuelta"} onClick={() => void updateAssignment(row)}><Check size={16} /></button></td></tr>)}</tbody></table></div><TablePagination count={filtered.length} label="asignaciones" /></div>
    {creating && <QuickFormModal title="Nueva asignación" subtitle="Selecciona un activo disponible y define quién queda a cargo." submitLabel="Asignar activo" onClose={() => setCreating(false)} onSubmit={(values) => createAssignment(values)} fields={[{ name: "assetId", label: "Activo disponible", type: "select", options: availableAssets.map((asset) => ({ value: asset.id, label: `${asset.name} · ${asset.code}` })) }, { name: "recipient", label: "Responsable", placeholder: "Nombre de la persona o equipo" }, { name: "group", label: "Grupo", type: "select", options: groups.map((group) => group.name) }]} />}
  </>;
}

function InspectionsPage({ onToast }: { onToast: (title: string, detail?: string) => void }) {
  const [rows, setRows] = usePersistentValue("atlas.inspections", inspectionSeed);
  const { data: assets = [] } = useQuery({ queryKey: ["assets"], queryFn: getAssets });
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Todos los estados");
  const [creating, setCreating] = useState(false);
  const [completing, setCompleting] = useState<InspectionRow | null>(null);
  const [resolving, setResolving] = useState<InspectionRow | null>(null);
  const overdue = rows.filter((row) => row.status === "Vencida");
  const criticalIncidents = rows.filter((row) => row.result === "Incidencia crítica" && !row.incidentResolved);
  const filtered = rows.filter((row) => (status === "Todos los estados" || row.status === status) && `${row.asset} ${row.code} ${row.type} ${row.responsible}`.toLowerCase().includes(search.toLowerCase()));
  const scheduleInspection = (values: Record<string, string>) => {
    const asset = assets.find((item) => item.id === values.assetId);
    if (!asset) { onToast("Selecciona un activo", "El activo no está disponible para programar."); return; }
    const due = new Date(`${values.due}T12:00:00`);
    if (Number.isNaN(due.getTime())) { onToast("Fecha inválida", "Selecciona una fecha válida para la inspección."); return; }
    const isOverdue = due < new Date(new Date().toDateString());
    const currentRows = readPersistentSnapshot("atlas.inspections", rows);
    if (currentRows.some((item) => item.code === asset.code && item.type === values.type && item.status !== "Realizada")) {
      onToast("Inspección ya programada", `${asset.name} ya tiene una revisión abierta de este tipo.`);
      return;
    }
    const row: InspectionRow = { id: `INS-${Date.now()}`, asset: asset.name, code: asset.code, type: values.type, responsible: values.responsible.trim(), due: displayDate(values.due), status: isOverdue ? "Vencida" : "Programada" };
    setRows((current) => [row, ...current]);
    setCreating(false);
    onToast(isOverdue ? "Inspección creada como vencida" : "Inspección programada", `${asset.name} · ${row.due}`);
  };
  const completeInspection = (row: InspectionRow, values: Record<string, string>) => {
    if (row.status === "Realizada") return;
    if (values.result !== "Conforme" && !values.notes.trim()) { onToast("Agrega una observación", "Registra el hallazgo antes de completar una inspección no conforme."); return; }
    const currentRows = readPersistentSnapshot("atlas.inspections", rows);
    const critical = values.result === "Incidencia crítica";
    const currentAsset = assets.find((asset) => asset.code === row.code);
    if (critical && !currentAsset) { onToast("No se encontró el activo", "Actualiza la inspección e inténtalo de nuevo."); return; }
    const nextRows = currentRows.map((item) => (item.id ?? item.code) === (row.id ?? row.code)
      ? { ...item, status: "Realizada", result: values.result, notes: values.notes.trim(), ...(critical ? { previousAssetStatus: currentAsset?.status, previousAssignee: currentAsset?.assignedTo } : {}) }
      : item);
    const nextAssets = assets.map((asset) => asset.code === row.code && critical ? { ...asset, status: "Bloqueado" as const } : asset);
    writeDemoValues({ "atlas.inspections": nextRows, ...(critical ? { "atlas.assets": nextAssets } : {}) });
    setRows(nextRows);
    if (critical) queryClient.invalidateQueries({ queryKey: ["assets"] });
    setCompleting(null);
    onToast(critical ? "Inspección completada · activo bloqueado" : "Inspección completada", `${row.asset} · ${values.result}`);
  };
  const resolveIncident = (row: InspectionRow, values: Record<string, string>) => {
    if (!values.notes.trim()) { onToast("Agrega la resolución", "Describe la revisión realizada antes de liberar la incidencia."); return; }
    const currentRows = readPersistentSnapshot("atlas.inspections", rows);
    const currentRow = currentRows.find((item) => (item.id ?? item.code) === (row.id ?? row.code));
    const currentAsset = assets.find((asset) => asset.code === row.code);
    if (!currentRow || currentRow.incidentResolved || !currentAsset || currentAsset.status !== "Bloqueado") {
      onToast("No se puede liberar este activo", "La incidencia o el estado del activo ya cambió. Actualiza la vista."); return;
    }
    const nextRows = currentRows.map((item) => (item.id ?? item.code) === (row.id ?? row.code) ? { ...item, incidentResolved: true, resolutionNotes: values.notes.trim() } : item);
    const nextAssets = assets.map((asset) => asset.code === row.code ? { ...asset, status: currentRow.previousAssetStatus ?? "Disponible", assignedTo: currentRow.previousAssignee ?? "—" } : asset);
    writeDemoValues({ "atlas.inspections": nextRows, "atlas.assets": nextAssets });
    setRows(nextRows);
    queryClient.invalidateQueries({ queryKey: ["assets"] });
    setResolving(null);
    onToast("Incidencia resuelta", `${row.asset} · ${row.code}`);
  };
  return <>
    <PageHeading eyebrow="SEGURIDAD OPERACIONAL" title="Inspecciones" description="Prevén incidentes con revisiones a tiempo y evidencias claras." actions={<Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>Programar inspección</Button>} />
    {(overdue.length > 0 || criticalIncidents.length > 0) && <div className="inspection-alert"><div className="alert-pulse"><AlertTriangle size={19} /></div><div><strong>{criticalIncidents.length + overdue.length} {criticalIncidents.length + overdue.length === 1 ? "atención requerida" : "atenciones requeridas"}</strong><p>{criticalIncidents[0] ? `${criticalIncidents[0].asset} está bloqueado por una incidencia crítica.` : `${overdue[0].asset} requiere una inspección prioritaria.`}</p></div><button className="subtle-link" onClick={() => setStatus(criticalIncidents[0] ? "Realizada" : "Vencida")}>Ver incidencias <ArrowRight size={15} /></button></div>}
    <div className="stat-grid stat-grid-small"><MetricCard label="Programadas" value={String(rows.filter((row) => row.status === "Programada" || row.status === "Pendiente").length)} change="en agenda" trend="up" note="por realizar" icon={CalendarClock} color="blue" /><MetricCard label="Completadas" value={String(rows.filter((row) => row.status === "Realizada").length)} change="registradas" trend="up" note="con evidencia" icon={ClipboardCheck} color="mint" /><MetricCard label="Incidencias abiertas" value={String(criticalIncidents.length + overdue.length)} change="requieren acción" trend="attention" note="activos por revisar" icon={ShieldAlert} color="amber" /><MetricCard label="Cumplimiento" value={`${rows.length ? Math.round(rows.filter((row) => row.status === "Realizada").length / rows.length * 100) : 0}%`} change="en el demo" trend="up" note="inspecciones realizadas" icon={Check} color="violet" /></div>
    <div className="surface-card table-card full-table-card"><div className="card-heading table-toolbar"><div><h2>Agenda de inspecciones</h2><p>{filtered.length} revisiones · Zona horaria Bogotá</p></div><div className="table-actions"><label className="table-search"><Search size={15} /><input aria-label="Buscar inspección por activo o responsable" placeholder="Buscar activo o responsable" value={search} onChange={(event) => setSearch(event.target.value)} /></label><select className="filter-select" aria-label="Filtrar inspecciones" value={status} onChange={(event) => setStatus(event.target.value)}>{["Todos los estados", ...new Set(rows.map((row) => row.status))].map((item) => <option key={item}>{item}</option>)}</select></div></div><div className="table-responsive" role="region" tabIndex={0} aria-label="Tabla desplazable; desliza o usa las flechas para ver todas las columnas"><table className="data-table"><thead><tr><th>Activo</th><th>Tipo de inspección</th><th>Responsable</th><th>Fecha límite</th><th>Resultado</th><th>Estado</th><th /></tr></thead><tbody>{filtered.length === 0 && <tr><td colSpan={7}><div className="empty-state"><ClipboardCheck size={20} /><strong>No hay inspecciones que coincidan</strong><span>Ajusta la búsqueda o programa una revisión para empezar.</span></div></td></tr>}{filtered.map((row) => { const canResolve = row.result === "Incidencia crítica" && !row.incidentResolved; return <tr key={row.id ?? row.code}><td><div><strong>{row.asset}</strong><small className="table-subtext">{row.code}</small></div></td><td>{row.type}</td><td><div className="person-cell"><span className="person-avatar">{row.responsible.split(" ").map((part) => part[0]).slice(0,2).join("")}</span>{row.responsible}</div></td><td>{row.due}</td><td>{row.result ? <span title={row.notes}>{row.result}</span> : <span className="unassigned">Pendiente</span>}</td><td><StatusBadge label={row.status} /></td><td><button className="row-more" aria-label={canResolve ? `Resolver incidencia de ${row.asset}` : `Completar inspección de ${row.asset}`} disabled={row.status === "Realizada" && !canResolve} onClick={() => canResolve ? setResolving(row) : setCompleting(row)}><Check size={16} /></button></td></tr>; })}</tbody></table></div><TablePagination count={filtered.length} label="inspecciones" /></div>
    {creating && <QuickFormModal title="Programar inspección" subtitle="Crea una revisión y asigna quién la realizará." submitLabel="Programar" onClose={() => setCreating(false)} onSubmit={scheduleInspection} fields={[{ name: "assetId", label: "Activo", type: "select", options: assets.map((asset) => ({ value: asset.id, label: `${asset.name} · ${asset.code}` })) }, { name: "type", label: "Tipo de inspección", type: "select", options: ["Inspección general", "Lista de chequeo", "Inspección preoperacional", "Verificación preventiva"] }, { name: "responsible", label: "Responsable", placeholder: "Nombre del responsable" }, { name: "due", label: "Fecha programada", type: "date" }]} initialValues={{ due: new Date().toISOString().slice(0, 10) }} />}
    {completing && <QuickFormModal title="Completar inspección" subtitle={`${completing.asset} · ${completing.type}`} submitLabel="Guardar resultado" onClose={() => setCompleting(null)} onSubmit={(values) => completeInspection(completing, values)} fields={[{ name: "result", label: "Resultado", type: "select", options: ["Conforme", "Con observaciones", "Incidencia crítica"] }, { name: "notes", label: "Observaciones / evidencia", type: "textarea", placeholder: "Describe el resultado o el hallazgo", required: false }]} initialValues={{ result: "Conforme" }} />}
    {resolving && <QuickFormModal title="Resolver incidencia crítica" subtitle={`${resolving.asset} · ${resolving.code}`} submitLabel="Registrar resolución y liberar" onClose={() => setResolving(null)} onSubmit={(values) => resolveIncident(resolving, values)} fields={[{ name: "notes", label: "Resolución / evidencia", type: "textarea", placeholder: "Describe la corrección y verificación realizada" }]} />}
  </>;
}

function MaintenancePage({ onToast }: { onToast: (title: string, detail?: string) => void }) {
  const [rows, setRows] = usePersistentValue("atlas.workOrders", workOrderSeed);
  const { data: assets = [] } = useQuery({ queryKey: ["assets"], queryFn: getAssets });
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Todos los estados");
  const [creating, setCreating] = useState(false);
  const filtered = rows.filter((row) => (status === "Todos los estados" || row.status === status) && `${row.ref} ${row.asset} ${row.issue} ${row.owner}`.toLowerCase().includes(search.toLowerCase()));
  const createWorkOrder = async (values: Record<string, string>) => {
    const currentAssets = await getAssets();
    const asset = currentAssets.find((item) => item.id === values.assetId);
    if (!asset && !values.assetName.trim()) { onToast("Selecciona un activo", "Elige un activo registrado o escribe el nombre de uno externo."); return; }
    const currentRows = readPersistentSnapshot("atlas.workOrders", rows);
    if (asset && currentRows.some((row) => row.assetId === asset.id && row.status !== "Completado")) {
      onToast("Ya existe una orden abierta", `${asset.name} tiene una intervención pendiente.`);
      return;
    }
    const number = Math.max(0, ...currentRows.map((row) => Number(row.ref.split("-").at(-1)) || 0)) + 1;
    const row: WorkOrder = {
      ref: `OT-${new Date().getFullYear()}-${String(number).padStart(4, "0")}`, asset: asset?.name ?? values.assetName.trim(), assetId: asset?.id,
      previousStatus: asset?.status, previousAssignee: asset?.assignedTo, issue: values.issue.trim(), owner: values.owner.trim(), scheduled: displayDate(values.scheduled),
      status: "Programado", cost: Number(values.cost) || 0,
    };
    const nextRows = [row, ...currentRows];
    writeDemoValues({
      "atlas.workOrders": nextRows,
      ...(asset ? { "atlas.assets": currentAssets.map((item) => item.id === asset.id ? { ...item, status: "En mantenimiento", assignedTo: "Mantenimiento" } : item) } : {}),
    });
    setRows(nextRows);
    if (asset) queryClient.invalidateQueries({ queryKey: ["assets"] });
    setCreating(false);
    onToast("Orden de trabajo creada", `${row.ref} · ${row.asset}`);
  };
  const advanceWorkOrder = async (row: WorkOrder) => {
    if (row.status === "Completado") return;
    const flow = ["Programado", "En proceso", "Esperando repuesto", "Completado"];
    const statusIndex = flow.indexOf(row.status);
    if (statusIndex < 0) return;
    const nextStatus = flow[Math.min(statusIndex + 1, flow.length - 1)];
    let nextAssets = await getAssets();
    if (nextStatus === "Completado" && row.assetId && row.previousStatus) {
      const currentAsset = nextAssets.find((item) => item.id === row.assetId);
      const currentRows = readPersistentSnapshot("atlas.workOrders", rows);
      const currentOrder = currentRows.find((item) => item.ref === row.ref);
      if (!currentOrder || currentOrder.status !== row.status) return;
      const otherOpenOrder = currentRows.some((item) => item.ref !== row.ref && item.assetId === row.assetId && item.status !== "Completado");
      if (currentAsset?.status === "En mantenimiento" && !otherOpenOrder) {
        nextAssets = nextAssets.map((item) => item.id === row.assetId ? { ...item, status: row.previousStatus!, assignedTo: row.previousAssignee ?? "—" } : item);
      }
    }
    const nextRows = readPersistentSnapshot("atlas.workOrders", rows).map((item) => item.ref === row.ref ? { ...item, status: nextStatus } : item);
    writeDemoValues({ "atlas.workOrders": nextRows, ...(nextStatus === "Completado" && row.assetId ? { "atlas.assets": nextAssets } : {}) });
    if (nextStatus === "Completado" && row.assetId) await queryClient.invalidateQueries({ queryKey: ["assets"] });
    setRows(nextRows);
    onToast("Orden actualizada", `${row.ref} · ${nextStatus}`);
  };
  const activeCount = rows.filter((row) => row.status !== "Completado").length;
  const workshopCount = rows.filter((row) => row.assetId && assets.find((asset) => asset.id === row.assetId)?.status === "En mantenimiento").length;
  const totalCost = rows.reduce((sum, row) => sum + (row.cost ?? 0), 0);
  return <>
    <PageHeading eyebrow="DISPONIBILIDAD DE ACTIVOS" title="Mantenimiento" description="Planifica intervenciones y conserva el historial de cada activo." actions={<Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>Crear orden de trabajo</Button>} />
    <div className="stat-grid stat-grid-small"><MetricCard label="Órdenes abiertas" value={String(activeCount)} change="en seguimiento" trend="up" note="intervenciones activas" icon={Wrench} color="mint" /><MetricCard label="Activos en taller" value={String(workshopCount)} change="fuera de operación" trend="up" note="en mantenimiento" icon={Settings2} color="blue" /><MetricCard label="Por programar" value={String(rows.filter((row) => row.status === "Programado").length)} change="pendientes" trend="attention" note="requieren fecha" icon={CalendarClock} color="amber" /><MetricCard label="Costo registrado" value={currency(totalCost)} change="acumulado" trend="up" note="órdenes del prototipo" icon={Activity} color="violet" /></div>
    <div className="surface-card table-card full-table-card"><div className="card-heading table-toolbar"><div><h2>Órdenes de trabajo</h2><p>{filtered.length} órdenes en el ciclo actual</p></div><div className="table-actions"><label className="table-search"><Search size={15} /><input aria-label="Buscar mantenimiento por activo u orden" placeholder="Buscar activo u orden" value={search} onChange={(event) => setSearch(event.target.value)} /></label><select className="filter-select" aria-label="Filtrar órdenes" value={status} onChange={(event) => setStatus(event.target.value)}>{["Todos los estados", ...new Set(rows.map((row) => row.status))].map((item) => <option key={item}>{item}</option>)}</select></div></div><div className="table-responsive" role="region" tabIndex={0} aria-label="Tabla desplazable; desliza o usa las flechas para ver todas las columnas"><table className="data-table"><thead><tr><th>Orden</th><th>Activo / novedad</th><th>Responsable</th><th>Programación</th><th>Estado</th><th /></tr></thead><tbody>{filtered.length === 0 && <tr><td colSpan={6}><div className="empty-state"><Wrench size={20} /><strong>No hay órdenes que coincidan</strong><span>Ajusta la búsqueda o crea una orden de trabajo.</span></div></td></tr>}{filtered.map((row) => <tr key={row.ref}><td><strong className="order-code">{row.ref}</strong></td><td><div><strong>{row.asset}</strong><small className="table-subtext">{row.issue}</small></div></td><td>{row.owner}</td><td>{row.scheduled}</td><td><StatusBadge label={row.status} /></td><td><button className="row-more" aria-label={`Avanzar ${row.ref}`} disabled={row.status === "Completado"} onClick={() => void advanceWorkOrder(row)}><ArrowRight size={16} /></button></td></tr>)}</tbody></table></div><TablePagination count={filtered.length} label="órdenes" /></div>
    {creating && <QuickFormModal title="Crear orden de trabajo" subtitle="Describe la novedad, asigna responsable y agenda la intervención." submitLabel="Crear orden" onClose={() => setCreating(false)} onSubmit={(values) => createWorkOrder(values)} fields={[{ name: "assetId", label: "Activo registrado", type: "select", required: false, options: assets.map((asset) => ({ value: asset.id, label: `${asset.name} · ${asset.code}` })) }, { name: "assetName", label: "O activo externo", placeholder: "Nombre del activo si no está en inventario", required: false }, { name: "issue", label: "Novedad", type: "textarea", placeholder: "Describe el daño o mantenimiento requerido" }, { name: "owner", label: "Responsable o taller", placeholder: "Ej. Mesa de ayuda" }, { name: "scheduled", label: "Fecha y hora", type: "datetime-local" }, { name: "cost", label: "Costo estimado (COP)", type: "number", min: 0, required: false }]} initialValues={{ scheduled: new Date().toISOString().slice(0, 16), cost: "0" }} />}
  </>;
}

function ReportsPage({ onToast }: { onToast: (title: string, detail?: string) => void }) {
  const { data: assets = [] } = useQuery({ queryKey: ["assets"], queryFn: getAssets });
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: getProducts });
  const [assignments] = usePersistentValue("atlas.assignments", assignmentSeed);
  const [inspections] = usePersistentValue("atlas.inspections", inspectionSeed);
  const [workOrders] = usePersistentValue("atlas.workOrders", workOrderSeed);
  const exportReport = (name: string, headers: string[], rows: Array<Array<string | number>>) => {
    downloadCsv(`${name.toLowerCase().replaceAll(" ", "-")}-atlas.csv`, headers, rows);
    onToast("Reporte exportado", `${name} · ${rows.length} registros`);
  };
  const locations = [...new Set([...assets.map((asset) => asset.location), ...products.map((product) => product.location)])];
  const reports = [
    { icon: Boxes, title: "Inventario por ubicación", detail: "Existencias, valor y disponibilidad por sede o bodega", updated: `${locations.length} ubicaciones`, headers: ["Ubicación", "Activos", "Productos", "Unidades", "Valor COP"], rows: locations.map((location) => { const locationAssets = assets.filter((asset) => asset.location === location); const locationProducts = products.filter((product) => product.location === location); return [location, locationAssets.length, locationProducts.length, locationProducts.reduce((sum, product) => sum + product.stock, 0), locationProducts.reduce((sum, product) => sum + product.stock * product.value, 0)]; }) },
    { icon: UsersRound, title: "Custodia por grupo", detail: "Activos asignados y devoluciones pendientes por equipo", updated: `${assignments.length} asignaciones`, headers: ["Grupo", "Responsable", "Activo", "Referencia", "Estado"], rows: assignments.map((row) => [row.group, row.recipient, row.asset, row.ref, row.status]) },
    { icon: ClipboardCheck, title: "Cumplimiento de inspecciones", detail: "Ejecuciones, vencimientos e incidencias por periodo", updated: `${inspections.length} inspecciones`, headers: ["Activo", "Código", "Inspección", "Responsable", "Fecha", "Estado"], rows: inspections.map((row) => [row.asset, row.code, row.type, row.responsible, row.due, row.status]) },
    { icon: Wrench, title: "Mantenimiento y costos", detail: "Órdenes de trabajo, tiempos fuera de servicio y costos", updated: `${workOrders.length} órdenes`, headers: ["Orden", "Activo", "Novedad", "Responsable", "Programación", "Estado", "Costo COP"], rows: workOrders.map((row) => [row.ref, row.asset, row.issue, row.owner, row.scheduled, row.status, row.cost ?? 0]) },
  ];
  const overviewRows = [["Productos", products.length], ["Unidades en catálogo", products.reduce((sum, product) => sum + product.stock, 0)], ["Activos", assets.length], ["Asignaciones", assignments.length], ["Inspecciones", inspections.length], ["Órdenes de mantenimiento", workOrders.length]];
  return <><PageHeading eyebrow="ANÁLISIS Y TRAZABILIDAD" title="Reportes" description="Información consolidada para tomar decisiones con confianza." actions={<Button variant="primary" icon={Download} onClick={() => exportReport("Resumen ejecutivo", ["Indicador", "Valor"], overviewRows)}>Exportar resumen</Button>} /><div className="report-grid">{reports.map((report) => <ReportCard key={report.title} icon={report.icon} title={report.title} detail={report.detail} updated={report.updated} onClick={() => exportReport(report.title, report.headers, report.rows)} />)}</div><div className="report-footnote"><Activity size={15} /><span>Selecciona un informe para descargar sus datos en CSV. Los reportes reflejan el contenido local del prototipo.</span></div></>;
}

function ReportCard({ icon: Icon, title, detail, updated, onClick }: { icon: typeof Package; title: string; detail: string; updated: string; onClick: () => void }) {
  return <button className="report-card" onClick={onClick}><span className="report-icon"><Icon size={18} /></span><span className="report-copy"><strong>{title}</strong><small>{detail}</small><em>{updated} · Descargar CSV</em></span><ArrowRight size={16} className="report-arrow" /></button>;
}

function OrganizationPage({ onToast }: { onToast: (title: string, detail?: string) => void }) {
  const [settings, setSettings] = usePersistentValue("atlas.settings", settingsSeed);
  const [groups, setGroups] = usePersistentValue("atlas.groups", organizationGroupSeed);
  const [assignments] = usePersistentValue("atlas.assignments", assignmentSeed);
  const [modal, setModal] = useState<"group" | "location" | null>(null);
  const createGroup = (values: Record<string, string>) => {
    if (readPersistentSnapshot("atlas.groups", groups).some((group) => group.name.trim().toLowerCase() === values.name.trim().toLowerCase())) { onToast("Grupo existente", values.name); return; }
    const group: OrganizationGroup = { id: `grp-${Date.now()}`, name: values.name.trim(), lead: values.lead.trim(), members: Number(values.members) || 1 };
    setGroups((current) => [group, ...current]); setModal(null); onToast("Grupo creado", group.name);
  };
  const createLocation = (values: Record<string, string>) => {
    if (readPersistentSnapshot("atlas.settings", settings).locations.some((location) => location.trim().toLowerCase() === values.name.trim().toLowerCase())) { onToast("Ubicación existente", values.name); return; }
    setSettings((current) => ({ ...current, locations: [...current.locations, values.name.trim()] })); setModal(null); onToast("Ubicación creada", values.name);
  };
  return <>
    <PageHeading eyebrow="ESTRUCTURA DE LA ORGANIZACIÓN" title="Organización" description="Administra sedes, grupos y responsables de los activos." actions={<Button variant="primary" icon={Plus} onClick={() => setModal("group")}>Crear grupo</Button>} />
    <div className="stat-grid stat-grid-small"><MetricCard label="Grupos activos" value={String(groups.length)} change="organizados" trend="up" note="equipos de trabajo" icon={UsersRound} color="mint" /><MetricCard label="Miembros" value={String(settings.users.length)} change="con acceso" trend="up" note="usuarios del workspace" icon={UserRound} color="blue" /><MetricCard label="Ubicaciones" value={String(settings.locations.length)} change="habilitadas" trend="up" note="sedes y bodegas" icon={Boxes} color="violet" /><MetricCard label="Asignaciones" value={String(assignments.filter((row) => row.status === "Activa").length)} change="vigentes" trend="up" note="con custodia asignada" icon={BriefcaseBusiness} color="amber" /></div>
    <section className="organization-section surface-card"><div className="card-heading"><div><h2>Grupos de trabajo</h2><p>Responsables y activos bajo custodia</p></div></div><div className="table-responsive" role="region" tabIndex={0} aria-label="Tabla desplazable; desliza o usa las flechas para ver todas las columnas"><table className="data-table"><thead><tr><th>Grupo</th><th>Líder</th><th>Miembros</th><th>Asignaciones</th></tr></thead><tbody>{groups.map((group) => <tr key={group.id}><td><strong>{group.name}</strong></td><td>{group.lead}</td><td>{group.members}</td><td>{assignments.filter((assignment) => assignment.group === group.name && assignment.status === "Activa").length}</td></tr>)}</tbody></table></div></section>
    <section className="organization-section surface-card"><div className="card-heading"><div><h2>Sedes y bodegas</h2><p>Ubicaciones disponibles para inventario, compras y asignaciones</p></div><Button onClick={() => setModal("location")} icon={Plus}>Agregar ubicación</Button></div><div className="settings-location-grid">{settings.locations.map((location, index) => <div className="settings-location-card" key={location}><span className="settings-location-icon"><Boxes size={17} /></span><span><strong>{location}</strong><small>{index === 0 ? "Bodega principal" : "Ubicación activa"}</small></span><Check size={15} /></div>)}</div></section>
    {modal === "group" && <QuickFormModal title="Crear grupo de trabajo" subtitle="Define un equipo y su líder para organizar la custodia." submitLabel="Crear grupo" onClose={() => setModal(null)} onSubmit={createGroup} fields={[{ name: "name", label: "Nombre del grupo", placeholder: "Ej. Operaciones" }, { name: "lead", label: "Líder del grupo", placeholder: "Nombre del responsable" }, { name: "members", label: "Miembros iniciales", type: "number", min: 1 }]} initialValues={{ members: "1" }} />}
    {modal === "location" && <QuickFormModal title="Agregar ubicación" subtitle="Crea una sede o bodega para la organización." submitLabel="Guardar ubicación" onClose={() => setModal(null)} onSubmit={createLocation} fields={[{ name: "name", label: "Nombre de la ubicación", placeholder: "Ej. Sede occidente" }]} />}
  </>;
}

function AuditPage() {
  const { data: movements = [] } = useQuery({ queryKey: ["movements"], queryFn: getMovements });
  const [search, setSearch] = useState("");
  const [type, setType] = useState("Todos los eventos");
  const [selected, setSelected] = useState<Movement | null>(null);
  const filtered = movements.filter((movement) => (type === "Todos los eventos" || movement.type === type) && `${movement.item} ${movement.code} ${movement.reference} ${movement.actor} ${movement.from} ${movement.to}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <PageHeading eyebrow="TRAZABILIDAD DE NEGOCIO" title="Auditoría" description="Consulta quién registró cada movimiento y cómo cambió la custodia de los activos." actions={<Button icon={Download} onClick={() => downloadCsv("auditoria-atlas.csv", ["Fecha", "Evento", "Entidad", "Código", "Actor", "Origen", "Destino", "Referencia"], filtered.map((item) => [item.date, item.type, item.item, item.code, item.actor, item.from, item.to, item.reference]))}>Exportar bitácora</Button>} />
    <div className="stat-grid stat-grid-small"><MetricCard label="Eventos registrados" value={String(movements.length)} change="bitácora local" trend="up" note="con trazabilidad" icon={Activity} color="mint" /><MetricCard label="Actores" value={String(new Set(movements.map((item) => item.actor)).size)} change="identificados" trend="up" note="usuarios del demo" icon={UsersRound} color="blue" /><MetricCard label="Ingresos" value={String(movements.filter((item) => item.type === "Ingreso").length)} change="eventos" trend="up" note="recepciones registradas" icon={ArrowDownLeft} color="violet" /><MetricCard label="Ajustes" value={String(movements.filter((item) => item.type === "Ajuste").length)} change="eventos" trend="attention" note="correcciones de existencias" icon={ShieldAlert} color="amber" /></div>
    <div className="surface-card table-card full-table-card"><div className="card-heading table-toolbar"><div><h2>Bitácora de eventos</h2><p>{filtered.length} eventos · datos de solo consulta</p></div><div className="table-actions"><label className="table-search"><Search size={15} /><input aria-label="Buscar evento de auditoría por actor, activo o referencia" placeholder="Buscar actor, activo o referencia" value={search} onChange={(event) => setSearch(event.target.value)} /></label><select className="filter-select" aria-label="Filtrar eventos" value={type} onChange={(event) => setType(event.target.value)}>{["Todos los eventos", "Ingreso", "Asignación", "Devolución", "Traslado", "Ajuste"].map((item) => <option key={item}>{item}</option>)}</select></div></div><MovementTable movements={filtered} onSelect={setSelected} /><TablePagination count={filtered.length} label="eventos" /></div>
    {selected && <MovementDetailModal movement={selected} onClose={() => setSelected(null)} />}
  </>;
}

function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = usePersistentValue("atlas.notifications", notificationSeed);
  const [settings] = usePersistentValue("atlas.settings", settingsSeed);
  const [inspections] = usePersistentValue("atlas.inspections", inspectionSeed);
  const [assignments] = usePersistentValue("atlas.assignments", assignmentSeed);
  const [purchases] = usePersistentValue("atlas.purchases", purchaseSeed);
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: getProducts });
  const [filter, setFilter] = useState("Todas");
  const automatic = createOperationalNotifications(products, inspections, assignments, purchases, settings);
  const records = mergeNotificationReadState(automatic, notifications);
  const unread = records.filter((notification) => !notification.read).length;
  const visible = records.filter((notification) => filter === "Todas" || (filter === "No leídas" && !notification.read));
  const persistReadState = (notificationId?: string) => setNotifications((current) => {
    const currentRecords = mergeNotificationReadState(automatic, current);
    const nextGenerated = currentRecords.filter((item) => item.id.startsWith("auto:")).map((item) => ({ ...item, read: notificationId ? item.id === notificationId || item.read : true }));
    const nextCustom = currentRecords.filter((item) => !item.id.startsWith("auto:")).map((item) => ({ ...item, read: notificationId ? item.id === notificationId || item.read : true }));
    return [...nextGenerated, ...nextCustom];
  });
  const openNotification = (notification: NotificationRecord) => {
    persistReadState(notification.id);
    navigate(notification.href);
  };
  return <>
    <PageHeading eyebrow="CENTRO DE ACTIVIDAD" title="Notificaciones" description="Alertas calculadas desde las existencias, compras, inspecciones y custodia locales." actions={<Button onClick={() => persistReadState()} disabled={!unread}>Marcar todas como leídas</Button>} />
    <div className="stat-grid stat-grid-small"><MetricCard label="Sin leer" value={String(unread)} change="requieren atención" trend="attention" note="alertas pendientes" icon={Bell} color="amber" /><MetricCard label="En el centro" value={String(records.length)} change="registradas" trend="up" note="actividad reciente" icon={Activity} color="blue" /><MetricCard label="Categorías" value={String(new Set(records.map((item) => item.category)).size)} change="activas" trend="up" note="áreas de operación" icon={Boxes} color="mint" /><MetricCard label="Leídas" value={String(records.length - unread)} change="al día" trend="up" note="revisadas en este navegador" icon={Check} color="violet" /></div>
    <div className="notification-list-card surface-card"><div className="notification-filters">{["Todas", "No leídas"].map((item) => <button key={item} className={filter === item ? "filter-tab active" : "filter-tab"} onClick={() => setFilter(item)}>{item}{item === "No leídas" && <span className="tab-count">{unread}</span>}</button>)}</div>{visible.map((notification) => <article className={`notification-row ${notification.read ? "notification-read" : ""}`} key={notification.id}><span className="notification-symbol"><Bell size={16} /></span><div className="notification-copy"><div><strong>{notification.title}</strong><span className="category-label">{notification.category}</span></div><p>{notification.description}</p><small>{notification.time}</small></div><div className="notification-actions"><button className="subtle-link" onClick={() => openNotification(notification)}>Abrir <ArrowRight size={14} /></button>{!notification.read && <button className="notification-mark" aria-label="Marcar como leída" onClick={() => persistReadState(notification.id)}><Check size={15} /></button>}</div></article>)}{visible.length === 0 && <div className="empty-state"><Bell size={21} /><strong>{filter === "No leídas" ? "No tienes alertas sin leer" : "No hay alertas para mostrar"}</strong><span>Las notificaciones nuevas aparecerán cuando una operación requiera atención.</span></div>}</div>
  </>;
}

function ProductDetailModal({ product, onClose }: { product: Product; onClose: () => void }) {
  return <Modal title={product.name} subtitle={`Ficha del producto · ${product.code}`} onClose={onClose}>
    <div className="product-detail-summary"><span className="product-thumb thumb-generic"><Package size={19} /></span><div><strong>{product.brand}</strong><small>{product.category} · {product.tracking}</small></div><StatusBadge label={product.stock <= product.minimum ? "Bajo mínimo" : "Activo"} /></div>
    <div className="drawer-section"><h3>Datos del catálogo</h3><DetailLine label="Código interno" value={product.code} /><DetailLine label="Categoría" value={product.category} /><DetailLine label="Marca" value={product.brand} /><DetailLine label="Modalidad de control" value={product.tracking} /><DetailLine label="Ubicación" value={product.location} /></div>
    <div className="drawer-section"><h3>Existencias</h3><DetailLine label="Cantidad disponible" value={`${product.stock} ${product.tracking === "Individual" ? "activos" : "unidades"}`} /><DetailLine label="Stock mínimo" value={String(product.minimum)} /><DetailLine label="Valor unitario" value={currency(product.value)} /><DetailLine label="Valor total" value={currency(product.value * product.stock)} /></div>
    <div className="modal-actions"><Button variant="primary" onClick={onClose}>Listo</Button></div>
  </Modal>;
}

function MovementDetailModal({ movement, onClose }: { movement: Movement; onClose: () => void }) {
  return <Modal title="Detalle del movimiento" subtitle={`${movement.type} · ${movement.reference}`} onClose={onClose}>
    <div className="drawer-section"><h3>Artículo</h3><DetailLine label="Producto o activo" value={movement.item} /><DetailLine label="Código" value={movement.code} /><DetailLine label="Cantidad" value={movement.quantity} /></div>
    <div className="drawer-section"><h3>Trazabilidad</h3><DetailLine label="Origen" value={movement.from} /><DetailLine label="Destino" value={movement.to} /><DetailLine label="Responsable" value={movement.actor} /><DetailLine label="Fecha" value={movement.date} /><DetailLine label="Referencia" value={movement.reference} /></div>
    <div className="modal-actions"><Button variant="primary" onClick={onClose}>Cerrar</Button></div>
  </Modal>;
}

function SettingsPage({ onToast, onResetDemo }: { onToast: (title: string, detail?: string) => void; onResetDemo: () => void }) {
  const [settings, setSettings] = usePersistentValue("atlas.settings", settingsSeed);
  const [tab, setTab] = useState("General");
  const [general, setGeneral] = useState({ organization: settings.organization, taxId: settings.taxId, timezone: settings.timezone, currency: settings.currency });
  useEffect(() => setGeneral({ organization: settings.organization, taxId: settings.taxId, timezone: settings.timezone, currency: settings.currency }), [settings]);
  const [modal, setModal] = useState<"member" | "location" | null>(null);
  const saveGeneral = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSettings((current) => ({ ...current, ...general }));
    onToast("Configuración guardada", general.organization);
  };
  const addMember = (values: Record<string, string>) => {
    const currentSettings = readPersistentSnapshot("atlas.settings", settings);
    if (currentSettings.users.some((user) => user.email.trim().toLowerCase() === values.email.trim().toLowerCase())) { onToast("Correo ya registrado", values.email); return; }
    setSettings((current) => ({ ...current, users: [...current.users, { name: values.name.trim(), email: values.email.trim(), role: values.role }] }));
    setModal(null);
    onToast("Invitación preparada", `${values.name} · ${values.role}`);
  };
  const addLocation = (values: Record<string, string>) => {
    const currentSettings = readPersistentSnapshot("atlas.settings", settings);
    if (currentSettings.locations.some((item) => item.trim().toLowerCase() === values.name.trim().toLowerCase())) { onToast("Ubicación existente", values.name); return; }
    setSettings((current) => ({ ...current, locations: [...current.locations, values.name.trim()] }));
    setModal(null);
    onToast("Ubicación agregada", values.name);
  };
  const updateNotification = (key: keyof OrganizationSettings["notifications"], checked: boolean) => setSettings((current) => ({ ...current, notifications: { ...current.notifications, [key]: checked } }));
  const tabs = [{ label: "General", icon: Settings2 }, { label: "Usuarios y roles", icon: UsersRound }, { label: "Ubicaciones", icon: Boxes }, { label: "Notificaciones", icon: Bell }];
  return <>
    <PageHeading eyebrow="ADMINISTRACIÓN" title="Configuración" description="Administra la organización, los accesos y las preferencias del workspace." />
    <div className="settings-layout"><nav className="settings-nav" aria-label="Secciones de configuración">{tabs.map(({ label, icon: Icon }) => <button key={label} className={`settings-nav-item ${tab === label ? "selected" : ""}`} onClick={() => setTab(label)}><Icon size={16} />{label}</button>)}</nav>
      <div className="surface-card settings-card">
        {tab === "General" && <><div className="card-heading"><div><h2>Información de la organización</h2><p>Detalles visibles para los miembros de tu workspace</p></div></div><form className="settings-form" onSubmit={saveGeneral}><label>Nombre de la organización<input required value={general.organization} onChange={(event) => setGeneral({ ...general, organization: event.target.value })} /></label><label>Identificación tributaria<input value={general.taxId} onChange={(event) => setGeneral({ ...general, taxId: event.target.value })} /></label><label>Zona horaria<select value={general.timezone} onChange={(event) => setGeneral({ ...general, timezone: event.target.value })}><option value="America/Bogota">Bogotá (GMT-5)</option><option value="America/Mexico_City">Ciudad de México</option><option value="America/Lima">Lima</option></select></label><label>Moneda de visualización<select value={general.currency} onChange={(event) => setGeneral({ ...general, currency: event.target.value })}><option value="COP">Peso colombiano · COP</option><option value="USD">Dólar estadounidense · USD</option><option value="MXN">Peso mexicano · MXN</option></select></label><div className="settings-save"><span>Los cambios se guardan en este navegador</span><Button type="submit" variant="primary">Guardar cambios</Button></div></form><section className="demo-reset-panel"><div><strong>Restaurar datos de demostración</strong><p>Elimina los cambios locales de este prototipo y recupera los datos iniciales de ejemplo.</p></div><button type="button" className="filter-button demo-reset-button" onClick={() => { if (window.confirm("¿Restaurar los datos de demostración? Se perderán los cambios guardados en este navegador.")) onResetDemo(); }}>Restaurar demo</button></section></>}
        {tab === "Usuarios y roles" && <><div className="card-heading"><div><h2>Usuarios y roles</h2><p>{settings.users.length} miembros con acceso al workspace</p></div><Button variant="primary" icon={Plus} onClick={() => setModal("member")}>Invitar usuario</Button></div><div className="settings-list">{settings.users.map((user) => <div className="settings-list-row" key={user.email}><span className="person-avatar">{user.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><strong>{user.name}</strong><small>{user.email}</small></div><StatusBadge label={user.role} /></div>)}</div></>}
        {tab === "Ubicaciones" && <><div className="card-heading"><div><h2>Ubicaciones</h2><p>{settings.locations.length} sedes y bodegas disponibles</p></div><Button variant="primary" icon={Plus} onClick={() => setModal("location")}>Agregar ubicación</Button></div><div className="settings-location-grid">{settings.locations.map((item, index) => <div className="settings-location-card" key={item}><span className="settings-location-icon"><Boxes size={17} /></span><span><strong>{item}</strong><small>{index === 0 ? "Bodega principal" : "Ubicación activa"}</small></span><Check size={15} /></div>)}</div></>}
        {tab === "Notificaciones" && <><div className="card-heading"><div><h2>Preferencias de notificación</h2><p>Elige qué actividad quieres seguir</p></div></div><div className="settings-notifications">{([{ key: "lowStock", title: "Alertas de stock", description: "Cuando un producto llegue a su mínimo" }, { key: "inspections", title: "Inspecciones", description: "Vencimientos e incidencias de seguridad" }, { key: "assignments", title: "Asignaciones", description: "Entregas y devoluciones de activos" }, { key: "weeklyReport", title: "Resumen semanal", description: "Actividad y métricas cada lunes" }] as const).map(({ key, title, description }) => <label className="notification-setting" key={key}><span><strong>{title}</strong><small>{description}</small></span><input type="checkbox" checked={settings.notifications[key]} onChange={(event) => updateNotification(key, event.target.checked)} /></label>)}</div><div className="settings-save"><span>Preferencias aplicadas en el prototipo</span><Button variant="primary" onClick={() => onToast("Preferencias guardadas", "Tu selección quedó actualizada.")}>Guardar preferencias</Button></div></>}
      </div>
    </div>
    {modal === "member" && <QuickFormModal title="Invitar usuario" subtitle="Define la persona y el rol que tendrá en la organización." submitLabel="Preparar invitación" onClose={() => setModal(null)} onSubmit={addMember} fields={[{ name: "name", label: "Nombre completo", placeholder: "Nombre y apellido" }, { name: "email", label: "Correo electrónico", type: "email", placeholder: "persona@empresa.com" }, { name: "role", label: "Rol", type: "select", options: ["Administrador", "Operador", "Auditor", "Solo lectura"] }]} />}
    {modal === "location" && <QuickFormModal title="Agregar ubicación" subtitle="Registra una sede o bodega para asignar existencias." submitLabel="Agregar ubicación" onClose={() => setModal(null)} onSubmit={addLocation} fields={[{ name: "name", label: "Nombre de la ubicación", placeholder: "Ej. Sede occidente" }]} />}
  </>;
}

function AssetTable({ assets, onSelect, compact = false }: { assets: Asset[]; onSelect: (asset: Asset, trigger?: HTMLElement) => void; compact?: boolean }) {
  return <div className="table-responsive" role="region" tabIndex={0} aria-label="Tabla desplazable; desliza o usa las flechas para ver todas las columnas"><table className={`data-table asset-data-table ${compact ? "compact-table" : ""}`}><thead><tr><th>Activo</th><th>Serial / Código</th><th>Ubicación</th><th>Responsable</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{assets.length === 0 ? <tr><td colSpan={6}><div className="empty-state"><Boxes size={20} /><strong>No hay activos que coincidan</strong><span>Prueba otra búsqueda o limpia los filtros aplicados.</span></div></td></tr> : assets.map((asset) => <tr key={asset.id} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(asset, event.currentTarget); } }} onClick={(event) => onSelect(asset, event.currentTarget)} className="clickable-row"><td><div className="asset-cell"><div className={`asset-thumb ${asset.tone}`}><span>{asset.initials}</span></div><div><strong>{asset.name}</strong><small>{asset.category}</small></div></div></td><td><div className="serial-cell"><strong>{asset.code}</strong><small>{asset.serial}</small></div></td><td><span className="location-cell">{asset.location}</span></td><td>{asset.assignedTo === "—" ? <span className="unassigned">Sin asignar</span> : <span className="responsible-cell"><span className="mini-avatar">{asset.initials}</span>{asset.assignedTo}</span>}</td><td><StatusBadge label={asset.status} /></td><td><button className="row-more" aria-label={`Ver ${asset.name}`} onClick={(event) => { event.stopPropagation(); onSelect(asset, event.currentTarget); }}><Ellipsis size={18} /></button></td></tr>)}</tbody></table></div>;
}

function MovementTable({ movements, compact = false, onSelect }: { movements: Movement[]; compact?: boolean; onSelect?: (movement: Movement) => void }) {
  return <div className="table-responsive" role="region" tabIndex={0} aria-label="Tabla desplazable; desliza o usa las flechas para ver todas las columnas"><table className={`data-table movement-data-table ${compact ? "compact-table" : ""}`}><thead><tr><th>Movimiento</th><th>Tipo</th><th>Cantidad</th><th>Origen → Destino</th><th>Responsable</th><th>Fecha</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{movements.length === 0 ? <tr><td colSpan={7}><div className="empty-state"><Activity size={20} /><strong>No hay movimientos que coincidan</strong><span>Cuando registres una operación, su trazabilidad aparecerá aquí.</span></div></td></tr> : movements.map((movement) => <tr key={movement.id}><td><div><strong>{movement.item}</strong><small className="table-subtext">{movement.code} <span>·</span> {movement.reference}</small></div></td><td><MovementType type={movement.type} /></td><td><strong className={movement.quantity.startsWith("+") ? "quantity-positive" : movement.quantity.startsWith("−") ? "quantity-negative" : ""}>{movement.quantity}</strong></td><td><span className="route-cell">{movement.from}<ArrowRight size={13} />{movement.to}</span></td><td>{movement.actor}</td><td><span className="date-cell">{movement.date}</span></td><td>{onSelect && <button className="row-more" aria-label={`Ver ${movement.reference}`} onClick={() => onSelect(movement)}><Ellipsis size={18} /></button>}</td></tr>)}</tbody></table></div>;
}

function MovementType({ type }: { type: Movement["type"] }) {
  const Icon = type === "Ingreso" || type === "Devolución" ? ArrowDownLeft : type === "Traslado" ? ArrowLeftRight : type === "Ajuste" ? SlidersHorizontal : ArrowUpRight;
  return <span className={`movement-type type-${type.toLowerCase()}`}><Icon size={13} />{type}</span>;
}

function StatusBadge({ label }: { label: string }) {
  const normalized = label.toLowerCase().replaceAll(" ", "-");
  return <span className={`status-badge status-${normalized}`}><i />{label}</span>;
}

function StockIndicator({ stock, minimum }: { stock: number; minimum: number }) {
  const low = stock <= minimum;
  const ratio = Math.min(100, Math.round((stock / Math.max(minimum * 2, 1)) * 100));
  return <div className="stock-cell"><span className={low ? "stock-low" : ""}>{stock} <small>unid.</small></span><div className={`stock-track ${low ? "stock-track-low" : ""}`}><i style={{ width: `${ratio}%` }} /></div><small className="stock-min">mín. {minimum}</small></div>;
}

function TablePagination({ count, label }: { count: number; label: string }) {
  return <div className="table-pagination"><span>Mostrando todos los <strong>{count}</strong> {label}</span><span className="pagination-all">Vista completa</span></div>;
}

function AssetModal({ onClose, onSubmit, isPending, error }: { onClose: () => void; onSubmit: (values: AssetValues) => void; isPending: boolean; error?: string }) {
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: getProducts });
  const [settings] = usePersistentValue("atlas.settings", settingsSeed);
  const locations = getLocationOptions(settings.locations);
  const individualProducts = products.filter((product) => product.tracking === "Individual");
  const firstIndividualProductId = individualProducts[0]?.id;
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<AssetFormInput, unknown, AssetValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: { productId: individualProducts[0]?.id ?? "", serial: "", location: "Bodega central" },
  });
  const productId = watch("productId");
  const selectedProduct = individualProducts.find((product) => product.id === productId);
  useEffect(() => {
    if (!productId && firstIndividualProductId) setValue("productId", firstIndividualProductId);
  }, [firstIndividualProductId, productId, setValue]);
  return <Modal title="Registrar activo" subtitle="Incorpora una unidad serializada al inventario de tu organización." onClose={onClose}>
    <form className="modal-form" onSubmit={handleSubmit(onSubmit)}>
      <FormField label="Producto del catálogo" error={errors.productId?.message}><select {...register("productId")}><option value="">Selecciona un producto</option>{individualProducts.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.code}</option>)}</select></FormField>
      {selectedProduct && <div className="receipt-product"><div className="product-thumb thumb-laptop"><Package size={17} /></div><div><strong>{selectedProduct.name}</strong><small>{selectedProduct.brand} · {selectedProduct.category} · Control individual</small></div><span className="tracking-label tracking-individual">Serializado</span></div>}
      <FormField label="Número de serial" error={errors.serial?.message}><input autoFocus placeholder="Ej. DL5K-2048-AX91" {...register("serial")} /></FormField>
      <FormField label="Ubicación inicial" error={errors.location?.message}><select {...register("location")}>{locations.map((location) => <option key={location}>{location}</option>)}</select></FormField>
      <div className="receipt-info"><PackageCheck size={16} /><span>El activo quedará disponible para asignación y su ingreso se agregará al historial de movimientos.</span></div>
      {!individualProducts.length && <div className="form-error" role="status"><AlertTriangle size={15} />No hay productos con control individual. Crea primero un producto serializado en el catálogo.</div>}
      {error && <div className="form-error" role="alert"><AlertTriangle size={15} />{error}</div>}
      <div className="modal-actions"><Button onClick={onClose}>Cancelar</Button><Button type="submit" variant="primary" icon={PackagePlus} disabled={isPending || !individualProducts.length}>{isPending ? "Registrando..." : "Registrar activo"}</Button></div>
    </form>
  </Modal>;
}

function ProductModal({ onClose, onSubmit, isPending, error }: { onClose: () => void; onSubmit: (values: ProductValues) => void; isPending: boolean; error?: string }) {
  const [settings] = usePersistentValue("atlas.settings", settingsSeed);
  const locations = getLocationOptions(settings.locations);
  const { register, handleSubmit, formState: { errors } } = useForm<ProductFormInput, unknown, ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { tracking: "Individual", minimum: 0, value: 0, location: "Bodega central", category: "Computadores" },
  });
  return <Modal title="Crear producto" subtitle="Agrega un nuevo artículo al catálogo de tu organización." onClose={onClose}>
    <form className="modal-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="form-two"><FormField label="Nombre del producto" error={errors.name?.message}><input autoFocus placeholder="Ej. Portátil Latitude 5450" {...register("name")} /></FormField><FormField label="Código interno" error={errors.code?.message}><input placeholder="Ej. LAP-0032" {...register("code")} /></FormField></div>
      <div className="form-two"><FormField label="Categoría" error={errors.category?.message}><select {...register("category")}><option>Computadores</option><option>Monitores</option><option>Periféricos</option><option>Móviles</option><option>Accesorios</option><option>Seguridad</option><option>Herramientas</option><option>Consumibles</option></select></FormField><FormField label="Marca" error={errors.brand?.message}><input placeholder="Ej. Dell" {...register("brand")} /></FormField></div>
      <FormField label="Modalidad de control"><div className="radio-cards"><label><input type="radio" value="Individual" {...register("tracking")} /><span className="radio-card-icon"><Boxes size={17} /></span><span><strong>Individual</strong><small>Serial por cada unidad</small></span></label><label><input type="radio" value="Por cantidad" {...register("tracking")} /><span className="radio-card-icon"><Package size={17} /></span><span><strong>Por cantidad</strong><small>Control de existencias</small></span></label></div></FormField>
      <FormField label="Stock mínimo" error={errors.minimum?.message}><input type="number" min="0" {...register("minimum")} /></FormField>
      <div className="receipt-info"><PackageCheck size={16} /><span>Esta ficha crea el producto en el catálogo. Registra sus existencias desde Compras → Registrar recepción para conservar la trazabilidad.</span></div>
      <div className="form-two"><FormField label="Ubicación inicial" error={errors.location?.message}><select {...register("location")}>{locations.map((location) => <option key={location}>{location}</option>)}</select></FormField><FormField label="Valor unitario (COP)" error={errors.value?.message}><input type="number" min="0" step="1000" {...register("value")} /></FormField></div>
      {error && <div className="form-error" role="alert"><AlertTriangle size={15} />{error}</div>}
      <div className="modal-actions"><Button onClick={onClose}>Cancelar</Button><Button type="submit" variant="primary" icon={Plus} disabled={isPending}>{isPending ? "Guardando..." : "Crear producto"}</Button></div>
    </form>
  </Modal>;
}

function ReceiptModal({ purchaseCode, onClose, onSubmit, isPending, error }: { purchaseCode?: string; onClose: () => void; onSubmit: (submission: ReceiptSubmission) => void; isPending: boolean; error?: string }) {
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: getProducts });
  const [settings] = usePersistentValue("atlas.settings", settingsSeed);
  const locations = getLocationOptions(settings.locations);
  const [orders] = usePersistentValue("atlas.purchases", purchaseSeed);
  const [selectedPurchaseCode, setSelectedPurchaseCode] = useState(purchaseCode ?? "");
  const selectedOrder = orders.find((order) => order.code === selectedPurchaseCode);
  const pendingOrderLines = selectedOrder?.lines?.filter((line) => line.received < line.quantity) ?? [];
  const eligibleProducts = selectedPurchaseCode ? products.filter((product) => pendingOrderLines.some((line) => line.productId === product.id)) : products;
  const [lines, setLines] = useState<ReceiptLineDraft[]>(() => {
    const initialOrder = orders.find((order) => order.code === purchaseCode);
    const initialLines = initialOrder?.lines?.filter((line) => line.received < line.quantity).map((line) => ({ ...createReceiptLine("catalog", line.productId), quantity: line.quantity - line.received }));
    return initialLines?.length ? initialLines : [createReceiptLine(products.length ? "catalog" : "new", products[0]?.id ?? "")];
  });
  const [reference, setReference] = useState(() => `REC-${new Date().getFullYear()}-${String(Date.now() % 1_000_000).padStart(6, "0")}`);
  const [formError, setFormError] = useState("");
  useEffect(() => {
    if (!products.length) return;
    setLines((current) => current.map((line) => line.kind === "catalog" && !line.productId ? { ...line, productId: products[0].id } : line));
  }, [products]);
  const updateLine = (id: string, changes: Partial<ReceiptLineDraft>) => {
    setFormError("");
    setLines((current) => current.map((line) => line.id === id ? { ...line, ...changes } : line));
  };
  const selectOrder = (code: string) => {
    setSelectedPurchaseCode(code);
    const order = orders.find((item) => item.code === code);
    const nextLines = order?.lines?.filter((line) => line.received < line.quantity).map((line) => ({ ...createReceiptLine("catalog", line.productId), quantity: line.quantity - line.received }));
    setLines(nextLines?.length ? nextLines : [createReceiptLine(products.length ? "catalog" : "new", products[0]?.id ?? "")]);
    setFormError("");
  };
  const addReceiptLine = () => {
    setFormError("");
    if (selectedOrder) {
      const nextOrderLine = pendingOrderLines.find((orderLine) => !lines.some((line) => line.kind === "catalog" && line.productId === orderLine.productId));
      if (!nextOrderLine) { setFormError("Ya agregaste todas las líneas pendientes de esta orden."); return; }
      setLines((current) => [...current, { ...createReceiptLine("catalog", nextOrderLine.productId), quantity: nextOrderLine.quantity - nextOrderLine.received }]);
      return;
    }
    setLines((current) => [...current, createReceiptLine(products.length ? "catalog" : "new", products[0]?.id ?? "")]);
  };
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    const parsed = receiptSchema.safeParse({ reference, lines });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Revisa los datos de la recepción.");
      return;
    }
    const submittedLines: ReceiptLineInput[] = [];
    for (const line of parsed.data.lines) {
      const serials = line.serialText.split(/\r?\n/).map((serial) => serial.trim()).filter(Boolean);
      if (line.kind === "catalog") {
        const product = products.find((item) => item.id === line.productId);
        if (!product) { setFormError("Selecciona un producto del catálogo."); return; }
        if (product.tracking === "Individual" && serials.length !== line.quantity) {
          setFormError(`${product.name}: registra exactamente ${line.quantity} ${line.quantity === 1 ? "serial" : "seriales"}, uno por unidad.`);
          return;
        }
        submittedLines.push({ kind: "catalog", productId: line.productId, quantity: line.quantity, serials });
      } else {
        if (line.tracking === "Individual" && serials.length !== line.quantity) {
          setFormError(`${line.name}: registra exactamente ${line.quantity} ${line.quantity === 1 ? "serial" : "seriales"}, uno por unidad.`);
          return;
        }
        submittedLines.push({
          kind: "new", quantity: line.quantity, serials,
          product: { name: line.name, code: line.code, category: line.category, brand: line.brand, tracking: line.tracking, minimum: line.minimum, location: line.location, value: line.value },
        });
      }
    }
    onSubmit({ reference: parsed.data.reference, purchaseCode: selectedPurchaseCode || undefined, lines: submittedLines });
  };
  return <Modal title="Registrar ingreso" subtitle="Recibe varios artículos y completa la ficha de los productos que aún no están en el catálogo." onClose={onClose} className="receipt-dialog">
    <form className="modal-form receipt-form" onSubmit={handleSubmit}>
      <div className="receipt-steps"><span className="step-active"><i>1</i> Artículos</span><span className="step-line" /><span><i>2</i> Confirmación</span></div>
      <FormField label="Orden de compra asociada (opcional)"><select value={selectedPurchaseCode} onChange={(event) => selectOrder(event.target.value)}><option value="">Ingreso sin orden de compra</option>{orders.filter((order) => ["Aprobada", "Parcialmente recibida"].includes(order.status) && order.lines?.length).map((order) => <option key={order.code} value={order.code}>{order.code} · {order.vendor} · {order.status}</option>)}</select></FormField>
      {selectedOrder && <small className="field-hint">Se muestran sus líneas pendientes. No se aceptarán cantidades superiores al saldo de la orden. {pendingOrderLines.length} líneas por recibir.</small>}
      <div className="receipt-line-list">
        {lines.map((line, index) => {
          const selectedProduct = products.find((product) => product.id === line.productId);
          const orderLine = selectedOrder?.lines?.find((item) => item.productId === line.productId);
          return <section className="receipt-line-card" key={line.id}>
            <div className="receipt-line-heading"><div className="receipt-line-title"><span>{String(index + 1).padStart(2, "0")}</span><div><strong>Artículo {index + 1}</strong><small>{line.kind === "new" ? "Ficha de producto nuevo" : "Producto del catálogo"}</small></div></div>{lines.length > 1 && <button type="button" className="receipt-remove-line" aria-label={`Eliminar artículo ${index + 1}`} onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}><X size={15} /></button>}</div>
            <div className="receipt-mode-switch" role="group" aria-label={`Origen del artículo ${index + 1}`}><button type="button" className={line.kind === "catalog" ? "selected" : ""} onClick={() => updateLine(line.id, { kind: "catalog" })}><Package size={14} />Del catálogo</button><button type="button" disabled={Boolean(selectedPurchaseCode)} title={selectedPurchaseCode ? "La línea debe pertenecer a la orden seleccionada." : undefined} className={line.kind === "new" ? "selected" : ""} onClick={() => updateLine(line.id, { kind: "new" })}><Plus size={14} />Crear ficha nueva</button></div>
            {line.kind === "catalog" ? <>
              <div className="receipt-line-fields"><FormField label="Producto registrado"><select value={line.productId} onChange={(event) => updateLine(line.id, { productId: event.target.value })}><option value="">Selecciona un producto</option>{eligibleProducts.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.code}</option>)}</select></FormField><FormField label="Cantidad aceptada"><input type="number" min="1" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: Math.max(1, Number(event.target.value)) })} /></FormField></div>
              {selectedProduct && <div className="receipt-product"><div className="product-thumb thumb-peripheral"><Package size={17} /></div><div><strong>{selectedProduct.name}</strong><small>{selectedProduct.category} · Stock actual: {selectedProduct.stock} · {selectedProduct.location}{orderLine ? " · Pendiente en orden: " + (orderLine.quantity - orderLine.received) : ""}</small></div><span className={`tracking-label ${selectedProduct.tracking === "Individual" ? "tracking-individual" : "tracking-quantity"}`}>{selectedProduct.tracking}</span></div>}
              {!products.length && <div className="receipt-empty-catalog">El catálogo aún está vacío. Cambia a “Crear ficha nueva” para agregar un producto.</div>}
              {selectedProduct?.tracking === "Individual" && <FormField label={`Seriales · ${line.quantity} ${line.quantity === 1 ? "unidad" : "unidades"}`}><textarea rows={2} placeholder="Un serial por línea" value={line.serialText} onChange={(event) => updateLine(line.id, { serialText: event.target.value })} /><small className="field-hint">Se creará un activo disponible por cada serial.</small></FormField>}
            </> : <>
              <div className="receipt-line-fields"><FormField label="Nombre del producto"><input placeholder="Ej. Portátil Latitude 5450" value={line.name} onChange={(event) => updateLine(line.id, { name: event.target.value })} /></FormField><FormField label="Código interno"><input placeholder="Ej. LAP-0032" value={line.code} onChange={(event) => updateLine(line.id, { code: event.target.value })} /></FormField></div>
              <div className="receipt-line-fields"><FormField label="Categoría"><select value={line.category} onChange={(event) => updateLine(line.id, { category: event.target.value })}>{["Computadores", "Monitores", "Periféricos", "Móviles", "Accesorios", "Seguridad", "Herramientas", "Consumibles", "Otros"].map((item) => <option key={item}>{item}</option>)}</select></FormField><FormField label="Marca"><input placeholder="Ej. Dell" value={line.brand} onChange={(event) => updateLine(line.id, { brand: event.target.value })} /></FormField></div>
              <div className="receipt-line-fields receipt-line-fields-three"><FormField label="Control"><select value={line.tracking} onChange={(event) => updateLine(line.id, { tracking: event.target.value as ReceiptLineDraft["tracking"] })}><option>Individual</option><option>Por cantidad</option></select></FormField><FormField label="Cantidad recibida"><input type="number" min="1" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: Math.max(1, Number(event.target.value)) })} /></FormField><FormField label="Stock mínimo"><input type="number" min="0" value={line.minimum} onChange={(event) => updateLine(line.id, { minimum: Math.max(0, Number(event.target.value)) })} /></FormField></div>
              <div className="receipt-line-fields"><FormField label="Ubicación inicial"><select value={line.location} onChange={(event) => updateLine(line.id, { location: event.target.value })}>{locations.map((location) => <option key={location}>{location}</option>)}</select></FormField><FormField label="Valor unitario (COP)"><input type="number" min="0" step="1000" value={line.value} onChange={(event) => updateLine(line.id, { value: Math.max(0, Number(event.target.value)) })} /></FormField></div>
              {line.tracking === "Individual" && <FormField label={`Seriales · ${line.quantity} ${line.quantity === 1 ? "unidad" : "unidades"}`}><textarea rows={2} placeholder="Un serial por línea" value={line.serialText} onChange={(event) => updateLine(line.id, { serialText: event.target.value })} /><small className="field-hint">Pega un serial único por cada unidad recibida.</small></FormField>}
            </>}
          </section>;
        })}
      </div>
      <button type="button" className="receipt-add-line" disabled={Boolean(selectedOrder && !pendingOrderLines.some((orderLine) => !lines.some((line) => line.kind === "catalog" && line.productId === orderLine.productId)))} onClick={addReceiptLine}><Plus size={15} />Agregar otro artículo</button>
      <div className="form-two"><FormField label="Referencia de recepción"><input value={reference} onChange={(event) => setReference(event.target.value)} /></FormField><div className="receipt-total"><span>Unidades en esta recepción</span><strong>{lines.reduce((sum, line) => sum + line.quantity, 0)}</strong></div></div>
      <div className="receipt-info"><PackageCheck size={16} /><span>Los productos nuevos quedarán guardados en el catálogo. Las cantidades y los seriales se reflejarán en inventario y movimientos.</span></div>
      {(formError || error) && <div className="form-error" role="alert"><AlertTriangle size={15} />{formError || error}</div>}
      <div className="modal-actions"><Button onClick={onClose}>Cancelar</Button><Button type="submit" variant="primary" icon={PackagePlus} disabled={isPending}>{isPending ? "Registrando..." : "Confirmar recepción"}</Button></div>
    </form>
  </Modal>;
}

function FormField({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <label className={`form-field ${error ? "field-invalid" : ""}`}><span>{label}</span>{children}{error && <small className="field-error">{error}</small>}</label>;
}

function QuickFormModal({ title, subtitle, fields, initialValues = {}, submitLabel = "Guardar", onClose, onSubmit }: { title: string; subtitle: string; fields: QuickField[]; initialValues?: Record<string, string>; submitLabel?: string; onClose: () => void; onSubmit: (values: Record<string, string>) => void | Promise<void> }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((field) => [field.name, initialValues[field.name] ?? ""])));
  const [error, setError] = useState("");
  const [invalidField, setInvalidField] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;
    const invalid = fields.find((field) => {
      if (field.required !== false && !values[field.name]?.trim()) return true;
      const control = formRef.current?.elements.namedItem(field.name);
      return (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) && !control.validity.valid;
    });
    if (invalid) {
      setInvalidField(invalid.name);
      setError(`${values[invalid.name]?.trim() ? "Revisa" : "Completa"} el campo “${invalid.label}”.`);
      const control = formRef.current?.elements.namedItem(invalid.name);
      if (control instanceof HTMLElement) control.focus();
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    setError("");
    setInvalidField("");
    try {
      await onSubmit(values);
    } catch {
      setError("No se pudo guardar. Revisa la información e inténtalo de nuevo.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };
  return <Modal title={title} subtitle={subtitle} onClose={onClose}>
    <form ref={formRef} className="modal-form" noValidate onSubmit={submit}>
      <div className="quick-form-grid">{fields.map((field) => <FormField key={field.name} label={field.label}><>
        {field.type === "select" ? <select name={field.name} required={field.required !== false} aria-invalid={invalidField === field.name || undefined} aria-describedby={invalidField === field.name ? "quick-form-error" : undefined} value={values[field.name] ?? ""} onChange={(event) => { setValues((current) => ({ ...current, [field.name]: event.target.value })); if (invalidField === field.name) { setInvalidField(""); setError(""); } }}><option value="">Selecciona una opción</option>{field.options?.map((option) => { const value = typeof option === "string" ? option : option.value; const label = typeof option === "string" ? option : option.label; return <option key={value} value={value}>{label}</option>; })}</select>
          : field.type === "textarea" ? <textarea name={field.name} rows={3} required={field.required !== false} aria-invalid={invalidField === field.name || undefined} aria-describedby={invalidField === field.name ? "quick-form-error" : undefined} placeholder={field.placeholder} value={values[field.name] ?? ""} onChange={(event) => { setValues((current) => ({ ...current, [field.name]: event.target.value })); if (invalidField === field.name) { setInvalidField(""); setError(""); } }} />
            : <input name={field.name} type={field.type ?? "text"} min={field.min} required={field.required !== false} aria-invalid={invalidField === field.name || undefined} aria-describedby={invalidField === field.name ? "quick-form-error" : undefined} placeholder={field.placeholder} value={values[field.name] ?? ""} onChange={(event) => { setValues((current) => ({ ...current, [field.name]: event.target.value })); if (invalidField === field.name) { setInvalidField(""); setError(""); } }} />}
      </></FormField>)}</div>
      {error && <div id="quick-form-error" className="form-error" role="alert"><AlertTriangle size={15} />{error}</div>}
      <div className="modal-actions"><Button onClick={onClose} disabled={isSubmitting}>Cancelar</Button><Button type="submit" variant="primary" icon={Check} disabled={isSubmitting}>{isSubmitting ? "Guardando..." : submitLabel}</Button></div>
    </form>
  </Modal>;
}

function useDialogFocus(onClose: () => void, active = true, restoreFocus = true) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const restoreFocusRef = useRef(restoreFocus);
  restoreFocusRef.current = restoreFocus;
  useEffect(() => {
    if (!active) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    (dialog.querySelector<HTMLElement>("[autofocus]") ?? focusable()[0] ?? dialog).focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); return; }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) { event.preventDefault(); dialog.focus(); return; }
      if (event.shiftKey && (document.activeElement === items[0] || !dialog.contains(document.activeElement))) { event.preventDefault(); items.at(-1)?.focus(); }
      else if (!event.shiftKey && (document.activeElement === items.at(-1) || !dialog.contains(document.activeElement))) { event.preventDefault(); items[0].focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => { document.removeEventListener("keydown", handleKeyDown); if (restoreFocusRef.current) previousFocus?.focus(); };
  }, [active]);
  return dialogRef;
}

function Modal({ title, subtitle, onClose, children, className = "" }: { title: string; subtitle: string; onClose: () => void; children: ReactNode; className?: string }) {
  const dialogRef = useDialogFocus(onClose);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={dialogRef} tabIndex={-1} className={`modal-dialog ${className}`} role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-heading"><div><h2 id="modal-title">{title}</h2><p>{subtitle}</p></div><button className="icon-button" aria-label="Cerrar ventana" onClick={onClose}><X size={18} /></button></div>{children}</section></div>;
}

function AssetDrawer({ asset, onClose, onToast }: { asset: Asset; onClose: () => void; onToast: (title: string, detail?: string) => void }) {
  const [moving, setMoving] = useState(false);
  const movementTriggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useDialogFocus(onClose, !moving, !moving);
  const closeMovement = () => {
    setMoving(false);
    requestAnimationFrame(() => movementTriggerRef.current?.focus());
  };
  const [assignmentRows, setAssignmentRows] = usePersistentValue("atlas.assignments", assignmentSeed);
  const [groups] = usePersistentValue("atlas.groups", organizationGroupSeed);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const availableTypes: Movement["type"][] = asset.status === "Disponible" ? ["Traslado", "Asignación"]
    : asset.status === "Asignado" ? ["Traslado", "Devolución"] : ["Traslado"];
  const movementFields: QuickField[] = [
    { name: "type", label: "Tipo de movimiento", type: "select", options: availableTypes },
    { name: "target", label: "Destino o responsable", placeholder: "Ubicación, persona o equipo" },
    ...(availableTypes.includes("Asignación") ? [{ name: "group", label: "Grupo responsable", type: "select" as const, options: groups.map((group) => group.name), required: false }] : []),
    { name: "actor", label: "Registrado por", placeholder: "Nombre del responsable" },
  ];
  const saveMovement = async (values: Record<string, string>) => {
    const type = values.type as Movement["type"];
    const target = values.target.trim();
    const [assets, movements] = await Promise.all([getAssets(), getMovements()]);
    const current = assets.find((item) => item.id === asset.id);
    if (!current) { onToast("Activo no encontrado", "Actualiza el inventario e inténtalo de nuevo."); return; }
    const allowedNow: Movement["type"][] = current.status === "Disponible" ? ["Traslado", "Asignación"]
      : current.status === "Asignado" ? ["Traslado", "Devolución"] : ["Traslado"];
    if (!allowedNow.includes(type)) { onToast("Movimiento no permitido", `El activo está ${current.status.toLowerCase()}. Actualiza su estado antes de continuar.`); return; }
    if (!target) { onToast("Destino obligatorio", "Indica la ubicación o persona responsable."); return; }
    const currentAssignments = readPersistentSnapshot("atlas.assignments", assignmentRows);
    const openAssignment = currentAssignments.find((row) => row.assetId === current.id && row.status !== "Devuelta");
    if (type === "Asignación" && openAssignment) { onToast("La custodia ya existe", `${current.name} tiene una asignación abierta.`); return; }
    if (type === "Devolución" && (!openAssignment || openAssignment.status !== "Activa" || current.assignedTo !== openAssignment.recipient)) {
      onToast("No se puede registrar la devolución", "No hay una asignación activa que coincida con el responsable del activo.");
      return;
    }
    const prefix = type === "Asignación" ? "ASI" : "TRA";
    const nextMovementNumber = Math.max(0, ...movements.filter((item) => item.reference.startsWith(`${prefix}-${new Date().getFullYear()}-`)).map((item) => Number(item.reference.split("-").at(-1)) || 0)) + 1;
    const assignmentNumber = Math.max(0, ...currentAssignments.map((row) => Number(row.ref.split("-").at(-1)) || 0)) + 1;
    const group = values.group?.trim() || "Sin grupo";
    const newAssignment: AssignmentRow | undefined = type === "Asignación" ? {
      ref: `ASI-${new Date().getFullYear()}-${String(assignmentNumber).padStart(4, "0")}`,
      asset: current.name, assetId: current.id, recipient: target, group, date: "Ahora", status: "Activa",
    } : undefined;
    const reference = type === "Devolución" ? `DEV-${openAssignment!.ref}` : `${prefix}-${new Date().getFullYear()}-${String(nextMovementNumber).padStart(4, "0")}`;
    const updated: Asset = type === "Traslado" ? { ...current, location: target }
      : type === "Asignación" ? { ...current, status: "Asignado", assignedTo: target }
        : { ...current, status: "Disponible", assignedTo: "—", location: target };
    const movement: Movement = {
      id: `m-${Date.now()}`, type, item: current.name, code: current.code, quantity: "1 activo",
      from: type === "Devolución" ? current.assignedTo : current.location,
      to: type === "Asignación" ? `${target} · ${group}` : target,
      actor: values.actor.trim(), date: "Ahora", reference,
    };
    const nextAssignments = newAssignment ? [newAssignment, ...currentAssignments]
      : type === "Devolución" && openAssignment ? currentAssignments.map((row) => row.ref === openAssignment.ref ? { ...row, status: "Devuelta" } : row)
        : currentAssignments;
    try {
      writeDemoValues({
        "atlas.assets": assets.map((item) => item.id === asset.id ? updated : item),
        "atlas.movements": [movement, ...movements],
        "atlas.assignments": nextAssignments,
      });
    } catch {
      onToast("No se pudo guardar el movimiento", "Inténtalo de nuevo; no se registró el cambio.");
      return;
    }
    setAssignmentRows(nextAssignments);
    queryClient.invalidateQueries({ queryKey: ["assets"] });
    queryClient.invalidateQueries({ queryKey: ["movements"] });
    closeMovement();
    onClose();
    onToast("Movimiento registrado", `${current.name} · ${type}`);
  };
  return <>
    <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside ref={dialogRef} tabIndex={-1} className="asset-drawer" role="dialog" aria-modal="true" aria-labelledby="asset-title"><div className="drawer-top"><span>DETALLE DEL ACTIVO</span><button className="icon-button" aria-label="Cerrar detalle" onClick={onClose}><X size={18} /></button></div><div className="drawer-hero"><div className={`asset-hero-thumb ${asset.tone}`}><span>{asset.initials}</span></div><StatusBadge label={asset.status} /></div><h2 id="asset-title">{asset.name}</h2><p className="drawer-code">{asset.code} <span>·</span> {asset.category}</p><div className="drawer-actions"><Button buttonRef={movementTriggerRef} variant="primary" icon={ArrowLeftRight} onClick={() => setMoving(true)}>Registrar movimiento</Button><button className="icon-button" aria-label="Ver historial del activo" onClick={() => { onClose(); navigate(`/movements?search=${encodeURIComponent(asset.code)}`); }}><Ellipsis size={18} /></button></div><div className="drawer-section"><h3>Información del activo</h3><DetailLine label="Número de serial" value={asset.serial} /><DetailLine label="Ubicación actual" value={asset.location} /><DetailLine label="Responsable" value={asset.assignedTo} /><DetailLine label="Estado operativo" value={asset.status} /></div><div className="drawer-section"><div className="section-heading-inline"><h3>Última actividad</h3><button onClick={() => { onClose(); navigate(`/movements?search=${encodeURIComponent(asset.code)}`); }}>Ver historial</button></div><div className="timeline-item"><span className="timeline-point point-green"><Check size={11} /></span><div><strong>Activo actualizado</strong><small>Mariana Torres · Hoy, 9:18 a. m.</small></div></div><div className="timeline-item"><span className="timeline-point point-blue"><ArrowLeftRight size={11} /></span><div><strong>{asset.status === "Asignado" ? "Asignado a " + asset.assignedTo : "Ingreso registrado"}</strong><small>Juan Pardo · 21 oct, 2026</small></div></div></div></aside></div>
    {moving && <QuickFormModal title="Registrar movimiento" subtitle={`${asset.name} · ${asset.code}`} submitLabel="Guardar movimiento" onClose={closeMovement} onSubmit={(values) => saveMovement(values)} fields={movementFields} initialValues={{ type: "Traslado", target: asset.location, group: groups[0]?.name ?? "", actor: "Mariana Torres" }} />}
  </>;
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return <div className="detail-line"><span>{label}</span><strong>{value}</strong></div>;
}

export default App;

export type Product = {
  id: string;
  code: string;
  name: string;
  category: string;
  brand: string;
  tracking: "Individual" | "Por cantidad";
  stock: number;
  minimum: number;
  location: string;
  value: number;
  updatedAt: string;
};

export type Asset = {
  id: string;
  name: string;
  code: string;
  serial: string;
  category: string;
  location: string;
  assignedTo: string;
  status: "Disponible" | "Asignado" | "En mantenimiento" | "Bloqueado";
  initials: string;
  tone: string;
};

export type Movement = {
  id: string;
  type: "Ingreso" | "Asignación" | "Devolución" | "Traslado" | "Ajuste";
  item: string;
  code: string;
  quantity: string;
  from: string;
  to: string;
  actor: string;
  date: string;
  reference: string;
};

const productSeed: Product[] = [
  { id: "p-01", code: "TEC-0142", name: "Teclado inalámbrico MX Keys", category: "Periféricos", brand: "Logitech", tracking: "Por cantidad", stock: 38, minimum: 12, location: "Bodega central", value: 429000, updatedAt: "Hoy, 9:42 a. m." },
  { id: "p-02", code: "LAP-0028", name: "Portátil Latitude 5440", category: "Computadores", brand: "Dell", tracking: "Individual", stock: 16, minimum: 4, location: "Sede principal", value: 5280000, updatedAt: "Hoy, 9:18 a. m." },
  { id: "p-03", code: "MON-0087", name: "Monitor UltraSharp 27”", category: "Monitores", brand: "Dell", tracking: "Individual", stock: 4, minimum: 5, location: "Bodega central", value: 1860000, updatedAt: "Ayer, 4:06 p. m." },
  { id: "p-04", code: "AUD-0031", name: "Diadema Zone Vibe 100", category: "Periféricos", brand: "Logitech", tracking: "Por cantidad", stock: 7, minimum: 10, location: "Bodega central", value: 299000, updatedAt: "Ayer, 2:31 p. m." },
  { id: "p-05", code: "TAB-0019", name: "Tablet Galaxy Tab Active4", category: "Móviles", brand: "Samsung", tracking: "Individual", stock: 2, minimum: 3, location: "Sede principal", value: 2140000, updatedAt: "24 oct, 11:20 a. m." },
  { id: "p-06", code: "CAB-0910", name: "Cable USB-C 1 m", category: "Accesorios", brand: "Genérico", tracking: "Por cantidad", stock: 20, minimum: 30, location: "Bodega central", value: 32000, updatedAt: "24 oct, 10:04 a. m." },
  { id: "p-07", code: "MOU-0224", name: "Mouse ergonómico Lift", category: "Periféricos", brand: "Logitech", tracking: "Por cantidad", stock: 22, minimum: 8, location: "Bodega central", value: 315000, updatedAt: "23 oct, 3:46 p. m." },
  { id: "p-08", code: "CAM-0008", name: "Cámara de seguridad 4K", category: "Seguridad", brand: "Hikvision", tracking: "Individual", stock: 4, minimum: 2, location: "Sede norte", value: 890000, updatedAt: "22 oct, 8:11 a. m." },
];

const assetSeed: Asset[] = [
  { id: "a-01", name: "MacBook Pro 14” M3", code: "ACT-000284", serial: "C02ZK0P9MD6T", category: "Computador", location: "Sede principal · Piso 3", assignedTo: "Laura Méndez", status: "Asignado", initials: "LM", tone: "lavender" },
  { id: "a-02", name: "Dell Latitude 5440", code: "ACT-000281", serial: "DL5K-2048-AX91", category: "Computador", location: "Bodega central", assignedTo: "—", status: "Disponible", initials: "DL", tone: "blue" },
  { id: "a-03", name: "iPhone 15 · 128 GB", code: "ACT-000276", serial: "F2LX4D9KQ7", category: "Móvil", location: "Sede principal · Piso 2", assignedTo: "Camilo Rojas", status: "Asignado", initials: "CR", tone: "green" },
  { id: "a-04", name: "Monitor UltraSharp 27”", code: "ACT-000271", serial: "CN-0K8M4-74261", category: "Monitor", location: "Bodega central", assignedTo: "—", status: "Disponible", initials: "DU", tone: "blue" },
  { id: "a-05", name: "iPad Air · 256 GB", code: "ACT-000263", serial: "H7XM2PK3D0", category: "Tablet", location: "Sede norte · Taller", assignedTo: "Mantenimiento", status: "En mantenimiento", initials: "IP", tone: "orange" },
  { id: "a-06", name: "Portátil ThinkPad T14", code: "ACT-000258", serial: "PF4N-1A72-90K", category: "Computador", location: "Sede principal · Piso 4", assignedTo: "Andrés Gil", status: "Bloqueado", initials: "TH", tone: "red" },
];

const movementSeed: Movement[] = [
  { id: "m-01", type: "Ingreso", item: "Teclado inalámbrico MX Keys", code: "TEC-0142", quantity: "+12 unidades", from: "Proveedor · TechData", to: "Bodega central", actor: "Mariana Torres", date: "Hoy, 9:42 a. m.", reference: "REC-2026-0184" },
  { id: "m-02", type: "Asignación", item: "MacBook Pro 14” M3", code: "ACT-000284", quantity: "1 activo", from: "Bodega central", to: "Laura Méndez · Diseño", actor: "Juan Pardo", date: "Hoy, 9:18 a. m.", reference: "ASI-2026-0219" },
  { id: "m-03", type: "Devolución", item: "Monitor UltraSharp 27”", code: "ACT-000261", quantity: "1 activo", from: "Santiago Vera", to: "Bodega central", actor: "Mariana Torres", date: "Hoy, 8:56 a. m.", reference: "DEV-2026-0068" },
  { id: "m-04", type: "Traslado", item: "Cámara de seguridad 4K", code: "CAM-0008", quantity: "2 activos", from: "Sede norte", to: "Sede principal", actor: "Diego Cárdenas", date: "Ayer, 4:32 p. m.", reference: "TRA-2026-0042" },
  { id: "m-05", type: "Ajuste", item: "Cable USB-C 1 m", code: "CAB-0910", quantity: "−3 unidades", from: "Bodega central", to: "Bodega central", actor: "Juan Pardo", date: "Ayer, 3:12 p. m.", reference: "AJU-2026-0015" },
  { id: "m-06", type: "Ingreso", item: "Diadema Zone Vibe 100", code: "AUD-0031", quantity: "+8 unidades", from: "Proveedor · Compumax", to: "Bodega central", actor: "Mariana Torres", date: "24 oct, 11:20 a. m.", reference: "REC-2026-0181" },
];

export const seedProducts = (): Product[] => productSeed;
export const seedAssets = (): Asset[] => assetSeed;
export const seedMovements = (): Movement[] => movementSeed;

function readLocal<T>(key: string, seed: () => T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : seed();
  } catch {
    return seed();
  }
}

export const getProducts = async (): Promise<Product[]> => readLocal("atlas.products", seedProducts);
export const saveProducts = async (products: Product[]): Promise<void> => { localStorage.setItem("atlas.products", JSON.stringify(products)); };
export const getAssets = async (): Promise<Asset[]> => readLocal("atlas.assets", seedAssets);
export const saveAssets = async (assets: Asset[]): Promise<void> => { localStorage.setItem("atlas.assets", JSON.stringify(assets)); };
export const getMovements = async (): Promise<Movement[]> => readLocal("atlas.movements", seedMovements);
export const saveMovements = async (movements: Movement[]): Promise<void> => { localStorage.setItem("atlas.movements", JSON.stringify(movements)); };

export const currency = (value: number) => new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
}).format(value);

import fs from "fs";
import path from "path";
import { cookies } from "next/headers";

const isTesting = typeof process.env.VITEST !== "undefined";

// Locate worker-isolated database paths for testing/build fallbacks
const workerId = process.env.VITEST_WORKER_ID || "";
const suffix = workerId ? `_test_worker_${workerId}` : "";
const DB_FILE = process.env.NODE_ENV === "production"
  ? path.join("/tmp", `monsoon_saathi_db${suffix}.json`)
  : path.join(process.cwd(), `monsoon_saathi_db${suffix}.json`);

// Define the database shape
interface DBState {
  userSession: any[];
  householdProfile: any[];
  savedLocation: any[];
  preparednessPlan: any[];
  preparednessTask: any[];
  checklistItem: any[];
  weatherSnapshot: any[];
  riskAssessment: any[];
  alertAcknowledgement: any[];
  travelAdvisory: any[];
  emergencyContact: any[];
  communityPlan: any[];
  pushSubscription: any[];
  userObservation: any[];
  alert: any[];
  [key: string]: any[];
}

function getInitialState(): DBState {
  return {
    userSession: [],
    householdProfile: [],
    savedLocation: [],
    preparednessPlan: [],
    preparednessTask: [],
    checklistItem: [],
    weatherSnapshot: [],
    riskAssessment: [],
    alertAcknowledgement: [],
    travelAdvisory: [],
    emergencyContact: [],
    communityPlan: [],
    pushSubscription: [],
    userObservation: [],
    alert: []
  };
}

// Read database helper
function readDB(): DBState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return {
        ...getInitialState(),
        ...JSON.parse(content)
      };
    }
  } catch (e) {
    console.error("Error reading JSON database:", e);
  }
  return getInitialState();
}

// Write database helper
function writeDB(state: DBState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing JSON database:", e);
  }
}

// Global in-memory variables for shared crowd-sourced alerts & subscriptions
let globalObservations: any[] = [
  {
    id: "seed-obs-1",
    sessionId: "system",
    hazardType: "waterlogging",
    severity: "high",
    location: "Dharavi Junction, Mumbai",
    description: "Water accumulating up to knees near junction. Traffic slow.",
    createdAt: new Date().toISOString()
  },
  {
    id: "seed-obs-2",
    sessionId: "system",
    hazardType: "power_outage",
    severity: "moderate",
    location: "Kothrud, Pune",
    description: "Transformer spark led to localized power outage. Repair team active.",
    createdAt: new Date().toISOString()
  }
];

let globalAlerts: any[] = [
  {
    id: "seed-alert-1",
    title: "Severe Rainfall Warning",
    description: "Heavy downpours forecast for next 24 hours. Limit outdoor commutes.",
    severity: "high",
    location: "Mumbai & Coastline",
    createdAt: new Date().toISOString()
  }
];

let globalPushSubscriptions: any[] = [];

// Cookie-backed store helper
async function getStore(key: string): Promise<any[]> {
  if (isTesting) {
    return readDB()[key] || [];
  }
  try {
    const cookieStore = await cookies();
    const val = cookieStore.get(`saathi_${key}`)?.value;
    if (val) {
      return JSON.parse(decodeURIComponent(val));
    }
  } catch (e) {
    // Fallback to file db during build-time static rendering
    return readDB()[key] || [];
  }
  return [];
}

async function setStore(key: string, data: any[]) {
  if (isTesting) {
    const db = readDB();
    db[key] = data;
    writeDB(db);
    return;
  }
  try {
    const cookieStore = await cookies();
    cookieStore.set(`saathi_${key}`, encodeURIComponent(JSON.stringify(data)), {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: false
    });
  } catch (e) {
    // Fallback to file db during build-time static rendering
    const db = readDB();
    db[key] = data;
    writeDB(db);
  }
}

// Populate nested relations emulating Prisma's 'include' behavior
async function populateRelations(key: string, item: any, include: any): Promise<any> {
  if (!item || !include) return item;
  const result = { ...item };

  if (key === "savedLocation") {
    if (include.session) {
      let session = { id: item.sessionId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      if (typeof include.session === "object") {
        session = await populateRelations("userSession", session, include.session.include || include.session);
      }
      result.session = session;
    }
  }

  if (key === "userSession") {
    const sessionId = item.id;
    if (include.profile) {
      const profiles = await getStore("householdProfile");
      result.profile = profiles.find(p => p.sessionId === sessionId) || null;
    }
    if (include.locations) {
      const locations = await getStore("savedLocation");
      result.locations = locations.filter(l => l.sessionId === sessionId);
    }
    if (include.preparednessPlan) {
      const plans = await getStore("preparednessPlan");
      result.preparednessPlan = plans.find(p => p.sessionId === sessionId) || null;
    }
    if (include.preparednessTasks) {
      const tasks = await getStore("preparednessTask");
      result.preparednessTasks = tasks.filter(t => t.sessionId === sessionId);
    }
    if (include.checklistItems) {
      const checklistItems = await getStore("checklistItem");
      result.checklistItems = checklistItems.filter(c => c.sessionId === sessionId);
    }
    if (include.weatherSnapshots) {
      const weatherSnapshots = await getStore("weatherSnapshot");
      result.weatherSnapshots = weatherSnapshots.filter(w => w.sessionId === sessionId);
    }
    if (include.riskAssessments) {
      const riskAssessments = await getStore("riskAssessment");
      result.riskAssessments = riskAssessments.filter(r => r.sessionId === sessionId);
    }
    if (include.alertAcknowledgements) {
      const alertAcknowledgements = await getStore("alertAcknowledgement");
      result.alertAcknowledgements = alertAcknowledgements.filter(a => a.sessionId === sessionId);
    }
    if (include.travelAdvisories) {
      const travelAdvisories = await getStore("travelAdvisory");
      result.travelAdvisories = travelAdvisories.filter(t => t.sessionId === sessionId);
    }
    if (include.emergencyContacts) {
      const emergencyContacts = await getStore("emergencyContact");
      result.emergencyContacts = emergencyContacts.filter(e => e.sessionId === sessionId);
    }
    if (include.communityPlan) {
      const communityPlans = await getStore("communityPlan");
      result.communityPlan = communityPlans.find(c => c.sessionId === sessionId) || null;
    }
    if (include.pushSubscriptions) {
      result.pushSubscriptions = globalPushSubscriptions.filter(p => p.sessionId === sessionId);
    }
    if (include.userObservations) {
      result.userObservations = globalObservations.filter(u => u.sessionId === sessionId);
    }
  }
  return result;
}

class CookieCollection {
  private name: string;
  private isGlobal: boolean;

  constructor(name: string, isGlobal = false) {
    this.name = name;
    this.isGlobal = isGlobal;
  }

  private async getList(): Promise<any[]> {
    if (this.isGlobal) {
      if (this.name === "userObservation") return globalObservations;
      if (this.name === "alert") return globalAlerts;
      if (this.name === "pushSubscription") return globalPushSubscriptions;
      return [];
    }
    return getStore(this.name);
  }

  private async setList(list: any[]) {
    if (this.isGlobal) {
      if (this.name === "userObservation") globalObservations = list;
      if (this.name === "alert") globalAlerts = list;
      if (this.name === "pushSubscription") globalPushSubscriptions = list;
      return;
    }
    await setStore(this.name, list);
  }

  private match(item: any, where: any): boolean {
    if (!where) return true;
    for (const key of Object.keys(where)) {
      const val = where[key];
      if (val === undefined) continue;

      // Handle compound unique index key filters
      if (key.includes("_") && typeof val === "object" && val !== null) {
        for (const subKey of Object.keys(val)) {
          if (item[subKey] !== val[subKey]) return false;
        }
        continue;
      }

      if (typeof val === "object" && val !== null) {
        if (Array.isArray(val.in)) {
          if (!val.in.includes(item[key])) return false;
        } else if (val.not !== undefined) {
          if (item[key] === val.not) return false;
        } else {
          if (!this.match(item[key], val)) return false;
        }
      } else {
        if (item[key] !== val) return false;
      }
    }
    return true;
  }

  async findUnique(query: any = {}) {
    const list = await this.getList();
    const where = query.where || {};
    const item = list.find(item => this.match(item, where)) || null;
    return populateRelations(this.name, item, query.include);
  }

  async findFirst(query: any = {}) {
    const list = await this.getList();
    const where = query.where || {};
    const item = list.find(item => this.match(item, where)) || null;
    return populateRelations(this.name, item, query.include);
  }

  async findMany(query: any = {}) {
    let list = await this.getList();
    const where = query.where || {};
    list = list.filter(item => this.match(item, where));

    if (query.orderBy) {
      const orderKeys = Object.keys(query.orderBy);
      if (orderKeys.length > 0) {
        const key = orderKeys[0];
        const dir = query.orderBy[key];
        list.sort((a, b) => {
          const valA = a[key];
          const valB = b[key];
          if (valA < valB) return dir === "asc" ? -1 : 1;
          if (valA > valB) return dir === "asc" ? 1 : -1;
          return 0;
        });
      }
    }

    if (typeof query.take === "number") {
      list = list.slice(0, query.take);
    }

    const mapped = [];
    for (const item of list) {
      mapped.push(await populateRelations(this.name, item, query.include));
    }
    return mapped;
  }

  async create(query: any) {
    const list = await this.getList();
    const data = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...query.data
    };
    list.push(data);
    await this.setList(list);
    return populateRelations(this.name, data, query.include);
  }

  async createMany(query: any) {
    const list = await this.getList();
    const added = (query.data || []).map((item: any) => ({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...item
    }));
    list.push(...added);
    await this.setList(list);
    return { count: added.length };
  }

  async update(query: any) {
    const list = await this.getList();
    const where = query.where || {};
    const idx = list.findIndex(item => this.match(item, where));
    if (idx === -1) {
      throw new Error(`Record not found in ${this.name}`);
    }
    const updated = {
      ...list[idx],
      ...query.data,
      updatedAt: new Date().toISOString()
    };
    list[idx] = updated;
    await this.setList(list);
    return populateRelations(this.name, updated, query.include);
  }

  async updateMany(query: any) {
    const list = await this.getList();
    const where = query.where || {};
    let count = 0;
    const updatedList = list.map(item => {
      if (this.match(item, where)) {
        count++;
        return {
          ...item,
          ...query.data,
          updatedAt: new Date().toISOString()
        };
      }
      return item;
    });
    await this.setList(updatedList);
    return { count };
  }

  async upsert(query: any) {
    const list = await this.getList();
    const where = query.where || {};
    const idx = list.findIndex(item => this.match(item, where));
    if (idx !== -1) {
      const updated = {
        ...list[idx],
        ...query.update,
        updatedAt: new Date().toISOString()
      };
      list[idx] = updated;
      await this.setList(list);
      return populateRelations(this.name, updated, query.include);
    } else {
      const baseData = { ...where };
      for (const k of Object.keys(baseData)) {
        if (typeof baseData[k] === "object") delete baseData[k];
      }
      const data = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...baseData,
        ...query.create
      };
      list.push(data);
      await this.setList(list);
      return populateRelations(this.name, data, query.include);
    }
  }

  async delete(query: any) {
    const list = await this.getList();
    const where = query.where || {};
    const idx = list.findIndex(item => this.match(item, where));
    if (idx === -1) {
      throw new Error(`Record not found in ${this.name}`);
    }
    const deleted = list[idx];
    list.splice(idx, 1);
    await this.setList(list);
    return populateRelations(this.name, deleted, query.include);
  }

  async deleteMany(query: any = {}) {
    const list = await this.getList();
    const where = query.where || {};
    let count = 0;
    const filtered = list.filter(item => {
      const matches = this.match(item, where);
      if (matches) count++;
      return !matches;
    });
    await this.setList(filtered);
    return { count };
  }
}

class EmulatedPrismaClient {
  userSession = new CookieCollection("userSession");
  householdProfile = new CookieCollection("householdProfile");
  savedLocation = new CookieCollection("savedLocation");
  preparednessPlan = new CookieCollection("preparednessPlan");
  preparednessTask = new CookieCollection("preparednessTask");
  checklistItem = new CookieCollection("checklistItem");
  weatherSnapshot = new CookieCollection("weatherSnapshot");
  riskAssessment = new CookieCollection("riskAssessment");
  alertAcknowledgement = new CookieCollection("alertAcknowledgement");
  travelAdvisory = new CookieCollection("travelAdvisory");
  emergencyContact = new CookieCollection("emergencyContact");
  communityPlan = new CookieCollection("communityPlan");
  pushSubscription = new CookieCollection("pushSubscription", true);
  userObservation = new CookieCollection("userObservation", true);
  alert = new CookieCollection("alert", true);

  async $connect() {}
  async $disconnect() {}
}

export const prisma = new EmulatedPrismaClient() as any;

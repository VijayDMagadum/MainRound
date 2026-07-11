import fs from "fs";
import path from "path";

// Locate a writeable database path
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

// Populate nested relations emulating Prisma's 'include' behavior
function populateRelations(key: string, item: any, include: any): any {
  if (!item || !include) return item;
  const db = readDB();
  const result = { ...item };

  if (key === "savedLocation") {
    if (include.session) {
      let session = db.userSession.find(s => s.id === item.sessionId) || null;
      if (session && typeof include.session === "object") {
        session = populateRelations("userSession", session, include.session.include || include.session);
      }
      result.session = session;
    }
  }

  if (key === "userSession") {
    const sessionId = item.id;
    if (include.profile) {
      result.profile = db.householdProfile.find(p => p.sessionId === sessionId) || null;
    }
    if (include.locations) {
      result.locations = db.savedLocation.filter(l => l.sessionId === sessionId);
    }
    if (include.preparednessPlan) {
      result.preparednessPlan = db.preparednessPlan.find(p => p.sessionId === sessionId) || null;
    }
    if (include.preparednessTasks) {
      result.preparednessTasks = db.preparednessTask.filter(t => t.sessionId === sessionId);
    }
    if (include.checklistItems) {
      result.checklistItems = db.checklistItem.filter(c => c.sessionId === sessionId);
    }
    if (include.weatherSnapshots) {
      result.weatherSnapshots = db.weatherSnapshot.filter(w => w.sessionId === sessionId);
    }
    if (include.riskAssessments) {
      result.riskAssessments = db.riskAssessment.filter(r => r.sessionId === sessionId);
    }
    if (include.alertAcknowledgements) {
      result.alertAcknowledgements = db.alertAcknowledgement.filter(a => a.sessionId === sessionId);
    }
    if (include.travelAdvisories) {
      result.travelAdvisories = db.travelAdvisory.filter(t => t.sessionId === sessionId);
    }
    if (include.emergencyContacts) {
      result.emergencyContacts = db.emergencyContact.filter(e => e.sessionId === sessionId);
    }
    if (include.communityPlan) {
      result.communityPlan = db.communityPlan.find(c => c.sessionId === sessionId) || null;
    }
    if (include.pushSubscriptions) {
      result.pushSubscriptions = db.pushSubscription.filter(p => p.sessionId === sessionId);
    }
    if (include.userObservations) {
      result.userObservations = db.userObservation.filter(u => u.sessionId === sessionId);
    }
  }
  return result;
}

class Collection {
  private key: keyof DBState;
  
  constructor(key: keyof DBState) {
    this.key = key;
  }

  private getList(): any[] {
    return readDB()[this.key] || [];
  }

  private setList(list: any[]) {
    const db = readDB();
    db[this.key] = list;
    writeDB(db);
  }

  private match(item: any, where: any): boolean {
    if (!where) return true;
    for (const key of Object.keys(where)) {
      const val = where[key];
      if (val === undefined) continue;

      // Handle compound keys like sessionId_alertId
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
    const list = this.getList();
    const where = query.where || {};
    const item = list.find(item => this.match(item, where)) || null;
    return populateRelations(this.key, item, query.include);
  }

  async findFirst(query: any = {}) {
    const list = this.getList();
    const where = query.where || {};
    const item = list.find(item => this.match(item, where)) || null;
    return populateRelations(this.key, item, query.include);
  }

  async findMany(query: any = {}) {
    let list = this.getList();
    const where = query.where || {};
    
    // Filtering
    list = list.filter(item => this.match(item, where));

    // Sorting
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

    // Limit/Take
    if (typeof query.take === "number") {
      list = list.slice(0, query.take);
    }

    return list.map(item => populateRelations(this.key, item, query.include));
  }

  async create(query: any) {
    const list = this.getList();
    const data = { 
      id: crypto.randomUUID(), 
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...query.data 
    };
    list.push(data);
    this.setList(list);
    return populateRelations(this.key, data, query.include);
  }

  async createMany(query: any) {
    const list = this.getList();
    const added = (query.data || []).map((item: any) => ({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...item
    }));
    list.push(...added);
    this.setList(list);
    return { count: added.length };
  }

  async update(query: any) {
    const list = this.getList();
    const where = query.where || {};
    const idx = list.findIndex(item => this.match(item, where));
    if (idx === -1) {
      throw new Error(`Record not found in ${this.key}`);
    }
    const updated = {
      ...list[idx],
      ...query.data,
      updatedAt: new Date().toISOString()
    };
    list[idx] = updated;
    this.setList(list);
    return populateRelations(this.key, updated, query.include);
  }

  async updateMany(query: any) {
    const list = this.getList();
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
    this.setList(updatedList);
    return { count };
  }

  async upsert(query: any) {
    const list = this.getList();
    const where = query.where || {};
    const idx = list.findIndex(item => this.match(item, where));
    if (idx !== -1) {
      const updated = {
        ...list[idx],
        ...query.update,
        updatedAt: new Date().toISOString()
      };
      list[idx] = updated;
      this.setList(list);
      return populateRelations(this.key, updated, query.include);
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
      this.setList(list);
      return populateRelations(this.key, data, query.include);
    }
  }

  async delete(query: any) {
    const list = this.getList();
    const where = query.where || {};
    const idx = list.findIndex(item => this.match(item, where));
    if (idx === -1) {
      throw new Error(`Record not found in ${this.key}`);
    }
    const deleted = list[idx];
    list.splice(idx, 1);
    this.setList(list);
    return populateRelations(this.key, deleted, query.include);
  }

  async deleteMany(query: any = {}) {
    const list = this.getList();
    const where = query.where || {};
    let count = 0;
    const filtered = list.filter(item => {
      const matches = this.match(item, where);
      if (matches) count++;
      return !matches;
    });
    this.setList(filtered);
    return { count };
  }
}

class EmulatedPrismaClient {
  userSession = new Collection("userSession");
  householdProfile = new Collection("householdProfile");
  savedLocation = new Collection("savedLocation");
  preparednessPlan = new Collection("preparednessPlan");
  preparednessTask = new Collection("preparednessTask");
  checklistItem = new Collection("checklistItem");
  weatherSnapshot = new Collection("weatherSnapshot");
  riskAssessment = new Collection("riskAssessment");
  alertAcknowledgement = new Collection("alertAcknowledgement");
  travelAdvisory = new Collection("travelAdvisory");
  emergencyContact = new Collection("emergencyContact");
  communityPlan = new Collection("communityPlan");
  pushSubscription = new Collection("pushSubscription");
  userObservation = new Collection("userObservation");
  alert = new Collection("alert");

  async $connect() {}
  async $disconnect() {}
}

export const prisma = new EmulatedPrismaClient() as any;

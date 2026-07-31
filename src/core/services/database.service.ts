import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('ram_mobile.db');
    await initializeDb(dbInstance);
  }
  return dbInstance;
};

const initializeDb = async (db: SQLite.SQLiteDatabase) => {
  // Create tables for offline projects, letters and the synchronization queue
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      projectCode TEXT NOT NULL,
      description TEXT,
      location TEXT,
      status TEXT,
      image TEXT,
      totalBudget REAL,
      progress REAL,
      startDate TEXT,
      endDate TEXT
    );

    CREATE TABLE IF NOT EXISTS letters (
      id TEXT PRIMARY KEY,
      subject TEXT NOT NULL,
      referenceNo TEXT,
      type TEXT,
      priority TEXT,
      letterDate TEXT,
      fromName TEXT,
      toName TEXT,
      body TEXT,
      status TEXT
    );

    CREATE TABLE IF NOT EXISTS technicians (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      idType TEXT,
      idNumber TEXT,
      categoryId TEXT
    );

    CREATE TABLE IF NOT EXISTS store_items (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      unit TEXT,
      quantity REAL,
      location TEXT
    );

    CREATE TABLE IF NOT EXISTS directory_users (
      id TEXT PRIMARY KEY,
      firstName TEXT NOT NULL,
      lastName TEXT,
      email TEXT,
      phone TEXT,
      jobTitle TEXT,
      department TEXT
    );

    CREATE TABLE IF NOT EXISTS directory_clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contactPerson TEXT,
      email TEXT,
      phone TEXT,
      company TEXT
    );

    CREATE TABLE IF NOT EXISTS directory_suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contactPerson TEXT,
      email TEXT,
      phone TEXT,
      company TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      method TEXT NOT NULL, -- 'POST', 'PUT', 'DELETE'
      endpoint TEXT NOT NULL,
      payload TEXT, -- JSON string
      timestamp INTEGER NOT NULL
    );
  `);
  console.log('Local SQL Database initialized successfully.');
};

// Helper methods for Technicians
export const saveTechniciansToLocal = async (techs: any[]) => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM technicians');
  for (const t of techs) {
    await db.runAsync(
      'INSERT INTO technicians (id, name, phone, idType, idNumber, categoryId) VALUES (?, ?, ?, ?, ?, ?)',
      [t.id, t.name, t.phone || '', t.idType || '', t.idNumber || '', t.categoryId || '']
    );
  }
};

export const getLocalTechnicians = async (): Promise<any[]> => {
  const db = await getDatabase();
  return await db.getAllAsync('SELECT * FROM technicians');
};

// Helper methods for Store Inventory Items
export const saveStoreItemsToLocal = async (items: any[]) => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM store_items');
  for (const item of items) {
    await db.runAsync(
      'INSERT INTO store_items (id, description, unit, quantity, location) VALUES (?, ?, ?, ?, ?)',
      [item.id, item.description, item.unit || '', item.quantity || 0, item.location || '']
    );
  }
};

export const getLocalStoreItems = async (): Promise<any[]> => {
  const db = await getDatabase();
  return await db.getAllAsync('SELECT * FROM store_items');
};

// Helper methods for Directory Users
export const saveDirectoryUsersToLocal = async (users: any[]) => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM directory_users');
  for (const u of users) {
    await db.runAsync(
      'INSERT INTO directory_users (id, firstName, lastName, email, phone, jobTitle, department) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [u.id, u.firstName, u.lastName || '', u.email || '', u.phone || '', u.jobTitle || '', u.department || '']
    );
  }
};

export const getLocalDirectoryUsers = async (): Promise<any[]> => {
  const db = await getDatabase();
  return await db.getAllAsync('SELECT * FROM directory_users');
};

// Helper methods for Directory Clients
export const saveDirectoryClientsToLocal = async (clients: any[]) => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM directory_clients');
  for (const c of clients) {
    await db.runAsync(
      'INSERT INTO directory_clients (id, name, contactPerson, email, phone, company) VALUES (?, ?, ?, ?, ?, ?)',
      [c.id, c.name, c.contactPerson || '', c.email || '', c.phone || '', c.company || '']
    );
  }
};

export const getLocalDirectoryClients = async (): Promise<any[]> => {
  const db = await getDatabase();
  return await db.getAllAsync('SELECT * FROM directory_clients');
};

// Helper methods for Directory Suppliers
export const saveDirectorySuppliersToLocal = async (suppliers: any[]) => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM directory_suppliers');
  for (const s of suppliers) {
    await db.runAsync(
      'INSERT INTO directory_suppliers (id, name, contactPerson, email, phone, company) VALUES (?, ?, ?, ?, ?, ?)',
      [s.id, s.name, s.contactPerson || '', s.email || '', s.phone || '', s.company || '']
    );
  }
};

export const getLocalDirectorySuppliers = async (): Promise<any[]> => {
  const db = await getDatabase();
  return await db.getAllAsync('SELECT * FROM directory_suppliers');
};

// Helper methods for Projects
export const saveProjectsToLocal = async (projects: any[]) => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM projects');
  for (const p of projects) {
    await db.runAsync(
      'INSERT INTO projects (id, name, projectCode, description, location, status, image, totalBudget, progress, startDate, endDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        p.id,
        p.name,
        p.projectCode,
        p.description || '',
        p.location || '',
        p.status || 'Active',
        p.image || '',
        p.totalBudget || 0,
        p.progress || 0,
        p.startDate || '',
        p.endDate || ''
      ]
    );
  }
};

export const getLocalProjects = async (): Promise<any[]> => {
  const db = await getDatabase();
  return await db.getAllAsync('SELECT * FROM projects');
};

// Helper methods for Letters
export const saveLettersToLocal = async (letters: any[]) => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM letters');
  for (const l of letters) {
    await db.runAsync(
      'INSERT INTO letters (id, subject, referenceNo, type, priority, letterDate, fromName, toName, body, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        l.id,
        l.subject,
        l.referenceNo || '',
        l.type || 'outgoing',
        l.priority || 'normal',
        l.letterDate || '',
        l.fromName || '',
        l.toName || '',
        l.body || '',
        l.status || 'Draft'
      ]
    );
  }
};

export const getLocalLetters = async (): Promise<any[]> => {
  const db = await getDatabase();
  return await db.getAllAsync('SELECT * FROM letters');
};

// Sync Queue operations
export const queueSyncAction = async (method: string, endpoint: string, payload: any) => {
  const db = await getDatabase();
  const payloadStr = JSON.stringify(payload);
  await db.runAsync(
    'INSERT INTO sync_queue (method, endpoint, payload, timestamp) VALUES (?, ?, ?, ?)',
    [method, endpoint, payloadStr, Date.now()]
  );
  console.log(`Action queued: ${method} to ${endpoint}`);
};

export const getQueuedSyncActions = async (): Promise<any[]> => {
  const db = await getDatabase();
  return await db.getAllAsync('SELECT * FROM sync_queue ORDER BY timestamp ASC');
};

export const removeSyncAction = async (id: number) => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
};

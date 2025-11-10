const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Database directory - handle both local and serverless environments
const DB_DIR = process.env.VERCEL 
  ? '/tmp/db' 
  : path.join(__dirname, '../db');

// Ensure db directory exists
const ensureDbDir = async () => {
  try {
    await fs.access(DB_DIR);
  } catch {
    await fs.mkdir(DB_DIR, { recursive: true });
  }
};

// Initialize database with default data if needed
const initializeDatabase = async () => {
  if (process.env.VERCEL) {
    // In serverless environment, copy initial data from source
    const sourceDbDir = path.join(__dirname, '../db');
    try {
      const files = ['users.json', 'clients.json', 'projects.json', 'invoices.json'];
      for (const file of files) {
        const sourcePath = path.join(sourceDbDir, file);
        const targetPath = path.join(DB_DIR, file);
        try {
          const sourceData = await fs.readFile(sourcePath, 'utf8');
          await fs.writeFile(targetPath, sourceData);
        } catch (error) {
          // If source file doesn't exist, create empty array
          await fs.writeFile(targetPath, '[]');
        }
      }
    } catch (error) {
      console.log('Database initialization skipped:', error.message);
    }
  }
};

// Read JSON file
const readJsonFile = async (filename) => {
  try {
    await ensureDbDir();
    await initializeDatabase();
    const filePath = path.join(DB_DIR, filename);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

// Write JSON file
const writeJsonFile = async (filename, data) => {
  await ensureDbDir();
  const filePath = path.join(DB_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
};

// Generate ID
const generateId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

// User operations
const userDb = {
  async create(userData) {
    const users = await readJsonFile('users.json');
    
    // Check if user already exists
    const existingUser = users.find(u => u.email === userData.email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const newUser = {
      id: generateId(),
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      role: userData.role || 'admin',
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: null
    };

    users.push(newUser);
    await writeJsonFile('users.json', users);
    
    // Return user without password
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  },

  async findByEmail(email) {
    const users = await readJsonFile('users.json');
    return users.find(u => u.email === email);
  },

  async findById(id) {
    const users = await readJsonFile('users.json');
    const user = users.find(u => u.id === id);
    if (user) {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  },

  async updateLastLogin(id) {
    const users = await readJsonFile('users.json');
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex !== -1) {
      users[userIndex].lastLogin = new Date().toISOString();
      await writeJsonFile('users.json', users);
    }
  },

  async validatePassword(email, password) {
    const user = await this.findByEmail(email);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;
    
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
};

// Client operations
const clientDb = {
  async getAll() {
    return await readJsonFile('clients.json');
  },

  async create(clientData) {
    const clients = await readJsonFile('clients.json');
    const newClient = {
      id: generateId(),
      ...clientData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    clients.push(newClient);
    await writeJsonFile('clients.json', clients);
    return newClient;
  },

  async writeAll(clients) {
    await writeJsonFile('clients.json', clients);
  },

  async findById(id) {
    const clients = await readJsonFile('clients.json');
    return clients.find(c => c.id === id);
  },

  async update(id, updateData) {
    const clients = await readJsonFile('clients.json');
    const clientIndex = clients.findIndex(c => c.id === id);
    if (clientIndex === -1) return null;
    
    clients[clientIndex] = {
      ...clients[clientIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    await writeJsonFile('clients.json', clients);
    return clients[clientIndex];
  },

  async delete(id) {
    const clients = await readJsonFile('clients.json');
    const clientIndex = clients.findIndex(c => c.id === id);
    if (clientIndex === -1) return false;
    
    clients.splice(clientIndex, 1);
    await writeJsonFile('clients.json', clients);
    return true;
  }
};

// Project operations
const projectDb = {
  async getAll() {
    return await readJsonFile('projects.json');
  },

  async create(projectData) {
    const projects = await readJsonFile('projects.json');
    const newProject = {
      id: generateId(),
      ...projectData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    projects.push(newProject);
    await writeJsonFile('projects.json', projects);
    return newProject;
  },

  async writeAll(projects) {
    await writeJsonFile('projects.json', projects);
  },

  async findById(id) {
    const projects = await readJsonFile('projects.json');
    return projects.find(p => p.id === id);
  },

  async update(id, updateData) {
    const projects = await readJsonFile('projects.json');
    const projectIndex = projects.findIndex(p => p.id === id);
    if (projectIndex === -1) return null;
    
    projects[projectIndex] = {
      ...projects[projectIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    await writeJsonFile('projects.json', projects);
    return projects[projectIndex];
  },

  async delete(id) {
    const projects = await readJsonFile('projects.json');
    const projectIndex = projects.findIndex(p => p.id === id);
    if (projectIndex === -1) return false;
    
    projects.splice(projectIndex, 1);
    await writeJsonFile('projects.json', projects);
    return true;
  }
};

// Invoice operations
const invoiceDb = {
  async getAll() {
    return await readJsonFile('invoices.json');
  },

  async create(invoiceData) {
    const invoices = await readJsonFile('invoices.json');
    const newInvoice = {
      id: generateId(),
      ...invoiceData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    invoices.push(newInvoice);
    await writeJsonFile('invoices.json', invoices);
    return newInvoice;
  },

  async writeAll(invoices) {
    await writeJsonFile('invoices.json', invoices);
  },

  async findById(id) {
    const invoices = await readJsonFile('invoices.json');
    return invoices.find(i => i.id === id);
  },

  async update(id, updateData) {
    const invoices = await readJsonFile('invoices.json');
    const invoiceIndex = invoices.findIndex(i => i.id === id);
    if (invoiceIndex === -1) return null;
    
    invoices[invoiceIndex] = {
      ...invoices[invoiceIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    await writeJsonFile('invoices.json', invoices);
    return invoices[invoiceIndex];
  },

  async delete(id) {
    const invoices = await readJsonFile('invoices.json');
    const invoiceIndex = invoices.findIndex(i => i.id === id);
    if (invoiceIndex === -1) return false;
    
    invoices.splice(invoiceIndex, 1);
    await writeJsonFile('invoices.json', invoices);
    return true;
  }
};

module.exports = {
  userDb,
  clientDb,
  projectDb,
  invoiceDb,
  generateId
};

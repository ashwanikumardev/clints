const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  company: {
    type: String,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  whatsapp: {
    type: String,
    trim: true,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid WhatsApp number with country code']
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'prospect'],
    default: 'active'
  },
  totalProjects: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  lastContactDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better search performance
clientSchema.index({ name: 'text', email: 'text', company: 'text' });

// Virtual for projects
clientSchema.virtual('projects', {
  ref: 'Project',
  localField: '_id',
  foreignField: 'clientId'
});

// Update totalProjects and totalRevenue when projects change
clientSchema.methods.updateStats = async function() {
  const Project = mongoose.model('Project');
  const projects = await Project.find({ clientId: this._id });
  
  this.totalProjects = projects.length;
  this.totalRevenue = projects.reduce((total, project) => {
    return project.status === 'completed' ? total + project.amount : total;
  }, 0);
  
  await this.save();
};

module.exports = mongoose.model('Client', clientSchema);

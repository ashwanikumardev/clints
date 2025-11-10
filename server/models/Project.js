const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Project title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Client is required']
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled', 'on-hold'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  deadline: {
    type: Date,
    required: [true, 'Deadline is required']
  },
  completedDate: {
    type: Date,
    default: null
  },
  amount: {
    type: Number,
    required: [true, 'Project amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD']
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'overdue'],
    default: 'pending'
  },
  technologies: [{
    type: String,
    trim: true
  }],
  milestones: [{
    title: {
      type: String,
      required: true
    },
    description: String,
    dueDate: Date,
    completed: {
      type: Boolean,
      default: false
    },
    completedDate: Date
  }],
  files: [{
    name: String,
    path: String,
    size: Number,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  estimatedHours: {
    type: Number,
    min: [0, 'Estimated hours cannot be negative']
  },
  actualHours: {
    type: Number,
    min: [0, 'Actual hours cannot be negative'],
    default: 0
  }
}, {
  timestamps: true
});

// Index for better search and filtering
projectSchema.index({ clientId: 1, status: 1 });
projectSchema.index({ deadline: 1 });
projectSchema.index({ title: 'text', description: 'text' });

// Virtual for days until deadline
projectSchema.virtual('daysUntilDeadline').get(function() {
  if (!this.deadline) return null;
  const today = new Date();
  const deadline = new Date(this.deadline);
  const diffTime = deadline - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for project duration
projectSchema.virtual('duration').get(function() {
  const start = this.startDate;
  const end = this.completedDate || new Date();
  const diffTime = end - start;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for completion percentage
projectSchema.virtual('completionPercentage').get(function() {
  if (this.milestones.length === 0) {
    return this.status === 'completed' ? 100 : 0;
  }
  const completedMilestones = this.milestones.filter(m => m.completed).length;
  return Math.round((completedMilestones / this.milestones.length) * 100);
});

// Pre-save middleware to update completedDate
projectSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'completed' && !this.completedDate) {
    this.completedDate = new Date();
  }
  next();
});

// Post-save middleware to update client stats
projectSchema.post('save', async function() {
  const Client = mongoose.model('Client');
  const client = await Client.findById(this.clientId);
  if (client) {
    await client.updateStats();
  }
});

module.exports = mongoose.model('Project', projectSchema);

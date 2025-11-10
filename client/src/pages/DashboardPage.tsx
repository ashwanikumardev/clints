import React, { useState, useEffect } from 'react';
import { 
  UsersIcon, 
  BriefcaseIcon, 
  DocumentTextIcon, 
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalClients: number;
  activeClients: number;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  totalRevenue: number;
  pendingAmount: number;
}

interface RecentActivity {
  id: string;
  type: 'client' | 'project' | 'invoice';
  title: string;
  description: string;
  date: string;
  status?: string;
}

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeClients: 0,
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    totalRevenue: 0,
    pendingAmount: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [clientsRes, projectsRes, invoicesRes] = await Promise.all([
        axios.get('/api/clients/stats/overview'),
        axios.get('/api/projects/stats/overview'),
        axios.get('/api/invoices/stats/overview')
      ]);

      const clientStats = clientsRes.data.overview;
      const projectStats = projectsRes.data.overview;
      const invoiceStats = invoicesRes.data.overview;

      setStats({
        totalClients: clientStats.total,
        activeClients: clientStats.active,
        totalProjects: projectStats.total,
        activeProjects: projectStats.inProgress,
        completedProjects: projectStats.completed,
        totalInvoices: invoiceStats.total,
        paidInvoices: invoiceStats.paid,
        pendingInvoices: invoiceStats.sent,
        overdueInvoices: invoiceStats.overdue,
        totalRevenue: invoiceStats.totalRevenue,
        pendingAmount: invoiceStats.pendingAmount
      });

      // Create recent activity from all sources
      const activities: RecentActivity[] = [
        ...clientsRes.data.recentClients?.slice(0, 3).map((client: any) => ({
          id: client.id,
          type: 'client' as const,
          title: `New client: ${client.name}`,
          description: client.company || 'No company',
          date: client.createdAt,
          status: client.status
        })) || [],
        ...projectsRes.data.recentProjects?.slice(0, 3).map((project: any) => ({
          id: project.id,
          type: 'project' as const,
          title: `Project: ${project.title}`,
          description: `Status: ${project.status}`,
          date: project.createdAt,
          status: project.status
        })) || [],
        ...invoicesRes.data.recentInvoices?.slice(0, 3).map((invoice: any) => ({
          id: invoice.id,
          type: 'invoice' as const,
          title: `Invoice: ${invoice.invoiceNumber}`,
          description: `$${invoice.total}`,
          date: invoice.createdAt,
          status: invoice.status
        })) || []
      ];

      // Sort by date and take top 6
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentActivity(activities.slice(0, 6));

    } catch (error) {
      // Error fetching dashboard stats
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'client': return <UsersIcon className="w-5 h-5 text-blue-600" />;
      case 'project': return <BriefcaseIcon className="w-5 h-5 text-green-600" />;
      case 'invoice': return <DocumentTextIcon className="w-5 h-5 text-purple-600" />;
      default: return <CalendarIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': case 'in_progress': case 'paid': return 'text-green-600';
      case 'pending': case 'sent': return 'text-yellow-600';
      case 'overdue': case 'cancelled': return 'text-red-600';
      case 'completed': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your business.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Clients Stats */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Clients</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalClients}</p>
              <p className="text-sm text-gray-500 mt-1">{stats.activeClients} active</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <UsersIcon className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Projects Stats */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Projects</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalProjects}</p>
              <p className="text-sm text-gray-500 mt-1">{stats.activeProjects} in progress</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <BriefcaseIcon className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Invoices Stats */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Invoices</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalInvoices}</p>
              <p className="text-sm text-gray-500 mt-1">{stats.paidInvoices} paid</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <DocumentTextIcon className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Revenue Stats */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
              <p className="text-sm text-gray-500 mt-1">{formatCurrency(stats.pendingAmount)} pending</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <CurrencyDollarIcon className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                to="/clients"
                className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <UsersIcon className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Add Client</p>
                  <p className="text-sm text-gray-600">Create new client</p>
                </div>
              </Link>
              
              <Link
                to="/projects"
                className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <BriefcaseIcon className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">New Project</p>
                  <p className="text-sm text-gray-600">Start new project</p>
                </div>
              </Link>
              
              <Link
                to="/invoices"
                className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <DocumentTextIcon className="w-8 h-8 text-purple-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Create Invoice</p>
                  <p className="text-sm text-gray-600">Generate invoice</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Alerts</h2>
          <div className="space-y-3">
            {stats.overdueInvoices > 0 && (
              <div className="flex items-center p-3 bg-red-50 rounded-lg">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-red-900">{stats.overdueInvoices} Overdue Invoices</p>
                  <p className="text-xs text-red-600">Requires attention</p>
                </div>
              </div>
            )}
            
            {stats.pendingInvoices > 0 && (
              <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
                <CalendarIcon className="w-5 h-5 text-yellow-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">{stats.pendingInvoices} Pending Invoices</p>
                  <p className="text-xs text-yellow-600">Awaiting payment</p>
                </div>
              </div>
            )}
            
            {stats.activeProjects > 0 && (
              <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                <ArrowTrendingUpIcon className="w-5 h-5 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-blue-900">{stats.activeProjects} Active Projects</p>
                  <p className="text-xs text-blue-600">In progress</p>
                </div>
              </div>
            )}

            {stats.overdueInvoices === 0 && stats.pendingInvoices === 0 && (
              <div className="flex items-center p-3 bg-green-50 rounded-lg">
                <CheckCircleIcon className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-green-900">All Good!</p>
                  <p className="text-xs text-green-600">No urgent items</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        {recentActivity.length > 0 ? (
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-white rounded-full mr-3">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{activity.title}</p>
                    <p className="text-sm text-gray-600">{activity.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    {new Date(activity.date).toLocaleDateString()}
                  </p>
                  {activity.status && (
                    <p className={`text-xs font-medium ${getStatusColor(activity.status)}`}>
                      {activity.status.replace('_', ' ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No recent activity</p>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;

import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { 
  PlusIcon, 
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps?: {
    type: 'project' | 'invoice' | 'meeting' | 'deadline';
    description?: string;
    clientName?: string;
    status?: string;
  };
}

// Interfaces removed as they're not used in state

const CalendarPage: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  // const [projects, setProjects] = useState<Project[]>([]);
  // const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [newEventData, setNewEventData] = useState({
    title: '',
    start: '',
    end: '',
    type: 'meeting' as 'project' | 'invoice' | 'meeting' | 'deadline',
    description: ''
  });

  useEffect(() => {
    fetchCalendarData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      
      // Fetch projects and invoices
      const [projectsRes, invoicesRes] = await Promise.all([
        axios.get('/api/projects'),
        axios.get('/api/invoices')
      ]);

      const projectsData = projectsRes.data.projects || [];
      const invoicesData = invoicesRes.data.invoices || [];

      // Create calendar events
      const calendarEvents: CalendarEvent[] = [];

      // Add project deadlines
      projectsData.forEach((project: any) => {
        if (project.deadline) {
          calendarEvents.push({
            id: `project-${project.id}`,
            title: `📋 ${project.title}`,
            start: project.deadline,
            backgroundColor: getEventColor(project.status, 'project').bg,
            borderColor: getEventColor(project.status, 'project').border,
            extendedProps: {
              type: 'project',
              description: `Project deadline for ${project.title}`,
              clientName: project.clientName,
              status: project.status
            }
          });
        }
      });

      // Add invoice due dates
      invoicesData.forEach((invoice: any) => {
        if (invoice.dueDate) {
          calendarEvents.push({
            id: `invoice-${invoice.id}`,
            title: `💰 ${invoice.invoiceNumber}`,
            start: invoice.dueDate,
            backgroundColor: getEventColor(invoice.status, 'invoice').bg,
            borderColor: getEventColor(invoice.status, 'invoice').border,
            extendedProps: {
              type: 'invoice',
              description: `Invoice due: ${invoice.invoiceNumber} - $${invoice.total}`,
              clientName: invoice.clientName,
              status: invoice.status
            }
          });
        }
      });

      setEvents(calendarEvents);
    } catch (error) {
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  const getEventColor = (status: string, type: string) => {
    if (type === 'project') {
      switch (status) {
        case 'completed': return { bg: '#10B981', border: '#059669' };
        case 'in_progress': return { bg: '#3B82F6', border: '#2563EB' };
        case 'pending': return { bg: '#F59E0B', border: '#D97706' };
        case 'cancelled': return { bg: '#EF4444', border: '#DC2626' };
        default: return { bg: '#6B7280', border: '#4B5563' };
      }
    } else if (type === 'invoice') {
      switch (status) {
        case 'paid': return { bg: '#10B981', border: '#059669' };
        case 'sent': return { bg: '#3B82F6', border: '#2563EB' };
        case 'overdue': return { bg: '#EF4444', border: '#DC2626' };
        case 'draft': return { bg: '#6B7280', border: '#4B5563' };
        default: return { bg: '#F59E0B', border: '#D97706' };
      }
    }
    return { bg: '#8B5CF6', border: '#7C3AED' };
  };

  const handleEventClick = (clickInfo: any) => {
    const event = clickInfo.event;
    const calendarEvent: CalendarEvent = {
      id: event.id,
      title: event.title,
      start: event.startStr,
      end: event.endStr,
      backgroundColor: event.backgroundColor,
      borderColor: event.borderColor,
      extendedProps: event.extendedProps
    };
    setSelectedEvent(calendarEvent);
    setShowEventModal(true);
  };

  const handleDateSelect = (selectInfo: any) => {
    setNewEventData({
      title: '',
      start: selectInfo.startStr,
      end: selectInfo.endStr,
      type: 'meeting',
      description: ''
    });
    setSelectedEvent(null);
    setShowEventModal(true);
  };

  const handleCreateEvent = async () => {
    try {
      // For now, just add to local state
      // In a real app, you'd save to backend
      const newEvent: CalendarEvent = {
        id: `custom-${Date.now()}`,
        title: `📅 ${newEventData.title}`,
        start: newEventData.start,
        end: newEventData.end,
        backgroundColor: getEventColor('', newEventData.type).bg,
        borderColor: getEventColor('', newEventData.type).border,
        extendedProps: {
          type: newEventData.type,
          description: newEventData.description
        }
      };

      setEvents([...events, newEvent]);
      setShowEventModal(false);
      toast.success('Event created successfully');
    } catch (error) {
      toast.error('Failed to create event');
    }
  };

  const getUpcomingDeadlines = () => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate >= today && eventDate <= nextWeek;
    }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  };

  const getOverdueItems = () => {
    const today = new Date();
    
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate < today && 
             (event.extendedProps?.status === 'pending' || 
              event.extendedProps?.status === 'in_progress' ||
              event.extendedProps?.status === 'sent');
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const upcomingDeadlines = getUpcomingDeadlines();
  const overdueItems = getOverdueItems();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-600 mt-1">Track project deadlines and important dates</p>
        </div>
        <button
          onClick={() => {
            setNewEventData({
              title: '',
              start: new Date().toISOString().split('T')[0],
              end: '',
              type: 'meeting',
              description: ''
            });
            setSelectedEvent(null);
            setShowEventModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Add Event
        </button>
      </div>

      {/* Alerts */}
      {(upcomingDeadlines.length > 0 || overdueItems.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Upcoming Deadlines */}
          {upcomingDeadlines.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <ClockIcon className="w-5 h-5 text-yellow-600 mr-2" />
                <h3 className="font-medium text-yellow-900">Upcoming Deadlines</h3>
              </div>
              <div className="space-y-2">
                {upcomingDeadlines.slice(0, 3).map(event => (
                  <div key={event.id} className="text-sm text-yellow-800">
                    <span className="font-medium">{event.title}</span>
                    <span className="text-yellow-600 ml-2">
                      {new Date(event.start).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overdue Items */}
          {overdueItems.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
                <h3 className="font-medium text-red-900">Overdue Items</h3>
              </div>
              <div className="space-y-2">
                {overdueItems.slice(0, 3).map(event => (
                  <div key={event.id} className="text-sm text-red-800">
                    <span className="font-medium">{event.title}</span>
                    <span className="text-red-600 ml-2">
                      {new Date(event.start).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Calendar */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          initialView="dayGridMonth"
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          events={events}
          select={handleDateSelect}
          eventClick={handleEventClick}
          height="auto"
          eventDisplay="block"
        />
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {selectedEvent ? 'Event Details' : 'Create New Event'}
            </h2>

            {selectedEvent ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <p className="text-gray-900">{selectedEvent.title}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <p className="text-gray-900">
                    {new Date(selectedEvent.start).toLocaleDateString()}
                  </p>
                </div>

                {selectedEvent.extendedProps?.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <p className="text-gray-900">{selectedEvent.extendedProps.description}</p>
                  </div>
                )}

                {selectedEvent.extendedProps?.clientName && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Client</label>
                    <p className="text-gray-900">{selectedEvent.extendedProps.clientName}</p>
                  </div>
                )}

                {selectedEvent.extendedProps?.status && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedEvent.extendedProps.status === 'completed' || selectedEvent.extendedProps.status === 'paid' 
                        ? 'bg-green-100 text-green-800'
                        : selectedEvent.extendedProps.status === 'overdue'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedEvent.extendedProps.status.replace('_', ' ')}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={newEventData.title}
                    onChange={(e) => setNewEventData({ ...newEventData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Event title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="datetime-local"
                    value={newEventData.start}
                    onChange={(e) => setNewEventData({ ...newEventData, start: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date (Optional)</label>
                  <input
                    type="datetime-local"
                    value={newEventData.end}
                    onChange={(e) => setNewEventData({ ...newEventData, end: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    value={newEventData.type}
                    onChange={(e) => setNewEventData({ ...newEventData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="meeting">Meeting</option>
                    <option value="deadline">Deadline</option>
                    <option value="project">Project</option>
                    <option value="invoice">Invoice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newEventData.description}
                    onChange={(e) => setNewEventData({ ...newEventData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Event description"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowEventModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
              {!selectedEvent && (
                <button
                  onClick={handleCreateEvent}
                  disabled={!newEventData.title || !newEventData.start}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                >
                  Create Event
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;

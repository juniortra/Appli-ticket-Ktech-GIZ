import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Plus, Calendar as CalendarIcon, Phone, MessageSquare, AlertTriangle, Bell } from 'lucide-react';
import { getPriorityBadgeColor, getStatusBadgeColor, PRIORITY_ORDER, PRIORITY_LABELS } from '../utils/helpers';
import { SendAlertDialog } from '../components/SendAlertDialog';
import { BulkAlertDialog } from '../components/BulkAlertDialog';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const TasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('severity'); // 'severity' | 'status' | 'calendar'
  const [bulkAlertOpen, setBulkAlertOpen] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/tasks`, { withCredentials: true });
      setTasks(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des tâches');
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      await axios.put(`${API_URL}/api/tasks/${taskId}`, { status }, { withCredentials: true });
      toast.success('Tâche mise à jour');
      fetchTasks();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Group by status
  const groupedByStatus = {
    todo: tasks.filter((t) => t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    completed: tasks.filter((t) => t.status === 'completed'),
  };

  // Group by severity (priority)
  const groupedBySeverity = {
    urgent: tasks.filter((t) => t.priority === 'urgent'),
    moyen: tasks.filter((t) => t.priority === 'moyen' || t.priority === 'normal'),
    faible: tasks.filter((t) => t.priority === 'faible'),
  };

  // Sort tasks by severity for the badge display
  const sortedTasks = [...tasks].sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3)
  );

  const urgentCount = groupedBySeverity.urgent.filter((t) => t.status !== 'completed').length;

  return (
    <div className="space-y-6" data-testid="tasks-page">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Planificateur de Tâches</h1>
          <p className="text-muted-foreground">Gestion et suivi par sévérité</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={view === 'severity' ? 'default' : 'outline'}
            onClick={() => setView('severity')}
            data-testid="view-severity"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Par sévérité
          </Button>
          <Button variant={view === 'status' ? 'default' : 'outline'} onClick={() => setView('status')} data-testid="view-status">
            Par statut
          </Button>
          <Button variant={view === 'calendar' ? 'default' : 'outline'} onClick={() => setView('calendar')} data-testid="view-calendar">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Calendrier
          </Button>
          <Button
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10"
            onClick={() => setBulkAlertOpen(true)}
            data-testid="bulk-alert-button"
          >
            <Bell className="h-4 w-4 mr-2" />
            Alertes groupées
            {urgentCount > 0 && (
              <span className="ml-2 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                {urgentCount}
              </span>
            )}
          </Button>
          <Button data-testid="create-task-button">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Tâche
          </Button>
        </div>
      </div>

      {/* Severity Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-red-600">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">🔴 Urgent</p>
              <p className="text-3xl font-bold font-mono">{groupedBySeverity.urgent.length}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600 opacity-50" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">🟡 Moyen</p>
              <p className="text-3xl font-bold font-mono">{groupedBySeverity.moyen.length}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-500 opacity-50" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-600">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">🟢 Faible</p>
              <p className="text-3xl font-bold font-mono">{groupedBySeverity.faible.length}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-green-600 opacity-50" />
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : view === 'severity' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Urgent Column */}
          <Card data-testid="severity-urgent-column">
            <CardHeader className="bg-red-50 dark:bg-red-950/20 border-b border-red-200 dark:border-red-900">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-600 inline-block" />
                  URGENT
                </span>
                <span className="text-muted-foreground font-mono">{groupedBySeverity.urgent.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2 min-h-[100px]">
              {groupedBySeverity.urgent.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Aucune tâche urgente</p>
              ) : (
                groupedBySeverity.urgent.map((task) => (
                  <TaskCard key={task.task_id} task={task} onUpdateStatus={updateTaskStatus} />
                ))
              )}
            </CardContent>
          </Card>

          {/* Medium Column */}
          <Card data-testid="severity-medium-column">
            <CardHeader className="bg-yellow-50 dark:bg-yellow-950/20 border-b border-yellow-200 dark:border-yellow-900">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-yellow-500 inline-block" />
                  MOYEN
                </span>
                <span className="text-muted-foreground font-mono">{groupedBySeverity.moyen.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2 min-h-[100px]">
              {groupedBySeverity.moyen.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Aucune tâche moyenne</p>
              ) : (
                groupedBySeverity.moyen.map((task) => (
                  <TaskCard key={task.task_id} task={task} onUpdateStatus={updateTaskStatus} />
                ))
              )}
            </CardContent>
          </Card>

          {/* Low Column */}
          <Card data-testid="severity-low-column">
            <CardHeader className="bg-green-50 dark:bg-green-950/20 border-b border-green-200 dark:border-green-900">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-green-600 inline-block" />
                  FAIBLE
                </span>
                <span className="text-muted-foreground font-mono">{groupedBySeverity.faible.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2 min-h-[100px]">
              {groupedBySeverity.faible.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Aucune tâche faible</p>
              ) : (
                groupedBySeverity.faible.map((task) => (
                  <TaskCard key={task.task_id} task={task} onUpdateStatus={updateTaskStatus} />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : view === 'status' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card data-testid="tasks-todo-column">
            <CardHeader className="bg-muted/50">
              <CardTitle className="text-base flex items-center justify-between">
                <span>À faire</span>
                <span className="text-muted-foreground font-mono">{groupedByStatus.todo.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {groupedByStatus.todo.map((task) => (
                <TaskCard key={task.task_id} task={task} onUpdateStatus={updateTaskStatus} />
              ))}
            </CardContent>
          </Card>

          <Card data-testid="tasks-progress-column">
            <CardHeader className="bg-blue-50 dark:bg-blue-950/20">
              <CardTitle className="text-base flex items-center justify-between">
                <span>En cours</span>
                <span className="text-muted-foreground font-mono">{groupedByStatus.in_progress.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {groupedByStatus.in_progress.map((task) => (
                <TaskCard key={task.task_id} task={task} onUpdateStatus={updateTaskStatus} />
              ))}
            </CardContent>
          </Card>

          <Card data-testid="tasks-completed-column">
            <CardHeader className="bg-green-50 dark:bg-green-950/20">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Terminé</span>
                <span className="text-muted-foreground font-mono">{groupedByStatus.completed.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {groupedByStatus.completed.map((task) => (
                <TaskCard key={task.task_id} task={task} onUpdateStatus={updateTaskStatus} />
              ))}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Vue calendrier disponible prochainement</p>
          </CardContent>
        </Card>
      )}

      {bulkAlertOpen && (
        <BulkAlertDialog
          open={bulkAlertOpen}
          onClose={() => setBulkAlertOpen(false)}
          tasks={tasks}
        />
      )}
    </div>
  );
};
const TaskCard = ({ task, onUpdateStatus }) => {
  const [alertDialog, setAlertDialog] = useState(null);

  return (
    <>
      <Card className="border-l-4" style={{ borderLeftColor: task.priority === 'urgent' ? '#DC2626' : '#4A6FA5' }}>
        <CardContent className="p-3">
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <h4 className="font-medium text-sm">{task.title}</h4>
              <span className={`px-2 py-0.5 rounded text-xs ${getPriorityBadgeColor(task.priority)}`}>
                {task.priority}
              </span>
            </div>
            {task.description && <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
            <div className="text-xs text-muted-foreground">Échéance: {task.due_date}</div>
            {task.assigned_to && (
              <div className="text-xs text-muted-foreground">Assigné à: {task.assigned_to}</div>
            )}

            <div className="flex gap-1 pt-2 flex-wrap">
              {task.status !== 'todo' && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onUpdateStatus(task.task_id, 'todo')}>
                  À faire
                </Button>
              )}
              {task.status !== 'in_progress' && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onUpdateStatus(task.task_id, 'in_progress')}>
                  En cours
                </Button>
              )}
              {task.status !== 'completed' && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onUpdateStatus(task.task_id, 'completed')}>
                  Terminé
                </Button>
              )}
            </div>

            <div className="flex gap-1 pt-2 border-t border-border/50">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs flex-1 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/30"
                onClick={() => setAlertDialog('sms')}
                data-testid={`sms-alert-${task.task_id}`}
              >
                <Phone className="h-3 w-3 mr-1" />
                SMS
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs flex-1 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950/30"
                onClick={() => setAlertDialog('whatsapp')}
                data-testid={`whatsapp-alert-${task.task_id}`}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                WhatsApp
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {alertDialog && (
        <SendAlertDialog
          open={!!alertDialog}
          onClose={() => setAlertDialog(null)}
          task={task}
          channel={alertDialog}
        />
      )}
    </>
  );
};

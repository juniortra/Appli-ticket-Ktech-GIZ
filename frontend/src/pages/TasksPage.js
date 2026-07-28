import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';
import { getPriorityBadgeColor, getStatusBadgeColor } from '../utils/helpers';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const TasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' or 'calendar'

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

  const groupedTasks = {
    todo: tasks.filter((t) => t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    completed: tasks.filter((t) => t.status === 'completed'),
  };

  return (
    <div className="space-y-6" data-testid="tasks-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Planificateur de Tâches</h1>
          <p className="text-muted-foreground">Gestion et suivi des tâches</p>
        </div>
        <div className="flex gap-2">
          <Button variant={view === 'list' ? 'default' : 'outline'} onClick={() => setView('list')} data-testid="view-list">
            Liste
          </Button>
          <Button variant={view === 'calendar' ? 'default' : 'outline'} onClick={() => setView('calendar')} data-testid="view-calendar">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Calendrier
          </Button>
          <Button data-testid="create-task-button">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Tâche
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : view === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* To Do Column */}
          <Card data-testid="tasks-todo-column">
            <CardHeader className="bg-muted/50">
              <CardTitle className="text-base flex items-center justify-between">
                <span>À faire</span>
                <span className="text-muted-foreground font-mono">{groupedTasks.todo.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {groupedTasks.todo.map((task) => (
                <TaskCard key={task.task_id} task={task} onUpdateStatus={updateTaskStatus} />
              ))}
            </CardContent>
          </Card>

          {/* In Progress Column */}
          <Card data-testid="tasks-progress-column">
            <CardHeader className="bg-blue-50 dark:bg-blue-950/20">
              <CardTitle className="text-base flex items-center justify-between">
                <span>En cours</span>
                <span className="text-muted-foreground font-mono">{groupedTasks.in_progress.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {groupedTasks.in_progress.map((task) => (
                <TaskCard key={task.task_id} task={task} onUpdateStatus={updateTaskStatus} />
              ))}
            </CardContent>
          </Card>

          {/* Completed Column */}
          <Card data-testid="tasks-completed-column">
            <CardHeader className="bg-green-50 dark:bg-green-950/20">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Terminé</span>
                <span className="text-muted-foreground font-mono">{groupedTasks.completed.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {groupedTasks.completed.map((task) => (
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
    </div>
  );
};

const TaskCard = ({ task, onUpdateStatus }) => {
  return (
    <Card className="border-l-4" style={{ borderLeftColor: task.priority === 'urgent' ? '#DC2626' : '#4A6FA5' }}>
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <h4 className="font-medium text-sm">{task.title}</h4>
            <span className={`px-2 py-0.5 rounded text-xs ${getPriorityBadgeColor(task.priority)}`}>
              {task.priority}
            </span>
          </div>          {task.description && <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
          <div className="text-xs text-muted-foreground">
            Échéance: {task.due_date}
          </div>
          {task.assigned_to && (
            <div className="text-xs text-muted-foreground">Assigné à: {task.assigned_to}</div>
          )}
          <div className="flex gap-1 pt-2">
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
        </div>
      </CardContent>
    </Card>
  );
};

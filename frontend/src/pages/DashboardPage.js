import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { FileText, ClipboardList, Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const COLORS = {
  primary: '#2563EB',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#0EA5E9',
  gray: '#64748B',
  steel: '#4A6FA5',
};

export const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/dashboard/stats`, {
          withCredentials: true,
        });
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="dashboard-loading">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center text-muted-foreground">Erreur lors du chargement des statistiques</div>;
  }

  const formsByType = [
    { name: 'FRM', value: stats.totals.frm, color: COLORS.primary },
    { name: 'FDI', value: stats.totals.fdi, color: COLORS.info },
    { name: 'RDD', value: stats.totals.rdd, color: COLORS.success },
    { name: 'RDI', value: stats.totals.rdi, color: COLORS.warning },
  ];

  const fdiStatusData = Object.entries(stats.fdi_by_status).map(([key, value]) => ({
    name: key === 'en_cours' ? 'En cours' : key === 'termine' ? 'Terminé' : 'En attente',
    value,
  }));

  const priorityData = Object.entries(stats.fdi_by_priority).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value,
  }));

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground">Vue d'ensemble de votre système de maintenance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary" data-testid="kpi-total-forms">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Fiches</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{stats.totals.all_forms}</div>
            <p className="text-xs text-muted-foreground">Toutes les fiches créées</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-info" data-testid="kpi-fdi-forms">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Interventions (FDI)</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{stats.totals.fdi}</div>
            <p className="text-xs text-muted-foreground">
              {stats.fdi_by_status.en_cours || 0} en cours
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success" data-testid="kpi-tasks">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Tâches</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{stats.tasks.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.tasks.completed} complétées
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning" data-testid="kpi-incidents">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Incidents (RDI)</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{stats.totals.rdi}</div>
            <p className="text-xs text-muted-foreground">
              {stats.rdi_by_status.ouvert || 0} ouverts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Forms by Type Bar Chart */}
        <Card data-testid="chart-forms-by-type">
          <CardHeader>
            <CardTitle>Fiches par Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={formsByType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill={COLORS.primary} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* FDI Status Pie Chart */}
        <Card data-testid="chart-fdi-status">
          <CardHeader>
            <CardTitle>Statut des Interventions</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={fdiStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {fdiStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={[COLORS.info, COLORS.success, COLORS.warning][index % 3]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card data-testid="chart-priority">
          <CardHeader>
            <CardTitle>Distribution des Priorités</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={priorityData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" />
                <Tooltip />
                <Bar dataKey="value" fill={COLORS.primary} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Task Progress */}
        <Card data-testid="chart-task-progress">
          <CardHeader>
            <CardTitle>Progression des Tâches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                    Complétées
                  </span>
                  <span className="font-mono font-bold">{stats.tasks.completed}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-[#10B981] h-2 rounded-full"
                    style={{ width: `${(stats.tasks.completed / stats.tasks.total) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#F59E0B]" />
                    En attente
                  </span>
                  <span className="font-mono font-bold">{stats.tasks.pending}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-[#F59E0B] h-2 rounded-full"
                    style={{ width: `${(stats.tasks.pending / stats.tasks.total) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total</span>
                  <span className="text-2xl font-bold font-mono">{stats.tasks.total}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card data-testid="recent-activity">
        <CardHeader>
          <CardTitle>Activité récente (30 derniers jours)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold font-mono text-primary">{stats.recent_activity.frm}</div>
              <div className="text-sm text-muted-foreground">FRM créées</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold font-mono text-[#0EA5E9]">{stats.recent_activity.fdi}</div>
              <div className="text-sm text-muted-foreground">FDI créées</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold font-mono text-[#10B981]">{stats.recent_activity.rdd}</div>
              <div className="text-sm text-muted-foreground">RDD créées</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold font-mono text-[#F59E0B]">{stats.recent_activity.rdi}</div>
              <div className="text-sm text-muted-foreground">RDI créées</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

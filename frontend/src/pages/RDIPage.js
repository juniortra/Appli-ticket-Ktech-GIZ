import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Plus } from 'lucide-react';
import { getStatusBadgeColor } from '../utils/helpers';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const RDIPage = () => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/forms/rdi`, { withCredentials: true });
      setForms(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des rapports');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="rdi-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rapports d'Incident (RDI)</h1>
          <p className="text-muted-foreground">Suivi des incidents techniques</p>
        </div>
        <Button data-testid="create-rdi-button">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau RDI
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {forms.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">Aucun rapport d'incident pour le moment</p>
              </CardContent>
            </Card>
          ) : (
            forms.map((form) => (
              <Card key={form.form_id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="font-mono">{form.objet}</CardTitle>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(form.statut)}`}>
                      {form.statut}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Date:</span> {form.date_incident}</div>
                    <div><span className="font-medium">Lieu:</span> {form.lieu}</div>
                    <div><span className="font-medium">Résumé:</span> {form.resume}</div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

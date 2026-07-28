import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const RDDPage = () => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/forms/rdd`, { withCredentials: true });
      setForms(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des rapports');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="rdd-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rapports de Diagnostic (RDD)</h1>
          <p className="text-muted-foreground">Diagnostics techniques du matériel</p>
        </div>
        <Button data-testid="create-rdd-button">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau RDD
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
                <p className="text-muted-foreground">Aucun rapport de diagnostic pour le moment</p>
              </CardContent>
            </Card>
          ) : (
            forms.map((form) => (
              <Card key={form.form_id}>
                <CardHeader>
                  <CardTitle className="font-mono">{form.form_id}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Matériel:</span> {form.marque} {form.modele}</div>
                    <div><span className="font-medium">Problème:</span> {form.probleme_constate}</div>
                    <div><span className="font-medium">Solution:</span> {form.solution_recommandee}</div>
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

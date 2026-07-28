import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Plus } from 'lucide-react';
import { FormActions } from '../components/FormActions';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const FRMPage = () => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/forms/frm`, { withCredentials: true });
      setForms(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des fiches');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="frm-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fiches de Réception de Matériel (FRM)</h1>
          <p className="text-muted-foreground">Gestion des réceptions de matériel</p>
        </div>
        <Button data-testid="create-frm-button">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle FRM
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
                <p className="text-muted-foreground">Aucune fiche de réception pour le moment</p>
              </CardContent>
            </Card>
          ) : (
            forms.map((form) => (
              <Card key={form.form_id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="font-mono">{form.numero_fiche}</CardTitle>
                    <FormActions formType="frm" formId={form.form_id} formNumber={form.numero_fiche} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Date:</span> {form.date}</div>
                    <div><span className="text-muted-foreground">Projet/Site:</span> {form.projet_site}</div>
                    <div><span className="text-muted-foreground">Fournisseur:</span> {form.fournisseur}</div>
                    <div><span className="text-muted-foreground">Département:</span> {form.departement}</div>
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

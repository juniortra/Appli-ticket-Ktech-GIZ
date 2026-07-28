import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { Plus, Eye, Mail, FileDown } from 'lucide-react';
import { getStatusBadgeColor, getPriorityBadgeColor, INTERVENTION_TYPES, formatDate } from '../utils/helpers';
import { SendEmailDialog } from '../components/SendEmailDialog';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const FDIPage = () => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [emailDialogForm, setEmailDialogForm] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/forms/fdi`, {
        withCredentials: true,
      });
      setForms(response.data);
    } catch (error) {
      console.error('Error fetching FDI forms:', error);
      toast.error('Erreur lors du chargement des fiches');
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async (form) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/email/download-pdf/fdi/${form.form_id}`,
        { withCredentials: true, responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `FDI_${form.numero_fiche}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF téléchargé');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  return (
    <div className="space-y-6" data-testid="fdi-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fiches d'Intervention (FDI)</h1>
          <p className="text-muted-foreground">Gestion des interventions techniques</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} data-testid="create-fdi-button">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle FDI
        </Button>
      </div>

      {showCreateForm && (
        <CreateFDIForm onClose={() => setShowCreateForm(false)} onSuccess={fetchForms} />
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid gap-4" data-testid="fdi-list">
          {forms.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">Aucune fiche d'intervention pour le moment</p>
              </CardContent>
            </Card>
          ) : (
            forms.map((form) => (
              <Card key={form.form_id} className="hover:border-primary transition-colors">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold font-mono">{form.numero_fiche}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityBadgeColor(form.priorite)}`}>
                          {form.priorite}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(form.statut)}`}>
                          {form.statut.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Date:</span> {form.date}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Projet/Site:</span> {form.projet_site}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Intervenant(s):</span> {form.intervenants}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Utilisateur(s):</span> {form.utilisateurs}
                        </div>
                      </div>
                      {form.observations && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{form.observations}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => downloadPdf(form)}
                        title="Télécharger PDF"
                        data-testid={`download-fdi-${form.form_id}`}
                      >
                        <FileDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEmailDialogForm(form)}
                        title="Envoyer par email"
                        data-testid={`email-fdi-${form.form_id}`}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {emailDialogForm && (
        <SendEmailDialog
          open={!!emailDialogForm}
          onClose={() => setEmailDialogForm(null)}
          formType="fdi"
          formId={emailDialogForm.form_id}
          formNumber={emailDialogForm.numero_fiche}
        />
      )}
    </div>
  );
};

const CreateFDIForm = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    numero_fiche: `FDI-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    projet_site: '',
    intervenants: '',
    utilisateurs: '',
    service_departement: '',
    types_intervention: [],
    autre_intervention: '',
    priorite: 'normal',
    statut: 'en_cours',
    observations: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API_URL}/api/forms/fdi`, formData, {
        withCredentials: true,
      });
      toast.success('Fiche d\'intervention créée avec succès');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating FDI:', error);
      toast.error('Erreur lors de la création de la fiche');
    } finally {
      setLoading(false);
    }
  };

  const toggleIntervention = (type) => {
    setFormData((prev) => ({
      ...prev,
      types_intervention: prev.types_intervention.includes(type)
        ? prev.types_intervention.filter((t) => t !== type)
        : [...prev.types_intervention, type],
    }));
  };

  return (
    <Card data-testid="create-fdi-form">
      <CardHeader>
        <CardTitle>Nouvelle Fiche d'Intervention</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero_fiche">N° Fiche *</Label>
              <Input
                id="numero_fiche"
                value={formData.numero_fiche}
                onChange={(e) => setFormData({ ...formData, numero_fiche: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projet_site">Projet / Site *</Label>
              <Input
                id="projet_site"
                value={formData.projet_site}
                onChange={(e) => setFormData({ ...formData, projet_site: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="intervenants">Intervenant(s) *</Label>
              <Input
                id="intervenants"
                value={formData.intervenants}
                onChange={(e) => setFormData({ ...formData, intervenants: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="utilisateurs">Utilisateur(s) *</Label>
              <Input
                id="utilisateurs"
                value={formData.utilisateurs}
                onChange={(e) => setFormData({ ...formData, utilisateurs: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_departement">Service / Département *</Label>
              <Input
                id="service_departement"
                value={formData.service_departement}
                onChange={(e) => setFormData({ ...formData, service_departement: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priorite">Priorité *</Label>
              <Select value={formData.priorite} onValueChange={(value) => setFormData({ ...formData, priorite: value })}>
                <SelectTrigger id="priorite">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">🔴 Urgent</SelectItem>
                  <SelectItem value="normal">🟡 Moyen</SelectItem>
                  <SelectItem value="faible">🟢 Faible</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="statut">Statut *</Label>
              <Select value={formData.statut} onValueChange={(value) => setFormData({ ...formData, statut: value })}>
                <SelectTrigger id="statut">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="termine">Terminé</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Types d'intervention *</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 border rounded-lg max-h-48 overflow-y-auto">
              {INTERVENTION_TYPES.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={type}
                    checked={formData.types_intervention.includes(type)}
                    onCheckedChange={() => toggleIntervention(type)}
                  />
                  <label htmlFor={type} className="text-sm cursor-pointer">
                    {type}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {formData.types_intervention.includes('Autre') && (
            <div className="space-y-2">
              <Label htmlFor="autre_intervention">Préciser l'autre intervention</Label>
              <Input
                id="autre_intervention"
                value={formData.autre_intervention}
                onChange={(e) => setFormData({ ...formData, autre_intervention: e.target.value })}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="observations">Observations</Label>
            <Textarea
              id="observations"
              value={formData.observations}
              onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading} data-testid="submit-fdi-button">
              {loading ? 'Création...' : 'Créer la fiche'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

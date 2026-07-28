import React, { useState } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Bell, Phone, MessageSquare, X, Plus, Send } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PRIORITY_CONFIG = {
  urgent: { label: '🔴 Urgent', color: 'border-red-600 bg-red-50 dark:bg-red-950/20' },
  moyen: { label: '🟡 Moyen', color: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' },
  faible: { label: '🟢 Faible', color: 'border-green-600 bg-green-50 dark:bg-green-950/20' },
};

export const BulkAlertDialog = ({ open, onClose, tasks }) => {
  const [channel, setChannel] = useState('sms');
  const [selectedPriorities, setSelectedPriorities] = useState(['urgent']);
  const [onlyPending, setOnlyPending] = useState(true);
  const [recipients, setRecipients] = useState(['']);
  const [customMessage, setCustomMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const togglePriority = (priority) => {
    setSelectedPriorities((prev) =>
      prev.includes(priority) ? prev.filter((p) => p !== priority) : [...prev, priority]
    );
  };

  const addRecipient = () => setRecipients([...recipients, '']);
  const removeRecipient = (index) => setRecipients(recipients.filter((_, i) => i !== index));
  const updateRecipient = (index, value) => {
    const updated = [...recipients];
    updated[index] = value;
    setRecipients(updated);
  };

  // Count matching tasks
  const matchingTasks = tasks.filter((t) => {
    const p = t.priority === 'normal' ? 'moyen' : t.priority;
    if (!selectedPriorities.includes(p)) return false;
    if (onlyPending && t.status === 'completed') return false;
    return true;
  });

  const handleSend = async () => {
    const validRecipients = recipients.map((n) => n.trim()).filter((n) => n);

    if (selectedPriorities.length === 0) {
      toast.error('Sélectionnez au moins une sévérité');
      return;
    }
    if (validRecipients.length === 0) {
      toast.error('Ajoutez au moins un numéro de téléphone');
      return;
    }
    const invalid = validRecipients.find((num) => !/^\+?\d[\d\s\-()]{7,}$/.test(num));
    if (invalid) {
      toast.error(`Numéro invalide: ${invalid}`);
      return;
    }
    if (matchingTasks.length === 0) {
      toast.error('Aucune tâche ne correspond aux critères sélectionnés');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/alerts/bulk`,
        {
          priorities: selectedPriorities,
          channel,
          recipients: validRecipients,
          only_pending: onlyPending,
          custom_message: customMessage.trim() || null,
        },
        { withCredentials: true }
      );
      const { results, task_count } = response.data;
      if (results.failed.length === 0) {
        toast.success(`✓ Alerte ${channel.toUpperCase()} envoyée à ${results.success.length} destinataire(s) - ${task_count} tâche(s)`);
      } else {
        toast.warning(`Envoi partiel: ${results.success.length} réussi(s), ${results.failed.length} échec(s)`);
      }
      handleClose();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "Erreur lors de l'envoi";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRecipients(['']);
    setCustomMessage('');
    setSelectedPriorities(['urgent']);
    setOnlyPending(true);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="bulk-alert-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Alertes groupées par sévérité
          </DialogTitle>
          <DialogDescription>
            Envoyer un résumé des tâches à traiter filtrées par sévérité
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Channel */}
          <div className="space-y-2">
            <Label>Canal d'envoi</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={channel === 'sms' ? 'default' : 'outline'}
                onClick={() => setChannel('sms')}
                data-testid="bulk-channel-sms"
              >
                <Phone className="h-4 w-4 mr-2" /> SMS
              </Button>
              <Button
                type="button"
                variant={channel === 'whatsapp' ? 'default' : 'outline'}
                onClick={() => setChannel('whatsapp')}
                className={channel === 'whatsapp' ? 'bg-green-600 hover:bg-green-700' : ''}
                data-testid="bulk-channel-whatsapp"
              >
                <MessageSquare className="h-4 w-4 mr-2" /> WhatsApp
              </Button>
            </div>
          </div>

          {/* Priority Filter */}
          <div className="space-y-2">
            <Label>Sévérités à inclure *</Label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(PRIORITY_CONFIG).map(([key, config]) => {
                const count = tasks.filter((t) => {
                  const p = t.priority === 'normal' ? 'moyen' : t.priority;
                  if (p !== key) return false;
                  if (onlyPending && t.status === 'completed') return false;
                  return true;
                }).length;
                const isSelected = selectedPriorities.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => togglePriority(key)}
                    className={`p-3 rounded-lg border-2 text-left ${
                      isSelected ? config.color + ' border-solid' : 'border-dashed border-border bg-background'
                    }`}
                    data-testid={`priority-toggle-${key}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{config.label}</span>
                      {isSelected && <span className="text-xs">✓</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 font-mono">{count} tâche(s)</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Only pending */}
          <div className="flex items-center space-x-2 p-3 bg-secondary/50 rounded-lg">
            <Checkbox
              id="only-pending"
              checked={onlyPending}
              onCheckedChange={setOnlyPending}
              data-testid="only-pending-checkbox"
            />
            <label htmlFor="only-pending" className="text-sm cursor-pointer">
              Uniquement les tâches non terminées
            </label>
          </div>

          {/* Match count */}
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-sm">
              <span className="font-semibold text-primary">{matchingTasks.length}</span> tâche(s) seront incluses dans l'alerte
            </p>
          </div>

          {/* Recipients */}
          <div className="space-y-2">
            <Label>Destinataire(s) *</Label>
            {recipients.map((phone, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="tel"
                  placeholder="+225 XX XX XX XX"
                  value={phone}
                  onChange={(e) => updateRecipient(index, e.target.value)}
                  data-testid={`bulk-recipient-${index}`}
                />
                {recipients.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeRecipient(index)} type="button">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={addRecipient} type="button">
              <Plus className="h-3 w-3 mr-1" /> Ajouter un numéro
            </Button>
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label>Message personnalisé (optionnel)</Label>
            <Textarea
              placeholder="Note additionnelle..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={2}
              maxLength={200}
              data-testid="bulk-message-input"
            />
            <p className="text-xs text-muted-foreground">{customMessage.length}/200 caractères</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>Annuler</Button>
          <Button
            onClick={handleSend}
            disabled={loading || matchingTasks.length === 0}
            className={channel === 'whatsapp' ? 'bg-green-600 hover:bg-green-700' : ''}
            data-testid="bulk-send-button"
          >
            <Send className="h-4 w-4 mr-2" />
            {loading ? 'Envoi...' : `Envoyer ${channel.toUpperCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

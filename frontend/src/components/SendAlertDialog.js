import React, { useState } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { MessageSquare, Phone, X, Plus, Send } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Dialog to send task alerts via SMS or WhatsApp
 *
 * Props:
 *   - open: boolean
 *   - onClose: () => void
 *   - task: task object
 *   - channel: 'sms' | 'whatsapp' (initial channel)
 */
export const SendAlertDialog = ({ open, onClose, task, channel: initialChannel = 'sms' }) => {
  const [channel, setChannel] = useState(initialChannel);
  const [recipients, setRecipients] = useState(['']);
  const [customMessage, setCustomMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const addRecipient = () => setRecipients([...recipients, '']);
  const removeRecipient = (index) => setRecipients(recipients.filter((_, i) => i !== index));
  const updateRecipient = (index, value) => {
    const updated = [...recipients];
    updated[index] = value;
    setRecipients(updated);
  };

  const handleSend = async () => {
    const validRecipients = recipients.map((n) => n.trim()).filter((n) => n);

    if (validRecipients.length === 0) {
      toast.error('Veuillez ajouter au moins un numéro de téléphone');
      return;
    }

    // Basic validation - must have + and at least 8 digits
    const invalid = validRecipients.find((num) => !/^\+?\d[\d\s\-()]{7,}$/.test(num));
    if (invalid) {
      toast.error(`Numéro invalide: ${invalid}. Format attendu: +225XXXXXXXX`);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/alerts/task`,
        {
          task_id: task.task_id,
          channel,
          recipients: validRecipients,
          custom_message: customMessage.trim() || null,
        },
        { withCredentials: true }
      );

      const results = response.data.results;
      const successCount = results.success.length;
      const failCount = results.failed.length;

      if (failCount === 0) {
        toast.success(`✓ Alerte ${channel.toUpperCase()} envoyée à ${successCount} destinataire(s)`);
      } else {
        toast.warning(`Envoi partiel: ${successCount} réussi(s), ${failCount} échec(s)`);
      }
      handleClose();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "Erreur lors de l'envoi de l'alerte";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRecipients(['']);
    setCustomMessage('');
    onClose();
  };

  const ChannelIcon = channel === 'sms' ? Phone : MessageSquare;
  const channelColor = channel === 'sms' ? 'text-blue-600' : 'text-green-600';
  const channelLabel = channel === 'sms' ? 'SMS' : 'WhatsApp';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg" data-testid="send-alert-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChannelIcon className={`h-5 w-5 ${channelColor}`} />
            Envoyer une alerte {channelLabel}
          </DialogTitle>
          <DialogDescription>
            Tâche: <span className="font-medium">{task?.title}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Channel Selector */}
          <div className="space-y-2">
            <Label>Canal</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={channel === 'sms' ? 'default' : 'outline'}
                onClick={() => setChannel('sms')}
                data-testid="channel-sms-button"
              >
                <Phone className="h-4 w-4 mr-2" />
                SMS
              </Button>
              <Button
                type="button"
                variant={channel === 'whatsapp' ? 'default' : 'outline'}
                onClick={() => setChannel('whatsapp')}
                className={channel === 'whatsapp' ? 'bg-green-600 hover:bg-green-700' : ''}
                data-testid="channel-whatsapp-button"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
            </div>
          </div>

          {/* Recipients */}
          <div className="space-y-2">
            <Label>Numéro(s) de téléphone *</Label>
            {recipients.map((phone, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="tel"
                  placeholder="+225 XX XX XX XX"
                  value={phone}
                  onChange={(e) => updateRecipient(index, e.target.value)}
                  data-testid={`alert-recipient-${index}`}
                />
                {recipients.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRecipient(index)}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={addRecipient}
              type="button"
              data-testid="add-recipient-button"
            >
              <Plus className="h-3 w-3 mr-1" /> Ajouter un numéro
            </Button>
            <p className="text-xs text-muted-foreground">
              Format international requis: <span className="font-mono">+225XXXXXXXX</span>
            </p>
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="alert-message">Message personnalisé (optionnel)</Label>
            <Textarea
              id="alert-message"
              placeholder="Ajouter une note à l'alerte..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
              maxLength={300}
              data-testid="alert-message-input"
            />
            <p className="text-xs text-muted-foreground">
              {customMessage.length}/300 caractères. Les détails de la tâche sont automatiquement inclus.
            </p>
          </div>

          {/* Preview */}
          <div className="rounded-lg border bg-secondary/40 p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Aperçu du message</p>
            <div className="text-xs font-mono whitespace-pre-line text-foreground/80 max-h-40 overflow-y-auto">
              {`🔔 K-TECHNOLOGY - Alerte Tâche

Priorité: ${task?.priority?.toUpperCase() || 'NORMAL'}
📋 ${task?.title || ''}${task?.due_date ? `\n📅 Échéance: ${task.due_date}` : ''}${customMessage ? `\n\n💬 ${customMessage}` : ''}`}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            onClick={handleSend}
            disabled={loading}
            className={channel === 'whatsapp' ? 'bg-green-600 hover:bg-green-700' : ''}
            data-testid="send-alert-button"
          >
            <Send className="h-4 w-4 mr-2" />
            {loading ? 'Envoi...' : `Envoyer ${channelLabel}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

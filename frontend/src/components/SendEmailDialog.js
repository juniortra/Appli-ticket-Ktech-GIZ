import React, { useState } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Mail, Paperclip, X, Plus } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FORM_TYPE_LABELS = {
  frm: 'Fiche de Réception de Matériel',
  fdi: "Fiche d'Intervention",
  rdd: 'Rapport de Diagnostic',
  rdi: "Rapport d'Incident",
};

export const SendEmailDialog = ({ open, onClose, formType, formId, formNumber }) => {
  const [recipients, setRecipients] = useState(['']);
  const [ccList, setCcList] = useState([]);
  const [bccList, setBccList] = useState([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState(`${FORM_TYPE_LABELS[formType]} - ${formNumber || formId}`);
  const [message, setMessage] = useState('');
  const [includePdf, setIncludePdf] = useState(true);
  const [loading, setLoading] = useState(false);

  const addEmail = (setter, list) => {
    setter([...list, '']);
  };

  const removeEmail = (setter, list, index) => {
    setter(list.filter((_, i) => i !== index));
  };

  const updateEmail = (setter, list, index, value) => {
    const updated = [...list];
    updated[index] = value;
    setter(updated);
  };

  const handleSend = async () => {
    const validRecipients = recipients.map((e) => e.trim()).filter((e) => e);
    const validCc = ccList.map((e) => e.trim()).filter((e) => e);
    const validBcc = bccList.map((e) => e.trim()).filter((e) => e);

    if (validRecipients.length === 0) {
      toast.error('Veuillez ajouter au moins un destinataire');
      return;
    }
    if (!subject.trim()) {
      toast.error("L'objet est requis");
      return;
    }
    if (!message.trim()) {
      toast.error('Le message est requis');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/api/email/send-report`,
        {
          form_type: formType,
          form_id: formId,
          recipients: validRecipients,
          cc: validCc,
          bcc: validBcc,
          subject: subject.trim(),
          message: message.trim(),
          include_pdf: includePdf,
        },
        { withCredentials: true }
      );
      toast.success(`Email envoyé à ${validRecipients.length} destinataire(s)`);
      handleClose();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erreur lors de l\'envoi de l\'email';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRecipients(['']);
    setCcList([]);
    setBccList([]);
    setShowCc(false);
    setShowBcc(false);
    setMessage('');
    setIncludePdf(true);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="send-email-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Envoyer le rapport par email
          </DialogTitle>
          <DialogDescription>
            {FORM_TYPE_LABELS[formType]} • {formNumber || formId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipients */}
          <div className="space-y-2">
            <Label>Destinataire(s) *</Label>
            {recipients.map((email, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="exemple@email.com"
                  value={email}
                  onChange={(e) => updateEmail(setRecipients, recipients, index, e.target.value)}
                  data-testid={`recipient-input-${index}`}
                />
                {recipients.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEmail(setRecipients, recipients, index)}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <div className="flex gap-2 text-xs">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addEmail(setRecipients, recipients)}
                type="button"
                data-testid="add-recipient-button"
              >
                <Plus className="h-3 w-3 mr-1" /> Ajouter un destinataire
              </Button>
              {!showCc && (
                <Button variant="ghost" size="sm" onClick={() => { setShowCc(true); setCcList(['']); }} type="button">
                  + Cc
                </Button>
              )}
              {!showBcc && (
                <Button variant="ghost" size="sm" onClick={() => { setShowBcc(true); setBccList(['']); }} type="button">
                  + Cci
                </Button>
              )}
            </div>
          </div>

          {/* CC */}
          {showCc && (
            <div className="space-y-2">
              <Label>Cc (copie)</Label>
              {ccList.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="cc@email.com"
                    value={email}
                    onChange={(e) => updateEmail(setCcList, ccList, index, e.target.value)}
                    data-testid={`cc-input-${index}`}
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeEmail(setCcList, ccList, index)} type="button">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => addEmail(setCcList, ccList)} type="button">
                <Plus className="h-3 w-3 mr-1" /> Ajouter en Cc
              </Button>
            </div>
          )}

          {/* BCC */}
          {showBcc && (
            <div className="space-y-2">
              <Label>Cci (copie cachée)</Label>
              {bccList.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="cci@email.com"
                    value={email}
                    onChange={(e) => updateEmail(setBccList, bccList, index, e.target.value)}
                    data-testid={`bcc-input-${index}`}
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeEmail(setBccList, bccList, index)} type="button">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => addEmail(setBccList, bccList)} type="button">
                <Plus className="h-3 w-3 mr-1" /> Ajouter en Cci
              </Button>
            </div>
          )}

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="email-subject">Objet *</Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              data-testid="email-subject-input"
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="email-message">Message *</Label>
            <Textarea
              id="email-message"
              placeholder="Rédigez votre message ici..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              data-testid="email-message-input"
            />
            <p className="text-xs text-muted-foreground">
              Votre message sera inclus dans un email formaté avec le résumé de la fiche.
            </p>
          </div>

          {/* PDF Attachment */}
          <div className="flex items-center space-x-2 p-3 bg-secondary/50 rounded-lg">
            <Checkbox
              id="include-pdf"
              checked={includePdf}
              onCheckedChange={setIncludePdf}
              data-testid="include-pdf-checkbox"
            />
            <label htmlFor="include-pdf" className="flex items-center gap-2 text-sm cursor-pointer">
              <Paperclip className="h-4 w-4" />
              Joindre la fiche complète en PDF
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSend} disabled={loading} data-testid="send-email-button">
            <Mail className="h-4 w-4 mr-2" />
            {loading ? 'Envoi en cours...' : "Envoyer l'email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

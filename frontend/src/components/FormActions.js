import React, { useState } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Mail, FileDown } from 'lucide-react';
import { SendEmailDialog } from './SendEmailDialog';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Reusable action buttons for form cards (Download PDF + Send Email)
 *
 * Props:
 *  - formType: 'frm' | 'fdi' | 'rdd' | 'rdi'
 *  - formId: form identifier
 *  - formNumber: display name for the email subject
 */
export const FormActions = ({ formType, formId, formNumber }) => {
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  const downloadPdf = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/email/download-pdf/${formType}/${formId}`,
        { withCredentials: true, responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${formType.toUpperCase()}_${formNumber || formId}.pdf`);
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
    <>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={downloadPdf}
          title="Télécharger PDF"
          data-testid={`download-${formType}-${formId}`}
        >
          <FileDown className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setEmailDialogOpen(true)}
          title="Envoyer par email"
          data-testid={`email-${formType}-${formId}`}
        >
          <Mail className="h-4 w-4" />
        </Button>
      </div>

      {emailDialogOpen && (
        <SendEmailDialog
          open={emailDialogOpen}
          onClose={() => setEmailDialogOpen(false)}
          formType={formType}
          formId={formId}
          formNumber={formNumber}
        />
      )}
    </>
  );
};

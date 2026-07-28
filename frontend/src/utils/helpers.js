export function formatApiErrorDetail(detail) {
  if (detail == null) return 'Une erreur est survenue. Veuillez réessayer.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === 'string' ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(' ');
  if (detail && typeof detail.msg === 'string') return detail.msg;
  return String(detail);
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function getStatusBadgeColor(status) {
  const colors = {
    en_cours: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    termine: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    en_attente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    ouvert: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    resolu: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    ferme: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    todo: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getPriorityBadgeColor(priority) {
  const colors = {
    urgent: 'bg-red-600 text-white',
    normal: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    faible: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  };
  return colors[priority] || 'bg-gray-100 text-gray-800';
}

export const INTERVENTION_TYPES = [
  'Installation logiciel',
  'Désinstallation logiciel',
  'Configuration réseau',
  'Réparation matériel',
  'Remplacement composant',
  'Mise à jour système',
  'Sauvegarde données',
  'Restauration système',
  'Formation utilisateur',
  'Diagnostic panne',
  'Maintenance préventive',
  'Support téléphonique',
  'Installation matériel',
  'Configuration email',
  'Formatage système GIZ',
];

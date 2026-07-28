import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { FileDown, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

export const ReportsPage = () => {
  const generateReport = (type) => {
    toast.info(`Génération du rapport ${type} en cours...`);
  };

  return (
    <div className="space-y-6" data-testid="reports-page">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rapports d'Analyse</h1>
        <p className="text-muted-foreground">Génération et export de rapports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card data-testid="report-pdf-export">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileDown className="h-5 w-5" />
              Export PDF des Fiches
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Exportez vos fiches individuelles au format PDF pour archivage ou impression.
            </p>
            <div className="space-y-2">
              <Button className="w-full" onClick={() => generateReport('FRM')} data-testid="export-frm-pdf">
                Exporter FRM en PDF
              </Button>
              <Button className="w-full" onClick={() => generateReport('FDI')} data-testid="export-fdi-pdf">
                Exporter FDI en PDF
              </Button>
              <Button className="w-full" onClick={() => generateReport('RDD')} data-testid="export-rdd-pdf">
                Exporter RDD en PDF
              </Button>
              <Button className="w-full" onClick={() => generateReport('RDI')} data-testid="export-rdi-pdf">
                Exporter RDI en PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="report-analytics">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Rapports d'Analyse
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Générez des rapports d'analyse avec statistiques et graphiques.
            </p>
            <div className="space-y-2">
              <Button className="w-full" onClick={() => generateReport('mensuel')} data-testid="report-monthly">
                Rapport Mensuel
              </Button>
              <Button className="w-full" onClick={() => generateReport('technicien')} data-testid="report-by-tech">
                Rapport par Technicien
              </Button>
              <Button className="w-full" onClick={() => generateReport('incidents')} data-testid="report-incidents">
                Rapport d'Incidents
              </Button>
              <Button className="w-full" onClick={() => generateReport('performance')} data-testid="report-performance">
                Rapport de Performance
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historique des Rapports</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucun rapport généré récemment
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

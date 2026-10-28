import type { Metadata } from 'next';
import MuroDashboard from '@/components/dashboard/MuroDashboard';

export const metadata: Metadata = {
  title: 'Muro de Publicaciones | INACADT',
  description:
    'Muro universitario de clasificados para intercambio de conocimiento académico con validación de Sello de Profesor (RF03, RF04, RF08).',
};

export default function DashboardPage() {
  return <MuroDashboard />;
}


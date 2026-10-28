import type { Metadata } from 'next';
import LoginForm from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Autenticación | INACADT',
  description: 'Acceso institucional conectado a Supabase Auth (RF01).',
};

export default function AuthPage() {
  return <LoginForm />;
}


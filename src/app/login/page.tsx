import type { Metadata } from 'next';
import LoginForm from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Iniciar Sesión | INACADT',
  description: 'Autenticación institucional conectada a Supabase Auth (RF01).',
};

export default function LoginPage() {
  return <LoginForm />;
}


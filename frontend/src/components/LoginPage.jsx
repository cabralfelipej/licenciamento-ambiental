import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // Para redirecionamento e obter o estado da rota
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from "sonner";
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx'; // Importar e usar o hook

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth(); // Usar o login do AuthContext

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.erro || 'Falha no login. Verifique suas credenciais.');
      }

      login(data.token, data.user); // Usa a função login do AuthContext

      // Não é mais necessário o armazenamento direto no localStorage aqui, pois o AuthContext faz isso.
      // localStorage.setItem('authToken', data.token);
      // localStorage.setItem('userData', JSON.stringify(data.user));

      toast.success('Login realizado com sucesso!');
      // Tenta navegar para a rota original se existir, ou para o dashboard
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(error.message || 'Erro desconhecido ao tentar fazer login.');
      console.error('Erro no login:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Login</CardTitle>
          <CardDescription className="text-center">
            Acesse sua conta para gerenciar as licenças e condicionantes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Entrar'}
            </Button>
          </form>
          {/* Futuramente, pode adicionar link para "Esqueci minha senha" ou "Registrar-se" aqui
              <div className="mt-4 text-center text-sm">
                Não tem uma conta? <a href="/register" className="underline">Registre-se</a>
              </div>
          */}
        </CardContent>
      </Card>
    </div>
  );
}

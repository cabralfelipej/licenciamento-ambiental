import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Ajuste o caminho se necessário

export function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // Pode retornar um spinner/componente de loading global aqui
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-32 w-32"></div> {/* Exemplo de loader */}
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redireciona para login, guardando a rota original para redirecionamento após login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se allowedRoles for definido, verifica se o usuário tem o papel permitido
  if (allowedRoles && allowedRoles.length > 0 && user?.role) {
    if (!allowedRoles.includes(user.role)) {
      // Usuário autenticado, mas não tem o papel necessário
      // Redireciona para uma página de "Não Autorizado" ou para a home
      // Por enquanto, vamos redirecionar para a home (ou uma página de erro 403 se existir)
      // Poderia também mostrar uma mensagem inline ou um componente específico de "Não Autorizado"
      console.warn(`Usuário com papel '${user.role}' tentou acessar rota protegida para papéis: ${allowedRoles.join(', ')}`);
      return <Navigate to="/" replace />; // Ou para /unauthorized
    }
  }

  // Se `children` for passado, renderiza `children`. Caso contrário, renderiza `<Outlet />` para rotas aninhadas.
  return children ? children : <Outlet />;
}

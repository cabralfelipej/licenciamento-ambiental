import React, { createContext, useState, useContext, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode'; // Usaremos jwt-decode para verificar expiração do token

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('userData');
    try {
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error("Erro ao parsear userData do localStorage:", error);
      return null;
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Será derivado do token
  const [isLoading, setIsLoading] = useState(true); // Começa como true para verificar token inicial

  useEffect(() => {
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        if (decodedToken.exp > currentTime) {
          setIsAuthenticated(true);
          // Se user não estiver no estado, mas token sim (ex: refresh da página)
          // e não foi pego pelo useState inicial do localStorage, podemos tentar pegar de novo
          if (!user) {
            const storedUser = localStorage.getItem('userData');
            if (storedUser) setUser(JSON.parse(storedUser));
          }
        } else {
          // Token expirado
          console.log("Token expirado.");
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Token inválido:", error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
      }
    } else {
      setIsAuthenticated(false);
    }
    setIsLoading(false);
  }, [token]); // Re-executa quando o token muda

  const login = (newToken, userData) => {
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('userData', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    setIsAuthenticated(true); // Definido explicitamente aqui também
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  // Função para atualizar dados do usuário se necessário (ex: após editar perfil)
  const updateUserAppData = (newUserData) => {
    localStorage.setItem('userData', JSON.stringify(newUserData));
    setUser(newUserData);
  };


  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated, isLoading, login, logout, updateUserAppData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

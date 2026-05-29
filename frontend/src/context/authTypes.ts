import { createContext } from "react";

export interface User {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  dni: string | null;
  fecha_nacimiento: string | null;
  rol: "alumno" | "profesor" | "recepcionista" | "admin";
  activo: boolean;
  creditos: number;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  login: () => void;
  signup: () => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

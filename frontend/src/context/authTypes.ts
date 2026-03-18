import { createContext } from "react";

export interface User {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  dni: string | null;
  fecha_nacimiento: string | null;
  rol: "alumno" | "profesor" | "recepcionista" | "admin";
  activo: boolean;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

export interface RegisterData {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  telefono?: string;
  dni?: string;
  fecha_nacimiento?: string;
}

export const AuthContext = createContext<AuthState | null>(null);

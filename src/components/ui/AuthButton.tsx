import React from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export const AuthButton = () => {
  const navigate = useNavigate();
  const { isGuest, signOut } = useAuthStore();

  const handleAuthAction = async () => {
    if (isGuest) {
      // Direct guest to login/signup
      navigate('/login');
    } else {
      // Log out real user
      await signOut();
      navigate('/login');
    }
  };

  if (!isGuest) {
    return (
      <button 
        onClick={handleAuthAction}
        className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-destructive shadow-sm hover:scale-110 hover:-translate-y-1 hover:bg-destructive/10 transition-all duration-300"
        title="Logout"
      >
        <LogOut size={18} />
      </button>
    );
  }

  return (
    <button 
      onClick={handleAuthAction}
      className="flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all shadow-sm hover:shadow-md bg-primary text-primary-foreground hover:bg-primary/90"
    >
      <LogIn size={16} />
      <span>Sign Up</span>
    </button>
  );
};

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { authService } from '../services/api/authService.js';
import { supabase } from '../services/supabase.js';

const AuthContext = createContext();

const DEMO_PASSWORD = 'Password123!';

const ROLE_EMAIL_MAP = {
  CLIENT: 'alex.morgan@email.com',
  DRIVER: 'driver@atlascharge.com',
  FLEET_DISPATCHER: 'dispatcher@atlascharge.com',
  SUPER_ADMIN: 'admin@atlascharge.com',
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // 1. Set up Auth State Change listener FIRST
    const { data: { subscription } } = authService.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        await loadProfile(newSession.user.id, newSession.user.email);
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    // 2. Initialize Session
    async function initSession() {
      try {
        const { data: { session: existingSession } } = await authService.getSession();
        if (existingSession?.user) {
          setSession(existingSession);
          await loadProfile(existingSession.user.id, existingSession.user.email);
        } else {
          setSession(null);
          setCurrentUser(null);
        }
      } catch (err) {
        console.warn('Session initialization error:', err.message);
        setSession(null);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    }

    initSession();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const loadProfile = async (userId, userEmail) => {
    try {
      const { data, error } = await authService.fetchUserProfile(userId);
      if (!error && data && data.is_active !== false) {
        setCurrentUser(data);
      } else {
        console.warn('User profile not found in public.users or is inactive:', userId);
        await authService.signOut();
        setCurrentUser(null);
        setSession(null);
      }
    } catch {
      setCurrentUser(null);
      setSession(null);
    }
  };

  const signIn = async (email, password) => {
    const res = await authService.signIn(email, password);
    if (res.error) throw res.error;
    return res.data;
  };

  const signUp = async (email, password, fullName, phoneNumber, role = 'CLIENT', options = {}) => {
    const res = await authService.signUp(email, password, fullName, phoneNumber, role, options);
    if (res.error) throw res.error;
    return res.data;
  };

  const signOut = async () => {
    await authService.signOut();
    setSession(null);
    setCurrentUser(null);
  };

  const switchRole = async (targetRole) => {
    let targetEmail = ROLE_EMAIL_MAP[targetRole];
    if (!targetEmail && targetRole !== 'DRIVER') return;

    try {
      let { data, error } = await authService.signIn(targetEmail, DEMO_PASSWORD);

      // If preset driver email is deleted or missing, look up the latest active driver in the database
      if (error && targetRole === 'DRIVER') {
        const { data: activeDrivers } = await supabase
          .from('users')
          .select('email')
          .eq('role', 'DRIVER')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1);

        if (activeDrivers && activeDrivers.length > 0) {
          targetEmail = activeDrivers[0].email;
          const retry = await authService.signIn(targetEmail, DEMO_PASSWORD);
          data = retry.data;
          error = retry.error;
        }
      }

      if (error) {
        throw new Error(`Account for ${targetRole} (${targetEmail || 'unknown'}) was not found or could not be signed in: ${error.message}`);
      }

      if (data?.session) {
        setSession(data.session);
        await loadProfile(data.user.id, targetEmail);
      }
    } catch (err) {
      throw err;
    }
  };

  const updateUserProfile = async (profileData) => {
    if (!currentUser) throw new Error('Not authenticated');
    const { user } = await authService.updateUserProfile(currentUser.id, profileData);
    if (user) {
      setCurrentUser(prev => ({ ...prev, ...user }));
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      session,
      loading,
      signIn,
      signUp,
      signOut,
      switchRole,
      updateUserProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

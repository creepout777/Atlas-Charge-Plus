import { supabase } from '../supabase.js';

export const authService = {
  async getSession() {
    return await supabase.auth.getSession();
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },

  async signIn(email, password, options = {}) {
    return await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        captchaToken: options.captchaToken,
      },
    });
  },

  async signUp(email, password, fullName, phoneNumber, role = 'CLIENT', options = {}) {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: options.emailRedirectTo || `${window.location.origin}/`,
        captchaToken: options.captchaToken,
        data: {
          full_name: fullName,
          phone_number: phoneNumber,
          role: role,
        },
      },
    });
  },

  async resendConfirmationEmail(email) {
    return await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
  },

  async resetPasswordForEmail(email, options = {}) {
    const redirectTo = options.redirectTo || `${window.location.origin}/reset-password`;
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
      captchaToken: options.captchaToken,
    });
  },

  async updateUserPassword(newPassword) {
    return await supabase.auth.updateUser({
      password: newPassword,
    });
  },

  async signOut() {
    return await supabase.auth.signOut();
  },

  async fetchUserProfile(userId) {
    return await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
  },

  async updateUserProfile(userId, profileData) {
    const userUpdates = {};
    if (profileData.fullName !== undefined) userUpdates.full_name = profileData.fullName;
    if (profileData.phoneNumber !== undefined) userUpdates.phone_number = profileData.phoneNumber;
    if (profileData.avatarUrl !== undefined) userUpdates.avatar_url = profileData.avatarUrl;
    userUpdates.updated_at = new Date().toISOString();

    const { data: user, error: userError } = await supabase
      .from('users')
      .update(userUpdates)
      .eq('id', userId)
      .select()
      .single();

    if (userError) throw userError;

    if (profileData.notificationPreferences) {
      await supabase
        .from('client_profiles')
        .update({
          notification_preferences_json: profileData.notificationPreferences,
        })
        .eq('user_id', userId);
    }

    return { user };
  },

  async getClientProfile(userId) {
    return await supabase
      .from('client_profiles')
      .select('referral_code, push_notification_token, notification_preferences_json')
      .eq('user_id', userId)
      .single();
  },
};

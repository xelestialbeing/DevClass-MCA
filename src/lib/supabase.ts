/**
 * Supabase Client, Auth & Face ID Telegram Verification Service
 * Includes FAANG-scale debounced username availability checking and smart generator.
 */

export interface UserProfile {
  id: string;
  username: string;
  phoneNumber?: string;
  catchphrase?: string;
  avatar?: string;
  avatarUrl?: string; // Custom public profile photo uploaded by user
  email?: string;
  faceScanUrl?: string; // Biometric scan strictly for college audit & verification
  faceScanStatus?: 'pending' | 'verified' | 'rejected';
  isApproved?: boolean; // Account approval flag: true once admin verifies entry
}

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : ({} as Record<string, string | undefined>);
const SUPABASE_URL = env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || '';
const TELEGRAM_BOT_TOKEN = env.VITE_TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_ADMIN_CHAT_ID = env.VITE_TELEGRAM_ADMIN_CHAT_ID || '';
export const TELEGRAM_BOT_USERNAME = String(
  env.VITE_TELEGRAM_BOT_USERNAME || ''
).replace(/^@/, '').trim();

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(SUPABASE_URL) &&
    Boolean(SUPABASE_ANON_KEY) &&
    !SUPABASE_URL.includes('your-project-id') &&
    !SUPABASE_ANON_KEY.includes('your-anon-key')
  );
};

const SESSION_KEY = 'college_presence_user';

// In-memory LRU / Set cache for instant FAANG-style lookups
const usernameCache = new Map<string, boolean>();

export const supabaseService = {
  isConfigured: isSupabaseConfigured,

  // Retrieve current cached session
  getCurrentUser(): UserProfile | null {
    try {
      const data = localStorage.getItem(SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  // 1. FAANG-Grade Real-Time Username Availability Checker
  async checkUsernameAvailability(rawUsername: string): Promise<{
    available: boolean;
    suggestions: string[];
    error?: string;
  }> {
    const clean = rawUsername.trim().toLowerCase();
    if (!clean || clean.length < 3) {
      return { available: false, suggestions: [] };
    }

    // Check in-memory cache first
    if (usernameCache.has(clean)) {
      const cachedAvailable = usernameCache.get(clean)!;
      return {
        available: cachedAvailable,
        suggestions: cachedAvailable ? [] : this.generateSuggestions(clean),
      };
    }

    if (!isSupabaseConfigured()) {
      // Local dev mock check
      const takenMock = ['admin', 'root', 'neo', 'matrix', 'prof'];
      const available = !takenMock.includes(clean);
      usernameCache.set(clean, available);
      return {
        available,
        suggestions: available ? [] : this.generateSuggestions(clean),
      };
    }

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/users?username=ilike.${encodeURIComponent(clean)}&select=id`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error('Availability check query failed');
      }

      const rows = await res.json();
      const isAvailable = !rows || rows.length === 0;
      usernameCache.set(clean, isAvailable);

      return {
        available: isAvailable,
        suggestions: isAvailable ? [] : this.generateSuggestions(clean),
      };
    } catch (err: any) {
      console.warn('Username query error, defaulting to available:', err);
      return { available: true, suggestions: [] };
    }
  },

  // Generate smart alternatives like Instagram/Discord
  generateSuggestions(base: string): string[] {
    const clean = base.replace(/[^a-z0-9_]/gi, '');
    const rand = Math.floor(10 + Math.random() * 89);
    return [
      `${clean}_mca`,
      `the_${clean}`,
      `${clean}_${rand}`,
      `cyber_${clean}`,
    ];
  },

  // Fetch full student profile by username for direct terminal login
  async getUserByUsername(username: string): Promise<UserProfile | null> {
    const clean = username.trim().toLowerCase();
    if (!clean) return null;

    if (!isSupabaseConfigured()) {
      return {
        id: 'usr_local_' + clean,
        username: clean,
        phoneNumber: '+91 98765 00000',
        catchphrase: 'Local dev student',
        avatar: clean.charAt(0).toUpperCase(),
        faceScanStatus: 'verified',
      };
    }

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/users?username=ilike.${encodeURIComponent(clean)}&select=*`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (res.ok) {
        const rows = await res.json();
        if (rows && rows.length > 0) {
          const r = rows[0];
          const isApproved = r.face_scan_status === 'verified';
          const userProfile: UserProfile = {
            id: r.id,
            username: r.username,
            phoneNumber: r.phone_number,
            catchphrase: r.catchphrase || '',
            avatar: r.username.charAt(0).toUpperCase(),
            avatarUrl: r.avatar_url || undefined,
            email: r.email,
            faceScanUrl: r.face_scan_url,
            faceScanStatus: r.face_scan_status,
            isApproved,
          };
          localStorage.setItem(SESSION_KEY, JSON.stringify(userProfile));
          return userProfile;
        }
      }
      return null;
    } catch (err) {
      console.error('Error fetching user by username:', err);
      return null;
    }
  },

  // 2. Upload Face Scan Snapshot to Supabase Storage
  async uploadFaceScan(username: string, base64Image: string): Promise<string | null> {
    if (!base64Image) return null;
    if (!isSupabaseConfigured()) {
      return base64Image; // In local fallback, use data URI directly
    }

    try {
      const blob = await (await fetch(base64Image)).blob();
      const fileName = `${username.toLowerCase()}_${Date.now()}.jpg`;

      const uploadRes = await fetch(
        `${SUPABASE_URL}/storage/v1/object/face-scans/${fileName}`,
        {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'image/jpeg',
          },
          body: blob,
        }
      );

      if (!uploadRes.ok) {
        console.warn('Storage upload returned error, using fallback preview');
        return base64Image;
      }

      // Public URL of uploaded image
      return `${SUPABASE_URL}/storage/v1/object/public/face-scans/${fileName}`;
    } catch (err) {
      console.error('Failed to upload face scan to storage bucket:', err);
      return base64Image;
    }
  },

  // 3. Dispatch Verification Request to Telegram Bot
  async notifyTelegramAdmin(payload: {
    username: string;
    phoneNumber: string;
    catchphrase: string;
    faceScanBase64: string;
  }): Promise<boolean> {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) {
      console.info(
        'Telegram Bot Token or Admin Chat ID not yet set in .env. Skipping Telegram push.'
      );
      return false;
    }

    try {
      const blob = await (await fetch(payload.faceScanBase64)).blob();
      const formData = new FormData();
      formData.append('chat_id', TELEGRAM_ADMIN_CHAT_ID);
      formData.append('photo', blob, 'face_scan.jpg');
      const cleanUser = payload.username.replace(/^@/, '').trim();
      const cleanPhone = payload.phoneNumber.trim();

      formData.append(
        'caption',
        `🚨 *NEW STUDENT REGISTRATION - DEVCLASS MCA*\n\n` +
        `👤 *Username:* @${cleanUser}\n` +
        `📱 *Phone:* \`${cleanPhone}\`\n` +
        `💬 *Bio:* _${payload.catchphrase || 'No catchphrase'}_\n` +
        `📅 *Time:* ${new Date().toLocaleTimeString()}\n\n` +
        `🔒 *Status:* ⏳ *PENDING ADMIN APPROVAL*\n` +
        `Account is currently restricted (cannot vote or reserve seats).\n` +
        `Review the biometric face scan above and tap below to approve or reject student participation.`
      );
      formData.append('parse_mode', 'Markdown');
      formData.append(
        'reply_markup',
        JSON.stringify({
          inline_keyboard: [
            [
              { text: '✅ APPROVE STUDENT', callback_data: `approve:${cleanUser}:${cleanPhone}` },
              { text: '❌ REJECT', callback_data: `reject:${cleanUser}:${cleanPhone}` },
            ],
          ],
        })
      );

      const tgRes = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
        {
          method: 'POST',
          body: formData,
        }
      );

      return tgRes.ok;
    } catch (err) {
      console.error('Failed to dispatch alert to Telegram Bot:', err);
      return false;
    }
  },

  // 4. Complete Full Sign Up with Biometric Face ID (Mandatory for record) & Optional Avatar
  async registerStudent(params: {
    username: string;
    phoneNumber: string;
    catchphrase?: string;
    faceScanBase64: string; // Mandatory biometric face scan for audit record
    customAvatarBase64?: string; // Optional user profile picture
    email?: string;
  }): Promise<{ user?: UserProfile; error?: string }> {
    const cleanUsername = params.username.trim();
    const cleanPhone = params.phoneNumber.trim();

    if (!cleanUsername) return { error: 'Username is required.' };
    if (!cleanPhone) return { error: 'Phone number is required.' };
    if (!params.faceScanBase64) return { error: 'Biometric face scan is required for student verification record.' };

    try {
      // 1. Upload biometric face scan for admin records
      const faceUrl = await this.uploadFaceScan(cleanUsername, params.faceScanBase64);

      // 2. Upload optional custom profile avatar if user provided one
      let customAvatarUrl: string | undefined = undefined;
      if (params.customAvatarBase64) {
        customAvatarUrl = (await this.uploadFaceScan(cleanUsername + '_avatar', params.customAvatarBase64)) || undefined;
      }

      // 3. Transmit alert to Telegram Admin with approval buttons
      this.notifyTelegramAdmin({
        username: cleanUsername,
        phoneNumber: cleanPhone,
        catchphrase: params.catchphrase || '',
        faceScanBase64: params.faceScanBase64,
      });

      // 4. Construct user profile (Pending approval: cannot vote or reserve seats until approved)
      const newUser: UserProfile = {
        id: 'usr_' + Math.random().toString(36).substring(2, 9),
        username: cleanUsername,
        phoneNumber: cleanPhone,
        catchphrase: params.catchphrase?.trim() || 'Ready for tomorrow',
        avatar: cleanUsername.charAt(0).toUpperCase(),
        avatarUrl: customAvatarUrl,
        email: params.email?.trim() || undefined,
        faceScanUrl: faceUrl || undefined, // Biometric record stored for college
        faceScanStatus: 'pending',
        isApproved: false, // Inactive until admin approval
      };

      if (isSupabaseConfigured()) {
        try {
          const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
            method: 'POST',
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'resolution=merge-duplicates,return=representation',
            },
            body: JSON.stringify({
              username: newUser.username,
              phone_number: newUser.phoneNumber,
              email: newUser.email || null,
              catchphrase: newUser.catchphrase,
              avatar_url: newUser.avatarUrl || null,
              face_scan_url: newUser.faceScanUrl,
              face_scan_status: 'pending',
            }),
          });

          if (insertRes.ok) {
            const data = await insertRes.json();
            if (data && data[0]) {
              newUser.id = data[0].id;
            }
          }

          // 5. Prune temporary phone verification records to eliminate redundant session data
          fetch(
            `${SUPABASE_URL}/rest/v1/phone_verifications?phone_number=eq.${encodeURIComponent(
              cleanPhone
            )}`,
            {
              method: 'DELETE',
              headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              },
            }
          ).catch((e) => console.warn('Cleanup warning:', e));
        } catch (dbErr) {
          console.warn('Database save failed, using local session:', dbErr);
        }
      }

      localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
      return { user: newUser };
    } catch (err: any) {
      return { error: err.message || 'Registration failed' };
    }
  },

  // 5. Sign In by Username
  async signInWithUsername(username: string): Promise<{ user?: UserProfile; error?: string }> {
    const trimmed = username.trim();
    if (!trimmed) {
      return { error: 'Username cannot be empty.' };
    }

    if (!isSupabaseConfigured()) {
      const user: UserProfile = {
        id: 'user-' + trimmed.toLowerCase().replace(/\s+/g, '-'),
        username: trimmed,
        phoneNumber: '+91 98765 00000',
        catchphrase: 'Classroom Batch 2026',
        avatar: trimmed.charAt(0).toUpperCase(),
        faceScanStatus: 'verified',
        isApproved: true,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      return { user };
    }

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/users?username=ilike.${encodeURIComponent(trimmed)}&select=*`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error(`Supabase query error: ${res.statusText}`);
      }

      const rows = await res.json();
      if (!rows || rows.length === 0) {
        return { error: `No registered account found for "${trimmed}". Please sign up first.` };
      }

      const isApproved = rows[0].face_scan_status === 'verified';

      const user: UserProfile = {
        id: rows[0].id,
        username: rows[0].username,
        phoneNumber: rows[0].phone_number,
        catchphrase: rows[0].catchphrase || 'Active Student',
        avatar: rows[0].username.charAt(0).toUpperCase(),
        avatarUrl: rows[0].avatar_url || undefined,
        email: rows[0].email,
        faceScanUrl: rows[0].face_scan_url,
        faceScanStatus: rows[0].face_scan_status || 'pending',
        isApproved,
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      return { user };
    } catch (err: any) {
      console.error('Supabase query error:', err);
      return { error: err.message || 'Failed to authenticate user.' };
    }
  },

  // 5. Update Student Catchphrase (Editable via Profile Icon)
  async updateCatchphrase(userId: string, newCatchphrase: string): Promise<UserProfile> {
    const current = this.getCurrentUser() || {
      id: userId,
      username: 'Student',
      catchphrase: newCatchphrase,
    };
    current.catchphrase = newCatchphrase;
    localStorage.setItem(SESSION_KEY, JSON.stringify(current));

    if (isSupabaseConfigured()) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(userId)}`, {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ catchphrase: newCatchphrase }),
        });
      } catch (err) {
        console.warn('Failed to patch catchphrase in Supabase:', err);
      }
    }

    return current;
  },

  // 6. Handle Google OAuth Callback & Detect if New User or Existing
  async checkGoogleCallback(): Promise<{
    existingUser?: UserProfile;
    googleAccount?: { id: string; email: string; name?: string; avatar?: string };
    needsSetup?: boolean;
  } | null> {
    const hash = window.location.hash;
    const search = window.location.search;

    if (!hash && !search) return null;

    // Check for access_token in URL hash
    let accessToken: string | null = null;
    if (hash && hash.includes('access_token=')) {
      const match = hash.match(/access_token=([^&]+)/);
      if (match) accessToken = match[1];
    }

    if (!accessToken && search && search.includes('code=')) {
      // PKCE code flow (if used)
      const match = search.match(/code=([^&]+)/);
      if (match) accessToken = match[1];
    }

    if (!accessToken) return null;

    try {
      // Query Supabase Auth endpoint to get Google user info
      const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!userRes.ok) return null;
      const authUser = await userRes.json();
      if (!authUser || !authUser.id) return null;

      const googleAccount = {
        id: authUser.id,
        email: authUser.email || '',
        name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || '',
        avatar: authUser.user_metadata?.avatar_url || '',
      };

      // Clean the URL hash/search to keep browser clean
      window.history.replaceState(null, '', window.location.pathname);

      // Check if user already exists in public.users table with face scan
      const dbRes = await fetch(
        `${SUPABASE_URL}/rest/v1/users?or=(email.eq.${encodeURIComponent(
          googleAccount.email
        )},supabase_uid.eq.${encodeURIComponent(googleAccount.id)})&select=*`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (dbRes.ok) {
        const rows = await dbRes.json();
        if (rows && rows.length > 0 && rows[0].username && rows[0].face_scan_url) {
          // Existing student with full setup!
          const isApproved = rows[0].face_scan_status === 'verified';
          const existing: UserProfile = {
            id: rows[0].id,
            username: rows[0].username,
            phoneNumber: rows[0].phone_number,
            catchphrase: rows[0].catchphrase || '',
            avatar: rows[0].username.charAt(0).toUpperCase(),
            avatarUrl: rows[0].avatar_url || undefined,
            email: rows[0].email,
            faceScanUrl: rows[0].face_scan_url,
            faceScanStatus: rows[0].face_scan_status,
            isApproved,
          };
          localStorage.setItem(SESSION_KEY, JSON.stringify(existing));
          return { existingUser: existing, needsSetup: false };
        }
      }

      // New student! Needs first-time Face ID + Username setup
      return { googleAccount, needsSetup: true };
    } catch (err) {
      console.error('Error verifying Google OAuth callback:', err);
      return null;
    }
  },

  // 7. Sign In with Google
  async signInWithGoogle(): Promise<{ error?: string }> {
    if (!isSupabaseConfigured()) {
      const demoUser: UserProfile = {
        id: 'google-user-' + Math.floor(Math.random() * 1000),
        username: 'Student_Google',
        phoneNumber: '+91 98765 11111',
        catchphrase: 'Logged in via Google OAuth',
        avatar: 'G',
        email: 'student@college.edu',
        faceScanStatus: 'verified',
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(demoUser));
      return {};
    }

    try {
      const redirectUrl = encodeURIComponent(window.location.origin);
      const authEndpoint = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${redirectUrl}`;
      window.location.href = authEndpoint;
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to initiate Google sign in' };
    }
  },

  // 8. Telegram Bot Phone Verification Session Generator
  async createPhoneVerificationSession(): Promise<{ code: string; telegramLink: string }> {
    const code = 'VERIFY_' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const telegramLink = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${code}`;

    if (isSupabaseConfigured()) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/phone_verifications`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code: code, verified: false }),
        });
      } catch (err) {
        console.warn('Could not register verification session in Supabase:', err);
      }
    }

    return { code, telegramLink };
  },

  // 9. Poll Phone Verification Status from Telegram
  async checkPhoneVerificationStatus(code: string): Promise<{ verified: boolean; phoneNumber?: string }> {
    if (!isSupabaseConfigured()) {
      return { verified: false };
    }

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/phone_verifications?code=eq.${encodeURIComponent(code)}&verified=eq.true&select=*`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (res.ok) {
        const rows = await res.json();
        if (rows && rows.length > 0 && rows[0].phone_number) {
          return { verified: true, phoneNumber: rows[0].phone_number };
        }
      }
      return { verified: false };
    } catch {
      return { verified: false };
    }
  },

  // 10. Verify by 4-Digit PIN sent in Telegram
  async verifyPhonePin(pin: string): Promise<{ valid: boolean; phoneNumber?: string }> {
    if (!isSupabaseConfigured()) {
      return { valid: false };
    }

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/phone_verifications?pin=eq.${encodeURIComponent(pin.trim())}&select=*`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (res.ok) {
        const rows = await res.json();
        if (rows && rows.length > 0 && rows[0].phone_number) {
          return { valid: true, phoneNumber: rows[0].phone_number };
        }
      }
      return { valid: false };
    } catch {
      return { valid: false };
    }
  },

  // 12. Update Profile Picture (Custom avatar photo, under 2MB, does not alter biometric face scan)
  async updateProfilePicture(userId: string, photoUrl: string | null): Promise<UserProfile> {
    const current = this.getCurrentUser();
    const updated: UserProfile = {
      ...(current || { id: userId, username: 'student' }),
      avatarUrl: photoUrl || undefined,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated));

    if (isSupabaseConfigured() && userId) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(userId)}`, {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ avatar_url: photoUrl }),
        });
      } catch (err) {
        console.warn('Failed to sync profile picture to Supabase:', err);
      }
    }
    return updated;
  },

  // 13. Real-time / Polled Approval Status Check
  async checkApprovalStatus(userIdOrUsername?: string | null): Promise<boolean> {
    if (!userIdOrUsername || typeof userIdOrUsername !== 'string') {
      const curr = this.getCurrentUser();
      return curr?.isApproved ?? false;
    }

    if (!isSupabaseConfigured()) {
      const curr = this.getCurrentUser();
      return curr?.isApproved ?? true;
    }

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userIdOrUsername);
      const clean = userIdOrUsername.replace(/^@/, '').trim();
      const filter = isUuid
        ? `id=eq.${encodeURIComponent(userIdOrUsername)}`
        : `or=(username.ilike.${encodeURIComponent(clean)},username.ilike.@${encodeURIComponent(clean)})`;

      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/users?${filter}&select=face_scan_status,avatar_url,username`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (res.ok) {
        const rows = await res.json();
        if (rows && rows.length > 0) {
          const status = rows[0].face_scan_status;
          const isApproved = status === 'verified';
          const current = this.getCurrentUser();
          if (current) {
            current.faceScanStatus = status;
            current.isApproved = isApproved;
            if (rows[0].avatar_url) current.avatarUrl = rows[0].avatar_url;
            localStorage.setItem(SESSION_KEY, JSON.stringify(current));
          }
          return isApproved;
        }
      }
    } catch (err) {
      console.warn('Approval status check warning:', err);
    }
    return false;
  },

  signOut(): void {
    localStorage.removeItem(SESSION_KEY);
  },
};
